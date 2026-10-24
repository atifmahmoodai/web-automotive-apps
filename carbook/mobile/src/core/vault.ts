export interface SecureKV{getItemAsync(key:string):Promise<string|null>;setItemAsync(key:string,value:string):Promise<void>;deleteItemAsync(key:string):Promise<void>}
// Only the refresh credential persists. Access tokens and feed/private messages stay in memory.
// Small chunks avoid Keychain value-size limits. The manifest is committed last.
export class RefreshVault{
 private queue:Promise<unknown>=Promise.resolve();
 private serial<T>(work:()=>Promise<T>):Promise<T>{const result=this.queue.then(work,work);this.queue=result.catch(()=>{});return result;}
 constructor(private storage:SecureKV,private key='carbook.refresh.v1'){}
 read(){return this.serial(()=>this.readNow());}
 take(){return this.serial(async()=>{const value=await this.readNow();await this.clearNow();return value;});}
 private async readNow(){const raw=await this.storage.getItemAsync(this.key);if(!raw)return null;try{const meta=JSON.parse(raw);if(typeof meta.generation!=='string'||!/^\d+-[a-z0-9]+$/.test(meta.generation)||!Number.isInteger(meta.parts)||meta.parts<1||meta.parts>32)return null;const parts=await Promise.all(Array.from({length:meta.parts},(_,i)=>this.storage.getItemAsync(`${this.key}.${meta.generation}.${i}`)));return parts.every(x=>x!==null)?parts.join(''):null;}catch{return null}}
 write(value:string){return this.serial(()=>this.writeNow(value));}
 private async writeNow(value:string){if(!value||value.length>24000)throw new Error('Secure session storage limit exceeded.');const previous=await this.storage.getItemAsync(this.key),generation=Date.now()+'-'+Math.random().toString(36).slice(2),parts=Math.ceil(value.length/800);try{for(let i=0;i<parts;i++)await this.storage.setItemAsync(`${this.key}.${generation}.${i}`,value.slice(i*800,(i+1)*800));await this.storage.setItemAsync(this.key,JSON.stringify({generation,parts}));}catch(e){await this.removeParts(JSON.stringify({generation,parts}));throw e;}await this.removeParts(previous);}
 clear(){return this.serial(()=>this.clearNow());}
 private async clearNow(){const raw=await this.storage.getItemAsync(this.key);await this.storage.deleteItemAsync(this.key);await this.removeParts(raw);}
 private async removeParts(raw:string|null){try{const m=JSON.parse(raw||'null');if(m&&/^\d+-[a-z0-9]+$/.test(m.generation)&&Number.isInteger(m.parts)&&m.parts>0&&m.parts<=32)await Promise.all(Array.from({length:m.parts},(_,i)=>this.storage.deleteItemAsync(`${this.key}.${m.generation}.${i}`)));}catch{/* Failed cleanup never restores an old manifest. */}}
}
