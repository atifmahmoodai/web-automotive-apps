import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handle,setLogSink,type MobileBindings} from '../service/worker';
setLogSink(()=>{});
import {purgeDueAccounts} from '../service/accounts';
const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync('drizzle/'+f,'utf8').replaceAll('--> statement-breakpoint',''));
class Statement{constructor(public sql:string,public values:unknown[]=[]){ }bind(...values:unknown[]){assert(!values.includes(undefined),'Undefined D1 binding');return new Statement(this.sql,values)}async first(){return sqlite.prepare(this.sql).get(...this.values as any[])||null}async all(){return {results:sqlite.prepare(this.sql).all(...this.values as any[]),success:true}}async run(){return {success:true,meta:sqlite.prepare(this.sql).run(...this.values as any[])}}}
const db={prepare:(sql:string)=>new Statement(sql),async batch(steps:Statement[]){sqlite.exec('BEGIN');try{const out=[];for(const s of steps){if(/^\s*(SELECT|WITH)/i.test(s.sql))out.push(await s.all());else out.push(await s.run())}sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const files=new Map<string,{bytes:Uint8Array;type:string}>();
const bucket={async put(key:string,bytes:Uint8Array,options:any){files.set(key,{bytes,type:options.httpMetadata.contentType})},async get(key:string,options:any){const f=files.get(key);return f?{body:options?.range?f.bytes.slice(options.range.offset,options.range.offset+options.range.length):f.bytes,size:f.bytes.length}:null},async delete(keys:string|string[]){for(const key of Array.isArray(keys)?keys:[keys])files.delete(key)}};
(globalThis as any).__testEnv={DB:db,BUCKET:bucket};
const config={issuer:'https://api-test.carbook.test/',audience:'https://mobile.carbook.test',clientId:'native-test',jwksUrl:'https://api-test.carbook.test/jwks'};
let bindings={DB:db,BUCKET:bucket,OIDC_ISSUER:config.issuer,OIDC_AUDIENCE:config.audience,OIDC_CLIENT_ID:config.clientId,OIDC_JWKS_URL:config.jwksUrl,OWNER_SUBJECT:'owner-subject',ALLOWED_SUBJECTS:'pilot-1,pilot-2,pilot-3',REGISTRATION_OPEN:'false',CORS_ORIGINS:'https://allowed.carbook.test'} as unknown as MobileBindings;
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'api-test-key',alg:'RS256',use:'sig'},originalFetch=globalThis.fetch;
const pushes:any[]=[],aiCalls:{url:string;headers:Record<string,string>;body:any}[]=[];let aiMode:'ok'|'fail'='ok';
globalThis.fetch=async(input:any,init?:any)=>{const url=String(input);if(url===config.jwksUrl)return Response.json({keys:[jwk]});
 if(url==='https://exp.host/--/api/v2/push/send'){const batch=JSON.parse(init.body);pushes.push(...batch);return Response.json({data:batch.map((m:any)=>m.to.includes('DeadDevice')?{status:'error',details:{error:'DeviceNotRegistered'}}:{status:'ok',id:crypto.randomUUID()})});}
 if(url==='https://ai.carbook.test/v1/chat/completions'){aiCalls.push({url,headers:init.headers,body:JSON.parse(init.body)});return aiMode==='ok'?Response.json({choices:[{message:{content:'Check the brake pads. Not a substitute for a mechanic.'}}]}):new Response('provider failure sk-secret-should-not-leak',{status:500});}
 throw new Error('Unexpected fetch '+url);};
const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
async function token(sub:string){const now=Math.floor(Date.now()/1000),input=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:config.issuer,aud:config.audience,azp:config.clientId,sub,iat:now,exp:now+900,scope:'carbook',name:sub});const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(input));return 'Bearer '+input+'.'+Buffer.from(sig).toString('base64url')}
const tokens=new Map<string,string>();
async function request(sub:string|null,path:string,payload?:unknown,expected=200,extra:Record<string,string>={}){if(sub&&!tokens.has(sub))tokens.set(sub,await token(sub));const r=await handle(new Request('https://mobile.carbook.test'+path,{method:payload===undefined?'GET':'POST',headers:{...(sub?{Authorization:tokens.get(sub)!}:{}),...(payload===undefined?{}:{'Content-Type':'application/json'}),...extra},...(payload===undefined?{}:{body:JSON.stringify(payload)} )}),bindings);const value=r.headers.get('content-type')?.includes('application/json')?await r.json() as any:{error:await r.text()};assert.equal(r.status,expected,JSON.stringify(value));return value;}
const action=(sub:string,payload:unknown,expected=200)=>request(sub,'/api/action',payload,expected);
const ai={AI_API_KEY:'test-key-not-real',AI_BASE_URL:'https://ai.carbook.test/v1',AI_MODEL:'test-model'};
const tok=(n:string)=>`ExponentPushToken[${n}]`,since=()=>pushes.length,pushedTo=(from:number,token:string)=>pushes.slice(from).filter(p=>p.to===token);
try{
 const sellerId=(await request('pilot-1','/api/state')).userId,buyerId=(await request('pilot-2','/api/state')).userId,strangerId=(await request('pilot-3','/api/state')).userId;
 const prefs=(enabled:boolean)=>({action:'preferences',defaultAudience:'community',messagePolicy:'everyone',notificationsEnabled:enabled,showExamples:false});
 await action('pilot-1',prefs(true));await action('pilot-2',prefs(true));
 // Status and not-configured assistant
 assert.deepEqual(await request('pilot-1','/api/premium/status'),{assistant:false,assistantDailyLimit:40,push:true});
 assert.match((await request('pilot-1','/api/assistant',{messages:[{role:'user',content:'Why do my brakes squeal?'}]},503)).error,/not configured/);
 // Push registration
 await request('pilot-1','/api/push/register',{token:'not-a-token'},400);await request('pilot-1','/api/push/register',{token:tok('seller-device'),platform:'android'});await request('pilot-2','/api/push/register',{token:tok('buyer-device')});await request('pilot-3','/api/push/register',{token:tok('shared-device')});
 await request('pilot-2','/api/push/register',{token:tok('shared-device')});assert.equal((await db.prepare('SELECT user_id FROM push_tokens WHERE token=?').bind(tok('shared-device')).first() as any).user_id,buyerId,'token follows the member signed in on the device');
 await request('pilot-3','/api/push/unregister',{token:tok('buyer-device')});assert(await db.prepare('SELECT 1 FROM push_tokens WHERE token=?').bind(tok('buyer-device')).first(),'cannot unregister another member token');
 // Comment and reaction pushes honour preferences and contain no private content
 const post=await action('pilot-1',{action:'post',body:'Weekend detailing done.',topic:'Ownership stories',audience:'community'});
 let n=since();await action('pilot-2',{action:'comment',postId:post.id,body:'Looks amazing'});const commentPush=pushedTo(n,tok('seller-device'));assert.equal(commentPush.length,1);assert.match(commentPush[0].body,/commented on your post/);assert.equal(commentPush[0].data.route,'/post/'+post.id);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM notifications WHERE recipient_id=? AND pushed=0').bind(sellerId).first() as any).n,0,'delivered notifications are marked pushed');
 await action('pilot-1',prefs(false));n=since();await action('pilot-2',{action:'react',postId:post.id,kind:'love'});assert.equal(pushedTo(n,tok('seller-device')).length,0,'notifications disabled means no push');await action('pilot-1',prefs(true));
 // Direct messages push a generic text, never the body
 const chat=await action('pilot-1',{action:'conversation',targetId:buyerId});n=since();const clientId=crypto.randomUUID();await action('pilot-1',{action:'message',conversationId:chat.id,body:'My secret address is 12 Elm',clientId});
 const dm=pushes.slice(n);assert.equal(dm.length,2,'both of the buyer devices');assert(dm.every(p=>p.title==='New message'&&!JSON.stringify(p).includes('Elm')&&p.data.route==='/chat/'+chat.id));
 n=since();await action('pilot-1',{action:'message',conversationId:chat.id,body:'My secret address is 12 Elm',clientId});assert.equal(pushes.length,n,'duplicate sends do not push twice');
 // Dead devices are pruned
 await request('pilot-1','/api/push/register',{token:tok('DeadDevice1')});await action('pilot-2',{action:'comment',postId:post.id,body:'Again'});assert.equal(await db.prepare('SELECT 1 FROM push_tokens WHERE token=?').bind(tok('DeadDevice1')).first(),null);
 // Cron sweep delivers notifications created outside the mobile API (e.g. the website)
 await db.prepare("INSERT INTO notifications(id,recipient_id,actor_id,post_id,message,created,read) VALUES('web-1',?,?,NULL,'started following you',?,0)").bind(sellerId,buyerId,Date.now()).run();
 const {pushPending}=await import('../service/premium');n=since();await pushPending(bindings);assert.equal(pushedTo(n,tok('seller-device')).length,1);n=since();await pushPending(bindings);assert.equal(pushes.length,n,'sweep does not resend');

 // Garage records: owner only, validated
 await action('pilot-1',{action:'car',name:'Civic Type R',year:2019,story:'Track toy'});const carId=(await request('pilot-1','/api/state')).cars.find((c:any)=>c.owner_id===sellerId).id;
 const day=86400000,now=Date.now();
 await request('pilot-1','/api/garage/record',{carId,kind:'fuel',title:'Fuel',date:now},400);
 await request('pilot-1','/api/garage/record',{carId,kind:'service',title:'Oil change',date:now+5*day},400);
 await request('pilot-2','/api/garage/record',{carId,kind:'service',title:'Hijack',date:now},404);
 await request('pilot-1','/api/garage/record',{carId,kind:'document',title:'Insurance',date:now,image:'/api/media/not-mine'},403);
 const service=await request('pilot-1','/api/garage/record',{carId,kind:'service',title:'Oil change',category:'Maintenance',date:now-day,amount:12000,odometer:42000,dueDate:now+90*day,dueOdometer:47000});
 await request('pilot-1','/api/garage/record',{carId,kind:'fuel',title:'Fuel',date:now-2*day,amount:9000,odometer:41500,litres:30});await request('pilot-1','/api/garage/record',{carId,kind:'expense',title:'Detailing',category:'Cleaning',date:now,amount:5000});
 await request('pilot-1','/api/garage/record',{id:service.id,carId,kind:'service',title:'Oil + filter',date:now-day,amount:13000});
 const records=(await request('pilot-1','/api/garage/records?carId='+carId)).records;assert.equal(records.length,3);assert.equal(records.find((r:any)=>r.id===service.id).title,'Oil + filter');
 await request('pilot-2','/api/garage/records?carId='+carId,undefined,404);assert.equal((await request('pilot-2','/api/garage/records')).records.length,0);
 await request('pilot-2','/api/garage/record/delete',{id:service.id},404);await request('pilot-1','/api/garage/record/delete',{id:service.id});

 // Offers and counter-offers
 const listing=await action('pilot-1',{action:'listing',title:'Honda Civic Type R 2019',description:'Low mileage, full history.',price:9000000,currency:'PKR',category:'Cars',city:'Lahore'});
 await request('pilot-1','/api/market/offer',{listingId:listing.id,amount:8000000},409);
 n=since();const offer=await request('pilot-2','/api/market/offer',{listingId:listing.id,amount:8000000,message:'Cash ready'});assert.match(pushedTo(n,tok('seller-device'))[0].body,/made an offer of PKR 8,000,000/);
 await request('pilot-3','/api/market/offer/respond',{offerId:offer.id,decision:'accept'},404);
 await request('pilot-2','/api/market/offer/respond',{offerId:offer.id,decision:'counter',amount:1},403);
 await request('pilot-1','/api/market/offer/respond',{offerId:offer.id,decision:'counter',amount:8000000},400);
 await request('pilot-1','/api/market/offer/respond',{offerId:offer.id,decision:'counter',amount:8600000});
 await request('pilot-1','/api/market/offer/respond',{offerId:offer.id,decision:'accept'},409);
 await request('pilot-2','/api/market/offer/respond',{offerId:offer.id,decision:'accept'});
 const offers=(await request('pilot-1','/api/market/offers?listingId='+listing.id)).offers;assert.equal(offers.length,1);assert.equal(offers[0].status,'accepted');assert.equal(offers[0].amount,8600000);
 await request('pilot-2','/api/market/offer',{listingId:listing.id,amount:1000},409);assert.equal((await request('pilot-3','/api/market/offers')).offers.length,0);
 // Only one offer per listing can be accepted, and a closed negotiation cannot be re-opened by a third buyer
 await request('pilot-3','/api/market/offer',{listingId:listing.id,amount:9000000},409);
 const listing2=await action('pilot-1',{action:'listing',title:'Recaro seats pair',description:'Pair of Recaro bucket seats.',price:300000,currency:'PKR',category:'Parts',city:'Lahore'});
 const o2=await request('pilot-2','/api/market/offer',{listingId:listing2.id,amount:250000}),o3=await request('pilot-3','/api/market/offer',{listingId:listing2.id,amount:260000});
 await request('pilot-1','/api/market/offer/respond',{offerId:o3.id,decision:'accept'});assert.match((await request('pilot-1','/api/market/offer/respond',{offerId:o2.id,decision:'accept'},409)).error,/already accepted/);
 await request('pilot-1','/api/market/offer/respond',{offerId:o3.id,decision:'decline'},409);
 await action('pilot-1',{action:'block',targetId:strangerId});await request('pilot-3','/api/market/offer',{listingId:listing.id,amount:5},404);
 await action('pilot-1',{action:'listingStatus',listingId:listing.id,status:'sold'});await request('pilot-2','/api/market/offer',{listingId:listing.id,amount:5},409);

 // Price insight is computed only from Carbook listings and refuses to guess with too little data
 const thin=await action('pilot-2',{action:'listing',title:'Rare vintage hubcap',description:'One of a kind hubcap.',price:5000,currency:'PKR',category:'Parts',city:'Karachi'});
 const thinInsight=await request('pilot-2','/api/market/insight?listingId='+thin.id);assert.equal(thinInsight.enough,false);assert.equal(thinInsight.stats,null);
 for(const [i,price] of [7000000,7600000,8200000].entries())await db.prepare("INSERT INTO listings(id,seller_id,title,description,price,currency,category,city,status,created) VALUES(?,?,?,?,?,'PKR','Cars','Lahore','active',?)").bind('civic-'+i,buyerId,'Civic Type R '+(2017+i),'desc',price,now).run();
 const ins=await request('pilot-2','/api/market/insight?listingId='+listing.id);assert.equal(ins.enough,true);assert.equal(ins.basis,'similar');assert.equal(ins.stats.median,7600000);assert.equal(ins.stats.position,'above');assert.match(ins.source,/Based only on 3 Carbook listings.*Not a market valuation/);
 await request('pilot-3','/api/market/insight?listingId='+listing.id,undefined,404);

 // Event places, check-ins and update notifications
 const ev=await action('pilot-1',{action:'event',title:'Sunday cars and coffee',description:'Bring your weekend car along.',city:'Lahore',location:'Liberty Market parking',starts:now+3*day,capacity:50});
 await request('pilot-2','/api/events/place',{eventId:ev.id,lat:31.51,lng:74.34},403);await request('pilot-1','/api/events/place',{eventId:ev.id,lat:91,lng:74.34},400);await request('pilot-1','/api/events/place',{eventId:ev.id,lat:31.51,lng:74.34});
 const pins=(await request('pilot-2','/api/events/places')).places;assert.equal(pins.find((p:any)=>p.id===ev.id)?.lat,31.51);assert.equal((await request('pilot-3','/api/events/places')).places.some((p:any)=>p.id===ev.id),false,'blocked members cannot see the pin');
 await request('pilot-2','/api/events/checkin',{eventId:ev.id},409);
 await action('pilot-2',{action:'rsvp',eventId:ev.id,status:'going'});n=since();await action('pilot-1',{action:'event',id:ev.id,title:'Sunday cars and coffee',description:'Bring your weekend car along.',city:'Lahore',location:'Liberty Market level 2',starts:now+3*day,capacity:50});
 assert.match(pushedTo(n,tok('buyer-device'))[0].body,/updated an event you responded to/);
 await db.prepare('UPDATE meetups SET starts=? WHERE id=?').bind(now-3600000,ev.id).run();n=since();await request('pilot-2','/api/events/checkin',{eventId:ev.id});await request('pilot-2','/api/events/checkin',{eventId:ev.id});
 assert.equal(pushedTo(n,tok('seller-device')).length,1,'organizer told once');const ci=await request('pilot-2','/api/events/checkins?eventId='+ev.id);assert.equal(ci.count,1);assert.equal(ci.checkedIn,true);
 await request('pilot-3','/api/events/checkin',{eventId:ev.id},404);
 await db.prepare('UPDATE meetups SET starts=? WHERE id=?').bind(now-13*3600000,ev.id).run();await request('pilot-1','/api/events/checkin',{eventId:ev.id},409);

 // AI assistant: provider key stays server-side, car context only for own cars, errors never leak provider text
 bindings={...bindings,...ai};assert.equal((await request('pilot-1','/api/premium/status')).assistant,true);
 await request('pilot-2','/api/assistant',{carId,messages:[{role:'user',content:'Hi'}]},404);
 await request('pilot-1','/api/assistant',{messages:[{role:'assistant',content:'Hello'}]},400);
 const answer=await request('pilot-1','/api/assistant',{carId,messages:[{role:'user',content:'Brakes squeal when cold, normal?'}]});assert.match(answer.reply,/brake pads/);
 const call=aiCalls.at(-1)!;assert.equal(call.headers.Authorization,'Bearer test-key-not-real');assert.equal(call.body.model,'test-model');assert.match(call.body.messages[0].content,/not a substitute for a qualified mechanic/);assert.match(call.body.messages[0].content,/2019 Civic Type R/);
 aiMode='fail';const failed=await request('pilot-1','/api/assistant',{messages:[{role:'user',content:'Hi'}]},502);assert(!JSON.stringify(failed).includes('sk-secret'));
 bindings={...bindings,AI_DAILY_LIMIT:'2'} as MobileBindings;aiMode='ok';const capped=await request('pilot-1','/api/assistant',{messages:[{role:'user',content:'One more?'}]},429);assert.match(capped.error,/today’s limit of 2/);assert.equal(capped.code,'rate_limited');bindings={...bindings,AI_DAILY_LIMIT:undefined} as unknown as MobileBindings;
 bindings={...bindings,AI_BASE_URL:'http://insecure.test'};assert.equal((await request('pilot-1','/api/premium/status')).assistant,false);

 // Account deletion purges premium data
 await action('pilot-2',{action:'car',name:'Buyer daily',year:2015,story:''});const buyerCar=(await request('pilot-2','/api/state')).cars.find((c:any)=>c.owner_id===buyerId).id;await request('pilot-2','/api/garage/record',{carId:buyerCar,kind:'expense',title:'Tyres',date:now,amount:40000});
 await request('pilot-2','/api/account/delete',{confirmation:'DELETE MY ACCOUNT'});await db.prepare('UPDATE deletion_requests SET execute_after=0 WHERE user_id=?').bind(buyerId).run();for(let i=0;i<5;i++)await purgeDueAccounts(bucket as any);
 for(const [table,col] of [['push_tokens','user_id'],['vehicle_records','owner_id'],['listing_offers','buyer_id'],['event_checkins','user_id']])assert.equal((await db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${col}=?`).bind(buyerId).first() as any).n,0,table+' purged');
 console.log('Premium API passed: push registration/fan-out/preferences/generic DM text/dead-token pruning/cron sweep, owner-only garage records, offers and counter-offers with blocks, Carbook-only price insight, event pins and check-in windows, event update notifications, server-side AI assistant with daily cap, single accepted offer per listing, deletion purge.');
}finally{globalThis.fetch=originalFetch;}
