import {readJson} from './http';
import {database,json,ApiError,rateLimit,getState} from '../../lib/server';
import {actionSchema} from '../../lib/validation';
import {perform} from '../../lib/actions';
import {readResource} from '../../lib/read-service';
import {uploadMedia} from '../../lib/upload-service';
import {serveMedia} from '../../lib/media-service';
import {redeemMobileLink} from '../../lib/mobile-link';
import {createIdentityVerifier,AuthenticationError,type IdentityConfig} from './identity';
import {isPremiumGet,isPremiumPost,premiumGet,premiumPost,afterAction,pushPending,type PremiumEnv} from './premium';
import {provisionIdentity,requestDeletion,cancelDeletion,transferOwnership,purgeDueAccounts} from './accounts';
export interface MobileBindings extends PremiumEnv{DB:D1Database;BUCKET:R2Bucket;OIDC_ISSUER:string;OIDC_AUDIENCE:string;OIDC_CLIENT_ID:string;OIDC_JWKS_URL:string;OWNER_SUBJECT:string;REGISTRATION_OPEN?:string;ALLOWED_SUBJECTS?:string;CORS_ORIGINS?:string}
let verifier:ReturnType<typeof createIdentityVerifier>|null=null,configKey='';
const SECURITY_HEADERS:Record<string,string>={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Strict-Transport-Security':'max-age=31536000; includeSubDomains'};
/** Accepts a client-supplied correlation id only when it is short and safe to log; otherwise mints one. */
export function requestIdFrom(request:Request){const given=request.headers.get('x-request-id');return given&&/^[A-Za-z0-9._-]{8,80}$/.test(given)?given:crypto.randomUUID();}
/** One structured JSON line per request. Never logs tokens, bodies, query strings or user content. */
export type LogEntry={level:'info'|'warn'|'error';service:string;requestId:string;method:string;path:string;status:number;ms:number;error?:string;stack?:string};
let sink:(entry:LogEntry)=>void=entry=>{const line=JSON.stringify(entry);if(entry.level==='error')console.error(line);else if(entry.level==='warn')console.warn(line);else console.log(line);};
/** Replace the log destination (tests capture entries; production writes JSON lines to Workers Logs). */
export function setLogSink(next:(entry:LogEntry)=>void){sink=next;}
export function logRequest(entry:Omit<LogEntry,'level'|'service'>){sink({level:entry.status>=500?'error':entry.status>=400?'warn':'info',service:'carbook-mobile-api',...entry,path:entry.path.replace(/\/api\/media\/[A-Za-z0-9-]+/,'/api/media/:id')});}
export async function handle(request:Request,bindings:MobileBindings,ctx?:{waitUntil(p:Promise<unknown>):void}):Promise<Response>{
 const started=Date.now(),requestId=requestIdFrom(request),url=new URL(request.url),origin=request.headers.get('origin'),allowed=(bindings.CORS_ORIGINS||'').split(',').map(o=>o.trim()).filter(Boolean),headers=new Headers(SECURITY_HEADERS);headers.set('X-Request-Id',requestId);
 const finish=(response:Response,error?:unknown)=>{const final=new Headers(response.headers);headers.forEach((v,k)=>final.set(k,v));logRequest({requestId,method:request.method,path:url.pathname,status:response.status,ms:Date.now()-started,...(error instanceof Error&&response.status>=500?{error:error.message.slice(0,300),...(error instanceof ApiError?{}:{stack:error.stack?.split('\n').slice(0,6).join('\n')})}:{})});return new Response(response.body,{status:response.status,headers:final});};
 const fail=(message:string,status:number,code:string)=>json({error:message,code,requestId},status);
 if(origin&&!allowed.includes(origin))return finish(fail('Origin is not allowed.',403,'origin_not_allowed'));
 if(origin){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Headers','Authorization, Content-Type, X-Request-Id, X-Client-Version');headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');headers.set('Access-Control-Expose-Headers','X-Request-Id, Retry-After');headers.set('Access-Control-Max-Age','600');}
 if(request.method==='OPTIONS')return finish(new Response(null,{status:204}));
 let response:Response,failure:unknown;
 try{
  if(url.pathname==='/health')return finish(json({service:'carbook-mobile',version:1,configured:!!(bindings.OIDC_ISSUER&&bindings.OIDC_AUDIENCE&&bindings.OIDC_CLIENT_ID&&bindings.OIDC_JWKS_URL&&bindings.OWNER_SUBJECT)}));
  if(!['GET','POST'].includes(request.method))throw new ApiError('Method not allowed.',405);
  if(!url.pathname.startsWith('/api/'))throw new ApiError('Not found.',404);
  if(request.method==='POST'&&url.pathname!=='/api/upload'&&Number(request.headers.get('content-length')||0)>24000)throw new ApiError('Request too large.',413);
  if(!bindings.OWNER_SUBJECT)throw new ApiError('Mobile service setup is incomplete.',503);
  const config:IdentityConfig={issuer:bindings.OIDC_ISSUER,audience:bindings.OIDC_AUDIENCE,clientId:bindings.OIDC_CLIENT_ID,jwksUrl:bindings.OIDC_JWKS_URL};const key=JSON.stringify(config);if(key!==configKey||!verifier){verifier=createIdentityVerifier(config);configKey=key;}
  const identity=await verifier(request.headers.get('authorization'));
  // Browser identity headers, client user IDs and client roles are never trusted here.
  if(request.method==='POST'&&url.pathname==='/api/account/link'){const input=await readJson(request),existing=await database().prepare('SELECT user_id FROM mobile_identities WHERE id=?').bind(identity.identityId).first<{user_id:string}>();response=json(await redeemMobileLink(identity.identityId,existing?.user_id||null,String(input.code||'').trim()));}
  else {
  const uid=await provisionIdentity(identity,bindings.OWNER_SUBJECT,bindings.REGISTRATION_OPEN==='true',(bindings.ALLOWED_SUBJECTS||'').split(',').map(s=>s.trim()).filter(Boolean));
  await rateLimit(uid,'mobile-api',180);
  if(request.method==='GET'&&url.pathname==='/api/state')response=json(await getState(uid));
  else if(request.method==='GET'&&url.pathname==='/api/read')response=await readResource(request,uid);
  else if(request.method==='GET'&&/^\/api\/media\/[a-zA-Z0-9-]{1,160}$/.test(url.pathname))response=await serveMedia(request,uid,url.pathname.split('/').pop()!);
  else if(request.method==='POST'&&url.pathname==='/api/upload')response=await uploadMedia(request,uid);
  else if(request.method==='GET'&&isPremiumGet(url.pathname))response=await premiumGet(url,uid,bindings);
  else if(request.method==='GET'&&url.pathname==='/api/account/deletion')response=json({request:await database().prepare('SELECT requested,execute_after,status FROM deletion_requests WHERE user_id=?').bind(uid).first()});
  else if(request.method==='POST'){
   const input=await readJson(request);
   if(url.pathname==='/api/account/delete')response=json(await requestDeletion(uid,String(input.confirmation||'')));
   else if(url.pathname==='/api/account/cancel-deletion')response=json(await cancelDeletion(uid));
   else if(url.pathname==='/api/account/transfer'){if(input.confirmation!=='TRANSFER OWNERSHIP')throw new ApiError('Type TRANSFER OWNERSHIP to confirm.');response=json(await transferOwnership(uid,String(input.targetId||'')));}
   else if(url.pathname==='/api/action'){const parsed=actionSchema.safeParse(input);if(!parsed.success)throw new ApiError(parsed.error.issues[0]?.message||'Check your input.');await rateLimit(uid,'actions',90);if(parsed.data.action==='init')response=json({ok:true});else{const start=Date.now(),result=await perform(parsed.data,uid),job=afterAction(bindings,uid,parsed.data as {action:string},result,start);if(ctx)ctx.waitUntil(job);else await job;response=json(result);}}
   else if(isPremiumPost(url.pathname)){const start=Date.now();response=await premiumPost(url.pathname,input,uid,bindings);const job=afterAction(bindings,uid,{action:url.pathname},null,start);if(ctx)ctx.waitUntil(job);else await job;}
   else throw new ApiError('Not found.',404);
  }else throw new ApiError('Not found.',404);
  }
 }catch(e){failure=e;const status=e instanceof AuthenticationError?401:e instanceof ApiError?e.status:503;response=fail(e instanceof AuthenticationError||e instanceof ApiError?e.message:'The service is temporarily unavailable.',status,errorCode(status));if(status===401)headers.set('WWW-Authenticate','Bearer');if(status===429)headers.set('Retry-After','30');}
 // Errors produced inside shared services (upload/media/read) carry no request id; add it so support can correlate.
 if(response.status>=400&&!failure&&response.headers.get('content-type')?.includes('application/json')){const body=await response.clone().json().catch(()=>null) as {error?:string}|null;if(body&&typeof body.error==='string')response=new Response(JSON.stringify({...body,code:(body as {code?:string}).code||errorCode(response.status),requestId}),{status:response.status,headers:response.headers});if(response.status===429)headers.set('Retry-After','30');}
 return finish(response,failure);
}
export function errorCode(status:number){return ({400:'invalid_request',401:'unauthenticated',403:'forbidden',404:'not_found',405:'method_not_allowed',409:'conflict',413:'payload_too_large',415:'unsupported_media_type',429:'rate_limited',502:'upstream_unavailable',503:'unavailable'} as Record<number,string>)[status]||(status>=500?'server_error':'error');}
export default {fetch:(request:Request,bindings:MobileBindings,ctx:ExecutionContext)=>handle(request,bindings,ctx),async scheduled(_event:ScheduledController,bindings:MobileBindings,ctx:ExecutionContext){
 ctx.waitUntil(purgeDueAccounts(bindings.BUCKET).catch(e=>console.error(JSON.stringify({level:'error',service:'carbook-mobile-api',job:'purge',error:e instanceof Error?e.message:String(e)}))));
 ctx.waitUntil(pushPending(bindings).catch(e=>{console.error(JSON.stringify({level:'error',service:'carbook-mobile-api',job:'push',error:e instanceof Error?e.message:String(e)}));return 0;}));}};
