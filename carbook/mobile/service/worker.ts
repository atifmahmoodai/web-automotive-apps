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
export async function handle(request:Request,bindings:MobileBindings,ctx?:{waitUntil(p:Promise<unknown>):void}):Promise<Response>{
 const url=new URL(request.url),origin=request.headers.get('origin'),allowed=(bindings.CORS_ORIGINS||'').split(',').filter(Boolean),headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'});
 if(origin&&!allowed.includes(origin))return json({error:'Origin is not allowed.'},403);
 if(origin){headers.set('Access-Control-Allow-Origin',origin);headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');}
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 let response:Response;
 try{
  if(url.pathname==='/health'){headers.set('Content-Type','application/json');return new Response(JSON.stringify({service:'carbook-mobile',version:1,configured:!!(bindings.OIDC_ISSUER&&bindings.OIDC_AUDIENCE&&bindings.OIDC_CLIENT_ID&&bindings.OIDC_JWKS_URL&&bindings.OWNER_SUBJECT)}),{headers});}
  if(!['GET','POST'].includes(request.method))throw new ApiError('Method not allowed.',405);
  if(!bindings.OWNER_SUBJECT)throw new ApiError('Mobile service setup is incomplete.',503);
  const config:IdentityConfig={issuer:bindings.OIDC_ISSUER,audience:bindings.OIDC_AUDIENCE,clientId:bindings.OIDC_CLIENT_ID,jwksUrl:bindings.OIDC_JWKS_URL};const key=JSON.stringify(config);if(key!==configKey||!verifier){verifier=createIdentityVerifier(config);configKey=key;}
  const identity=await verifier(request.headers.get('authorization'));
  // Browser identity headers, client user IDs and client roles are never trusted here.
  if(request.method==='POST'&&url.pathname==='/api/account/link'){const input=await readJson(request),existing=await database().prepare('SELECT user_id FROM mobile_identities WHERE id=?').bind(identity.identityId).first<{user_id:string}>();response=json(await redeemMobileLink(identity.identityId,existing?.user_id||null,String(input.code||'').trim()));}
  else {
  const uid=await provisionIdentity(identity,bindings.OWNER_SUBJECT,bindings.REGISTRATION_OPEN==='true',(bindings.ALLOWED_SUBJECTS||'').split(',').filter(Boolean));
  await rateLimit(uid,'mobile-api',180);
  if(request.method==='GET'&&url.pathname==='/api/state')response=json(await getState(uid));
  else if(request.method==='GET'&&url.pathname==='/api/read')response=await readResource(request,uid);
  else if(request.method==='GET'&&/^\/api\/media\/[a-zA-Z0-9-]{1,160}$/.test(url.pathname))response=await serveMedia(request,uid,url.pathname.split('/').pop()!);
  else if(request.method==='POST'&&url.pathname==='/api/upload')response=await uploadMedia(request,uid);
  else if(request.method==='GET'&&isPremiumGet(url.pathname))response=await premiumGet(url,uid,bindings);
  else if(request.method==='GET'&&url.pathname==='/api/account/deletion')response=json({request:await database().prepare('SELECT requested,execute_after,status FROM deletion_requests WHERE user_id=?').bind(uid).first()});
  else if(request.method==='POST'){
   if(Number(request.headers.get('content-length')||0)>24000)throw new ApiError('Request too large.',413);const input=await readJson(request);
   if(url.pathname==='/api/account/delete')response=json(await requestDeletion(uid,String(input.confirmation||'')));
   else if(url.pathname==='/api/account/cancel-deletion')response=json(await cancelDeletion(uid));
   else if(url.pathname==='/api/account/transfer'&&input.confirmation==='TRANSFER OWNERSHIP')response=json(await transferOwnership(uid,String(input.targetId||'')));
   else if(url.pathname==='/api/action'){const parsed=actionSchema.safeParse(input);if(!parsed.success)throw new ApiError(parsed.error.issues[0]?.message||'Check your input.');await rateLimit(uid,'actions',90);if(parsed.data.action==='init')response=json({ok:true});else{const start=Date.now(),result=await perform(parsed.data,uid),job=afterAction(bindings,uid,parsed.data as {action:string},result,start);if(ctx)ctx.waitUntil(job);else await job;response=json(result);}}
   else if(isPremiumPost(url.pathname)){const start=Date.now();response=await premiumPost(url.pathname,input,uid,bindings);const job=afterAction(bindings,uid,{action:url.pathname},null,start);if(ctx)ctx.waitUntil(job);else await job;}
   else throw new ApiError('Not found.',404);
  }else throw new ApiError('Not found.',404);
  }
 }catch(e){const status=e instanceof AuthenticationError?401:e instanceof ApiError?e.status:503;response=json({error:e instanceof AuthenticationError||e instanceof ApiError?e.message:'The service is temporarily unavailable.'},status);if(status===401)headers.set('WWW-Authenticate','Bearer');}
 const final=new Headers(response.headers);headers.forEach((v,k)=>final.set(k,v));return new Response(response.body,{status:response.status,headers:final});
}
export default {fetch:(request:Request,bindings:MobileBindings,ctx:ExecutionContext)=>handle(request,bindings,ctx),async scheduled(_event:ScheduledController,bindings:MobileBindings,ctx:ExecutionContext){ctx.waitUntil(purgeDueAccounts(bindings.BUCKET));ctx.waitUntil(pushPending(bindings).catch(()=>0));}};
