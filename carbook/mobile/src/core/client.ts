export class ApiError extends Error{constructor(message:string,public status=0,public uncertain=false){super(message);this.name='ApiError'}}
export type TokenSource=()=>Promise<string>;
export class CarbookClient{
 constructor(private base:string,private token:TokenSource,private transport:typeof fetch=fetch){}
 async request<T>(path:string,options:RequestInit={},timeout=25000):Promise<T>{
  if(!path.startsWith('/api/')||path.startsWith('//'))throw new ApiError('Invalid API path.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try{
   const token=await this.token();if(!token)throw new ApiError('Sign in to continue.',401);
   const response=await this.transport(this.base+path,{...options,redirect:'error',signal:controller.signal,headers:{Accept:'application/json',...(options.body&&!(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...options.headers,Authorization:`Bearer ${token}`}});
   const content=response.headers.get('content-type')||'';if(!content.includes('application/json'))throw new ApiError('The service returned an unexpected response.',response.status);
   const result=await response.json() as T&{error?:string};if(!response.ok)throw new ApiError(result.error||'The request could not be completed.',response.status);
   return result;
  }catch(e){if(e instanceof ApiError)throw e;const write=!!options.method&&options.method!=='GET';throw new ApiError(write?'We could not confirm the change. Check your content before trying again.':'Unable to connect. Check your connection and try again.',0,write)}finally{clearTimeout(timer)}
 }
 read<T>(resource:string,params:Record<string,string>={}){return this.request<T>('/api/read?'+new URLSearchParams({resource,...params}));}
 action<T={ok:boolean;id?:string}>(payload:unknown){return this.request<T>('/api/action',{method:'POST',body:JSON.stringify(payload)});}
 async upload(uri:string,mimeType:string,name:string){
  const data=new FormData();data.append('file',{uri,type:mimeType,name} as unknown as Blob);
  return this.request<{url:string;type:'image'|'video'}>('/api/upload',{method:'POST',body:data},60000);
 }
}
export function mediaUrl(base:string,path:string){
 if(!/^\/api\/media\/[a-zA-Z0-9-]{1,160}$/.test(path))throw new ApiError('Invalid media reference.');
 const origin=new URL(base);const url=new URL(path,origin);if(url.origin!==origin.origin)throw new ApiError('Invalid media host.');return url.href;
}
export function mergeById<T extends {id:string}>(before:T[],incoming:T[]){const map=new Map(before.map(x=>[x.id,x]));for(const item of incoming)map.set(item.id,item);return [...map.values()]}
export function parseDeepLink(value:string){
 const match=/^com\.analysight\.carbook:\/\/\/?(post|member|chat)\/([a-zA-Z0-9-]{1,160})$/.exec(value);
 return match?{type:match[1],id:match[2]}:null;
}
