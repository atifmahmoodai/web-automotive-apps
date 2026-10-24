import assert from 'node:assert/strict';
import {createIdentityVerifier,AuthenticationError,identityHash} from '../service/identity';
const config={issuer:'https://issuer.carbook.test/',audience:'https://api.carbook.test',clientId:'carbook-native',jwksUrl:'https://issuer.carbook.test/jwks'};
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'key-1',alg:'RS256',use:'sig'};
const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
const now=Math.floor(Date.now()/1000),claims={iss:config.issuer,aud:config.audience,azp:config.clientId,sub:'member-1',iat:now,exp:now+900,scope:'openid profile carbook',name:'Test member'};
async function sign(payload:unknown=claims,header:unknown={alg:'RS256',kid:'key-1'}){const input=encode(header)+'.'+encode(payload);const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input));return 'Bearer '+input+'.'+Buffer.from(sig).toString('base64url')}
let requests=0;const verify=createIdentityVerifier(config,async(url,options)=>{assert.equal(url,config.jwksUrl);assert.equal(options?.redirect,'error');requests++;return Response.json({keys:[jwk]})});
assert.deepEqual(await verify(await sign()),{subject:'member-1',name:'Test member',identityId:await identityHash(config.issuer,'member-1')});await verify(await sign());assert.equal(requests,1,'JWKS cached');
let rejected=0;
for(const patch of [{iss:'https://evil.test/'},{aud:'another-api'},{azp:'another-client'},{sub:''},{sub:42},{iat:now+100},{iat:now+1800},{exp:now-100},{exp:now+172800},{exp:'forever'},{scope:'openid profile'},{token_use:'id'},{nbf:now+200}]){await assert.rejects(verify(await sign({...claims,...patch})),AuthenticationError);rejected++;}
for(const header of [{alg:'none',kid:'key-1'},{alg:'HS256',kid:'key-1'},{alg:'RS256',kid:'unknown'},{alg:'RS256',kid:'key-1',crit:['unrecognized']},null,[]]){await assert.rejects(verify(await sign(claims,header)),AuthenticationError);rejected++;}
for(const payload of [null,[],12,'hello']){await assert.rejects(verify(await sign(payload)),AuthenticationError);rejected++;}
const valid=await sign(),chunks=valid.split('.');chunks[1]=encode({...claims,sub:'forged-owner'});await assert.rejects(verify(chunks.join('.')),AuthenticationError);rejected++;
for(const input of [null,'Basic abc','Bearer bad','Bearer '+('a'.repeat(17000))]){await assert.rejects(verify(input),AuthenticationError);rejected++;}
await verify(await sign({...claims,aud:['other',config.audience],client_id:config.clientId,azp:undefined,token_use:'access'}));
assert.notEqual(await identityHash(config.issuer,'member-1'),await identityHash('https://other.test/','member-1'));
assert.throws(()=>createIdentityVerifier({...config,jwksUrl:'http://untrusted.test/'}));
console.log(`Identity verification passed: valid RSA access tokens, cached JWKS, issuer isolation, ${rejected} forgery/claim/header rejections.`);
