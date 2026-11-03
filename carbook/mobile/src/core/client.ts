export class ApiError extends Error{constructor(message:string,public status=0,public uncertain=false,public requestId?:string){super(message);this.name='ApiError'}}
/** Returns a bearer token. `force` asks the source to skip any cached token (used once after a 401). */
export type TokenSource=(options?:{force?:boolean})=>Promise<string>;
export type ClientOptions={version?:string;retries?:number;sleep?:(ms:number)=>Promise<void>;random?:()=>number};
const RETRY_STATUS=new Set([429,502,503,504]);
/** Exponential backoff with jitter; a server Retry-After (seconds) wins but is capped so the UI never hangs. */
export function backoffDelay(attempt:number,retryAfter:string|null,random:()=>number=Math.random){
 const hinted=retryAfter&&/^\d{1,4}$/.test(retryAfter.trim())?Number(retryAfter)*1000:NaN;
 if(Number.isFinite(hinted))return Math.min(hinted,8000);
 return Math.round(Math.min(400*3**attempt,6000)*(0.75+random()*0.5));
}
export function requestId(random:()=>number=Math.random){let out='m-';for(let i=0;i<16;i++)out+=Math.floor(random()*16).toString(16);return out;}
const sleeper=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
export class CarbookClient{
 private options:Required<ClientOptions>;
 constructor(private base:string,private token:TokenSource,private transport:typeof fetch=fetch,options:ClientOptions={}){this.options={version:options.version||'',retries:options.retries??2,sleep:options.sleep||sleeper,random:options.random||Math.random};}
 async request<T>(path:string,options:RequestInit={},timeout=25000):Promise<T>{
  if(!path.startsWith('/api/')||path.startsWith('//'))throw new ApiError('Invalid API path.');
  const method=(options.method||'GET').toUpperCase(),write=method!=='GET'&&method!=='HEAD',maxAttempts=write?1:1+Math.max(0,this.options.retries);
  let forced=false;
  for(let attempt=0;;attempt++){
   const id=requestId(this.options.random);
   let token:string;
   // Getting a token happens before anything is sent, so a failure here is never an "uncertain" write.
   try{token=await this.token(forced?{force:true}:undefined);}catch(e){if(e instanceof ApiError)throw e;throw new ApiError('Unable to refresh your session. Check your connection and try again.',0,false);}
   if(!token)throw new ApiError('Sign in to continue.',401);
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
   let response:Response;
   try{response=await this.transport(this.base+path,{...options,redirect:'error',signal:controller.signal,headers:{Accept:'application/json',...(options.body&&!(options.body instanceof FormData)?{'Content-Type':'application/json'}:{}),...(this.options.version?{'X-Client-Version':this.options.version}:{}),'X-Request-Id':id,...options.headers,Authorization:`Bearer ${token}`}});}
   catch{clearTimeout(timer);
    if(!write&&attempt+1<maxAttempts){await this.options.sleep(backoffDelay(attempt,null,this.options.random));continue;}
    throw new ApiError(write?'We could not confirm the change. Check your content before trying again.':'Unable to connect. Check your connection and try again.',0,write,id);}
   try{
    const serverId=response.headers.get('x-request-id')||id;
    if(!write&&RETRY_STATUS.has(response.status)&&attempt+1<maxAttempts){await this.options.sleep(backoffDelay(attempt,response.headers.get('retry-after'),this.options.random));continue;}
    // The API rejects bad tokens before doing any work, so one forced-refresh retry is safe for writes too.
    if(response.status===401&&!forced){forced=true;attempt--;continue;}
    const content=response.headers.get('content-type')||'';
    if(!content.includes('application/json'))throw new ApiError(response.status>=500?'Carbook is having trouble right now. Try again in a moment.':'The service returned an unexpected response.',response.status,false,serverId);
    let result:T&{error?:string};
    try{result=await response.json() as T&{error?:string};}catch{throw new ApiError(write?'We could not confirm the change. Check your content before trying again.':'The service returned an unexpected response.',response.status,write&&response.ok,serverId);}
    if(!response.ok)throw new ApiError(result.error||(response.status>=500?'Carbook is having trouble right now. Try again in a moment.':'The request could not be completed.'),response.status,false,serverId);
    return result;
   }finally{clearTimeout(timer)}
  }
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
