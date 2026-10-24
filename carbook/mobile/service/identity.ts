export type IdentityConfig={issuer:string;audience:string;clientId:string;jwksUrl:string};
export type VerifiedIdentity={subject:string;name:string;identityId:string};
export class AuthenticationError extends Error{constructor(){super('Sign in with a valid Carbook session.')}}
const decode=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0));
function parse(value:string){try{return JSON.parse(new TextDecoder().decode(decode(value)))}catch{throw new AuthenticationError()}}
export async function identityHash(issuer:string,subject:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([issuer,subject]))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function createIdentityVerifier(config:IdentityConfig,transport:typeof fetch=fetch){
 const issuer=new URL(config.issuer),jwksUrl=new URL(config.jwksUrl);
 if(issuer.protocol!=='https:'||jwksUrl.protocol!=='https:'||issuer.username||issuer.password||jwksUrl.username||jwksUrl.password||!config.audience||!config.clientId)throw new Error('OIDC configuration must use trusted HTTPS endpoints.');
 let keys:JsonWebKey[]=[],loaded=0,pending:Promise<void>|null=null;
 async function refresh(){
  if(pending)return pending;
  pending=(async()=>{const response=await transport(jwksUrl.href,{redirect:'error',signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});if(!response.ok)throw new AuthenticationError();const raw=await response.text();if(raw.length>131072)throw new AuthenticationError();const document=JSON.parse(raw);if(!Array.isArray(document.keys)||document.keys.length>30)throw new AuthenticationError();keys=document.keys;loaded=Date.now();})();
  try{await pending}finally{pending=null}
 }
 return async function verify(authorization:string|null):Promise<VerifiedIdentity>{
  if(!authorization?.startsWith('Bearer ')||authorization.length>16384)throw new AuthenticationError();
  const token=authorization.slice(7),parts=token.split('.');if(parts.length!==3||parts.some(p=>!p||!/^[A-Za-z0-9_-]+$/.test(p)))throw new AuthenticationError();
  const header=parse(parts[0]!),claims=parse(parts[1]!);if(!header||typeof header!=='object'||Array.isArray(header)||!claims||typeof claims!=='object'||Array.isArray(claims)||header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200||header.crit)throw new AuthenticationError();
  if(Date.now()-loaded>300000)await refresh();let jwk=keys.find(k=>(k as JsonWebKey&{kid?:string}).kid===header.kid);
  if(!jwk&&Date.now()-loaded>30000){await refresh();jwk=keys.find(k=>(k as JsonWebKey&{kid?:string}).kid===header.kid);}
  if(!jwk||jwk.kty!=='RSA'||(jwk.alg&&jwk.alg!=='RS256')||(jwk.use&&jwk.use!=='sig')||!jwk.n||decode(jwk.n).length<256)throw new AuthenticationError();
  try{const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]!),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw new AuthenticationError();}catch{throw new AuthenticationError()}
  const now=Math.floor(Date.now()/1000),aud=Array.isArray(claims.aud)?claims.aud:[claims.aud],client=claims.azp||claims.client_id;
  if(claims.iss!==config.issuer||!aud.includes(config.audience)||client!==config.clientId||typeof claims.sub!=='string'||!claims.sub||claims.sub.length>255||!Number.isInteger(claims.exp)||claims.exp<=now-30||claims.exp>now+86400||!Number.isInteger(claims.iat)||claims.iat<0||claims.iat>=claims.exp||claims.iat>now+30||(claims.nbf!==undefined&&(!Number.isInteger(claims.nbf)||claims.nbf>now+30))||typeof claims.scope!=='string'||!claims.scope.split(' ').includes('carbook')||(claims.token_use&&claims.token_use!=='access'))throw new AuthenticationError();
  return {subject:claims.sub,name:typeof claims.name==='string'?claims.name.trim().slice(0,70):'Carbook member',identityId:await identityHash(config.issuer,claims.sub)};
 };
}
