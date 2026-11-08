import assert from 'node:assert/strict';
import {CarbookClient,ApiError,mediaUrl,mergeById,parseDeepLink,backoffDelay,requestId} from '../src/core/client';
import {RefreshVault} from '../src/core/vault';
import {localEventTime} from '../src/core/dates';
import {validateConfig} from '../src/core/config';
import {validateVin,checkDigit,parseVpic,normalizeVin,vinTitle} from '../src/core/vin';
import {fuelStats,categoryTotals,dueItems,reminderPlan,parseDay,dayString,monthlySpend,type VehicleRecord} from '../src/core/garage';
import {tileTemplate,geocoderBase,project,unproject,tileUrl,directionsUrls,parseCoords,fitBounds,DEFAULT_TILES,geocode} from '../src/core/geo';
import {notificationRoute} from '../src/core/routes';
import {parseAmount,assistantHistory} from '../src/core/premium';
import {safeExternalUrl,optionalHttps} from '../src/core/urls';
import {scrub,crashReport,analyticsEvent} from '../src/core/telemetry-core';
import {parseSnapshot,SNAPSHOT_MAX_AGE} from '../src/core/snapshot';
let checks=0;
async function test(name:string,work:()=>unknown){await work();checks++;console.log('PASS',name)}
await test('media credentials stay on the configured API',()=>{
 assert.equal(mediaUrl('https://api.carbook.test','/api/media/abc-123'),'https://api.carbook.test/api/media/abc-123');
 for(const value of ['https://evil.test/api/media/abc','//evil.test/api/media/a','/api/media/../secret','/api/media/a?token=x','/api/media/a/b'])assert.throws(()=>mediaUrl('https://api.carbook.test',value));
});
await test('client sends bearer credentials and never follows redirects',async()=>{
 let sent:RequestInit|undefined;const c=new CarbookClient('https://api.carbook.test',async()=>'private-access',async(url,init)=>{assert.equal(url,'https://api.carbook.test/api/action');sent=init;return Response.json({ok:true})});
 await c.action({action:'init'});assert.equal(new Headers(sent!.headers).get('Authorization'),'Bearer private-access');assert.equal(sent!.redirect,'error');assert.equal(new Headers(sent!.headers).get('Content-Type'),'application/json');
 await assert.rejects(c.request('https://evil.test/api/action'),ApiError);
});
await test('network failures never replay a potentially committed mutation',async()=>{
 let calls=0;const c=new CarbookClient('https://api.carbook.test',async()=>'token',async()=>{calls++;throw new Error('lost reply')});
 await assert.rejects(c.action({action:'post'}),(e:any)=>e instanceof ApiError&&e.uncertain);assert.equal(calls,1);
});
await test('JSON API errors and proxy HTML responses remain clear',async()=>{
 const c=new CarbookClient('https://api.carbook.test',async()=>'token',async()=>Response.json({error:'Private content.'},{status:403}));await assert.rejects(c.read('feed'),(e:any)=>e.status===403&&e.message==='Private content.');
 const broken=new CarbookClient('https://api.carbook.test',async()=>'token',async()=>new Response('<html>login</html>',{status:200,headers:{'Content-Type':'text/html'}}));await assert.rejects(broken.read('feed'),ApiError);
});
await test('malformed successful mutations remain uncertain and are never replayed',async()=>{
 for(const response of [()=>new Response('<html>proxy</html>',{headers:{'Content-Type':'text/html'}}),()=>Response.json(null),()=>Response.json([]),()=>Response.json(42)]){
  let calls=0;const c=new CarbookClient('https://api.carbook.test',async()=>'t',async()=>{calls++;return response()});
  await assert.rejects(c.action({action:'post'}),(e:any)=>e instanceof ApiError&&e.uncertain);assert.equal(calls,1);
 }
});
await test('timeouts cancel reads without inventing an empty result',async()=>{
 let attempts=0;const c=new CarbookClient('https://api.carbook.test',async()=>'token',async(_url,options)=>{attempts++;return new Promise((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(new Error('abort'))))},{sleep:async()=>{}});
 await assert.rejects(c.request('/api/state',{},10),(e:any)=>e instanceof ApiError&&!e.uncertain);assert.equal(attempts,3,'reads retry twice before failing');
});
await test('refresh credentials rotate atomically and sign-out removes every stored chunk',async()=>{
 const values=new Map<string,string>();let fail=false;
 const vault=new RefreshVault({getItemAsync:async k=>values.get(k)||null,setItemAsync:async(k,v)=>{if(fail&&k.endsWith('.1'))throw new Error('keychain full');values.set(k,v)},deleteItemAsync:async k=>{values.delete(k)}});
 const a='a'.repeat(2300),b='b'.repeat(2600);await vault.write(a);assert.equal(await vault.read(),a);assert([...values.values()].every(v=>v.length<=800));
 fail=true;await assert.rejects(vault.write(b));assert.equal(await vault.read(),a);fail=false;
 await Promise.all([vault.write(b),vault.clear()]);assert.equal(await vault.read(),null);assert.equal(values.size,0);
 await vault.write(a);assert.equal(await vault.take(),a);assert.equal(values.size,0);await assert.rejects(vault.write('x'.repeat(24001)));
});
await test('corrupted secure-store manifests cannot request unrelated keys',async()=>{
 const seen:string[]=[];const vault=new RefreshVault({getItemAsync:async k=>{seen.push(k);return '{"generation":"../private","parts":99999}'},setItemAsync:async()=>{},deleteItemAsync:async()=>{}});assert.equal(await vault.read(),null);assert.equal(seen.length,1);
});
await test('feed pagination updates matching IDs without duplicates',()=>{assert.deepEqual(mergeById([{id:'1',v:1},{id:'2',v:1}],[{id:'2',v:2},{id:'3',v:1}]),[{id:'1',v:1},{id:'2',v:2},{id:'3',v:1}]);});
await test('deep links accept known routes and reject hostile paths',()=>{assert.deepEqual(parseDeepLink('com.analysight.carbook://post/p-1'),{type:'post',id:'p-1'});for(const v of ['https://evil.test/post/p-1','com.analysight.carbook://post/../settings','com.analysight.carbook://admin/all','garbage'])assert.equal(parseDeepLink(v),null);});
await test('event dates reject impossible and past calendar values',()=>{assert(Number.isFinite(localEventTime('2028-02-29','12:30',0)));for(const [d,t]of [['2027-02-29','12:30'],['2028-02-31','12:30'],['2028-13-01','12:30'],['2028-01-01','24:00'],['2020-01-01','12:00']])assert.throws(()=>localEventTime(d!,t!));});
await test('unconfigured, insecure and browser-only APIs fail closed',()=>{
 const good={apiUrl:'https://api.carbook.test',issuer:'https://identity.carbook.test/',clientId:'native',audience:'carbook',supportUrl:'https://carbook.test/support',privacyUrl:'https://carbook.test/privacy',termsUrl:'https://carbook.test/terms'};assert.equal(validateConfig(good).apiUrl,good.apiUrl);
 for(const apiUrl of ['', 'http://carbook.test','https://carbook.atif.chatgpt.site','https://user:secret@api.carbook.test','https://api.carbook.test?secret=x'])assert.throws(()=>validateConfig({...good,apiUrl}));
});
const rec=(o:Partial<VehicleRecord>):VehicleRecord=>({id:'r'+Math.random(),car_id:'c1',kind:'fuel',title:'Fill',category:'',date:Date.UTC(2026,5,1),amount:null,currency:'PKR',odometer:null,litres:null,full_tank:1,due_date:null,due_odometer:null,image:null,notes:'',created:0,updated:0,...o} as VehicleRecord);
await test('VIN validation enforces length, I/O/Q and the North American check digit',()=>{
 assert.equal(checkDigit('1HGCM82633A004352'),'3');assert.equal(validateVin('1hgcm82633a004352').ok,true);assert.equal(normalizeVin(' 1HG-CM8 2633A004352 '),'1HGCM82633A004352');
 assert.equal(validateVin('1HGCM82643A004352').ok,false);assert.equal(validateVin('1HGCM82633A00435').ok,false);assert.equal(validateVin('1HGCM8263OA004352').ok,false);assert.equal(validateVin('1HGCM8263QA004352').ok,false);
 const eu=validateVin('WVWZZZ1JZXW000001');assert.equal(eu.ok,true);});
await test('vPIC responses are parsed defensively',()=>{const d=parseVpic('1HGCM82633A004352',{Results:[{Make:'HONDA',Model:'Accord',ModelYear:'2003',Trim:'EX',ErrorCode:'0',ErrorText:''}]});assert.equal(d.make,'HONDA');assert.equal(d.year,'2003');assert.equal(vinTitle(d),'2003 Honda Accord EX');assert.throws(()=>parseVpic('x',{}));assert.throws(()=>parseVpic('x',null));});
await test('fuel economy uses full-tank intervals and folds partial fills into the next full tank',()=>{
 const s=fuelStats([rec({odometer:10000,litres:40,amount:10000}),rec({odometer:10200,litres:10,full_tank:0,amount:2500}),rec({odometer:10500,litres:30,amount:7500}),rec({odometer:11000,litres:40,amount:10000})]);
 assert.equal(s.fills,4);assert.equal(s.totalLitres,120);assert.equal(s.distance,1000);assert.equal(s.average,8);assert.equal(s.last,8);assert.equal(s.intervals.length,2);assert.equal(s.kmPerLitre,12.5);assert.equal(s.costPerKm,20);
 assert.equal(fuelStats([rec({odometer:100,litres:20,full_tank:0})]).average,null);assert.equal(fuelStats([]).fills,0);});
await test('expense totals group by kind and category in one currency',()=>{const t=categoryTotals([rec({amount:100}),rec({kind:'service',amount:300}),rec({kind:'expense',category:'Tyres',amount:200}),rec({kind:'expense',category:'Tyres',amount:50,currency:'USD'})]);assert.deepEqual(t.rows,[{label:'Service',value:300},{label:'Tyres',value:200},{label:'Fuel',value:100}]);assert.equal(t.total,600);
 const now=new Date(2026,5,15).getTime(),m=monthlySpend([rec({amount:5,date:new Date(2026,5,2).getTime()}),rec({amount:7,date:new Date(2025,0,2).getTime()})],now,6);assert.equal(m.length,6);assert.equal(m.at(-1)!.value,5);assert.equal(m.reduce((n,x)=>n+x.value,0),5);});
await test('due items rank overdue, soon and later by date and distance',()=>{const now=new Date(2026,5,1,12).getTime(),day=86400000;
 const items=dueItems([rec({id:'a',kind:'service',odometer:50000,due_date:now+90*day}),rec({id:'b',kind:'document',due_date:now-day}),rec({id:'c',kind:'service',due_odometer:50500}),rec({id:'d',kind:'document',due_date:now+40*day})],now);
 assert.deepEqual(items.map(i=>[i.record.id,i.state]),[['b','overdue'],['c','soon'],['d','later'],['a','later']]);assert.equal(items[1]!.kmLeft,500);});
await test('reminders fire 7 days early and on the due morning, never in the past',()=>{const now=new Date(2026,5,1,12).getTime(),due=new Date(2026,5,20,12).getTime();const plan=reminderPlan({id:'x',title:'Insurance',due_date:due},'Civic',now);
 assert.deepEqual(plan.map(p=>p.id),['record-x-early','record-x-due']);assert.equal(new Date(plan[1]!.at).getHours(),9);assert.equal(plan[1]!.at-plan[0]!.at,7*86400000);
 assert.deepEqual(reminderPlan({id:'x',title:'I',due_date:new Date(2026,5,4,12).getTime()},'C',now).map(p=>p.id),['record-x-due']);assert.deepEqual(reminderPlan({id:'x',title:'I',due_date:null},'C',now),[]);});
await test('calendar days parse strictly and round-trip',()=>{const t=parseDay('2028-02-29');assert(t);assert.equal(dayString(t),'2028-02-29');for(const v of ['2027-02-29','2026-13-01','26-01-01','2026-1-1',''])assert.equal(parseDay(v),null);});
await test('map tiles and geocoder only accept safe https templates',()=>{assert.equal(tileTemplate(undefined),DEFAULT_TILES);assert.equal(tileTemplate('http://x.test/{z}/{x}/{y}.png'),DEFAULT_TILES);assert.equal(tileTemplate('https://tiles.test/{z}/{x}/{y}.png'),'https://tiles.test/{z}/{x}/{y}.png');assert.equal(tileTemplate('https://tiles.test/a.png'),DEFAULT_TILES);
 assert.equal(geocoderBase('off'),null);assert.equal(geocoderBase('https://geo.test/'),'https://geo.test');assert.match(geocoderBase('javascript:alert(1)')!,/^https:\/\//);
 assert.equal(tileUrl('https://t/{z}/{x}/{y}',2,-1,1),'https://t/2/3/1');});
await test('web mercator projection round-trips and bounds stay sane',()=>{for(const [lat,lng] of [[31.5204,74.3587],[-33.86,151.2],[0,0]]){const p=project(lat!,lng!,12),b=unproject(p.x,p.y,12);assert(Math.abs(b.lat-lat!)<1e-6&&Math.abs(b.lng-lng!)<1e-6)}
 const f=fitBounds([{lat:31.5,lng:74.3},{lat:33.7,lng:73.1}],360,240);assert(f.zoom>=2&&f.zoom<=18);assert(f.center.lat>31.5&&f.center.lat<33.7);assert.equal(fitBounds([],300,200).zoom,5);});
await test('directions hand off to native maps with a web fallback',()=>{const ios=directionsUrls(31.5,74.35,'Meet & greet','ios'),android=directionsUrls(31.5,74.35,'Meet','android');
 assert.match(ios[0]!,/^maps:\?daddr=31\.500000,74\.350000&q=Meet%20%26%20greet$/);assert.match(android[0]!,/^geo:31\.500000,74\.350000\?q=/);assert.match(android[1]!,/^google\.navigation:/);for(const l of [ios,android])assert.match(l.at(-1)!,/^https:\/\/www\.openstreetmap\.org\/directions/);});
await test('coordinates parse within range',()=>{assert.deepEqual(parseCoords(' 31.5204, 74.3587 '),{lat:31.5204,lng:74.3587});for(const v of ['91,10','10,181','abc','31.5'])assert.equal(parseCoords(v),null);});
await test('geocoder sends an identifying user agent and validates results',async()=>{let seen:RequestInit|undefined,url='';const fake=(async(u:string,init?:RequestInit)=>{url=u;seen=init;return new Response(JSON.stringify([{display_name:'Lahore',lat:'31.5',lon:'74.3'},{display_name:'bad',lat:'x',lon:'1'}]))}) as unknown as typeof fetch;
 const r=await geocode('Lahore',fake,'https://geo.test');assert.deepEqual(r,[{label:'Lahore',lat:31.5,lng:74.3}]);assert.match(url,/^https:\/\/geo\.test\/search\?/);assert(JSON.stringify(seen?.headers||{}).includes('Carbook'));
 await assert.rejects(()=>geocode('Lahore',fake,null));});
await test('notification payload routes are allow-listed',()=>{for(const v of ['/notifications','/garage','/post/abc-123','/chat/c-1','/garage/car-1'])assert.equal(notificationRoute(v),v);for(const v of ['/settings','/admin','https://evil.test','/post/../admin','/post/a/b',42,null])assert.equal(notificationRoute(v),null);});
await test('offer amounts must be positive whole numbers',()=>{assert.equal(parseAmount('1,250,000'),1250000);for(const v of ['0','-5','12.5','abc',''])assert.equal(parseAmount(v),null);});
await test('reads retry 502/503/504/429 with backoff and honour Retry-After; writes never retry',async()=>{
 const delays:number[]=[];let calls=0;const statuses=[503,429,200];
 const c=new CarbookClient('https://api.carbook.test',async()=>'t',async()=>{const st=statuses[calls++];return st===200?Response.json({ok:true}):Response.json({error:'busy'},{status:st,headers:st===429?{'Retry-After':'3'}:{}})},{sleep:async ms=>{delays.push(ms)},random:()=>.5});
 assert.deepEqual(await c.request('/api/state'),{ok:true});assert.equal(calls,3);assert.deepEqual(delays,[400,3000]);
 calls=0;const w=new CarbookClient('https://api.carbook.test',async()=>'t',async()=>{calls++;return Response.json({error:'down'},{status:503})},{sleep:async()=>{}});
 await assert.rejects(w.action({action:'post'}),(e:any)=>e.status===503&&!e.uncertain);assert.equal(calls,1,'writes are not replayed');
 assert.equal(backoffDelay(0,'600'),8000,'Retry-After is capped');assert.equal(backoffDelay(5,null,()=>.5),6000);assert.equal(backoffDelay(1,'abc',()=>.5),1200);
});
await test('a 401 forces one token refresh and retries; a second 401 surfaces',async()=>{
 const forced:boolean[]=[];let n=0;const c=new CarbookClient('https://api.carbook.test',async o=>{forced.push(!!o?.force);return 'tok'+forced.length},async(_u,init)=>{n++;const auth=new Headers(init!.headers).get('Authorization');return auth==='Bearer tok2'?Response.json({ok:true}):Response.json({error:'expired'},{status:401})});
 assert.deepEqual(await c.action({action:'init'}),{ok:true});assert.deepEqual(forced,[false,true]);assert.equal(n,2);
 const d=new CarbookClient('https://api.carbook.test',async()=>'bad',async()=>Response.json({error:'Session expired.'},{status:401}));await assert.rejects(d.request('/api/state'),(e:any)=>e.status===401&&e.message==='Session expired.');
});
await test('token failures are never reported as uncertain writes',async()=>{
 let sent=0;const c=new CarbookClient('https://api.carbook.test',async()=>{throw new Error('offline')},async()=>{sent++;return Response.json({})});
 await assert.rejects(c.action({action:'post',body:'x'}),(e:any)=>e instanceof ApiError&&!e.uncertain&&/refresh your session/.test(e.message));assert.equal(sent,0);
 const s=new CarbookClient('https://api.carbook.test',async()=>{throw new ApiError('Your session ended. Sign in again to continue.',401)},async()=>Response.json({}));await assert.rejects(s.request('/api/state'),(e:any)=>e.status===401);
});
await test('requests carry a request id and client version; server ids and friendly 5xx text reach the UI',async()=>{
 let h:Headers|undefined;const c=new CarbookClient('https://api.carbook.test',async()=>'t',async(_u,init)=>{h=new Headers(init!.headers);return new Response('<html>Bad gateway</html>',{status:502,headers:{'Content-Type':'text/html','X-Request-Id':'srv-123'}})},{version:'0.3.0',retries:0});
 await assert.rejects(c.request('/api/state'),(e:any)=>e.requestId==='srv-123'&&/having trouble/.test(e.message));assert.equal(h!.get('X-Client-Version'),'0.3.0');assert.match(h!.get('X-Request-Id')||'',/^m-[0-9a-f]{16}$/);
 assert.notEqual(requestId(),requestId());
});
await test('external links allow only http(s) without credentials',()=>{
 assert.equal(safeExternalUrl(' https://carbook.test/a?b=1 '),'https://carbook.test/a?b=1');assert.equal(safeExternalUrl('http://shop.test'),'http://shop.test/');
 for(const v of ['javascript:alert(1)','intent://scan#Intent;end','file:///etc/passwd','https://user:pw@evil.test','tel:123','data:text/html,x','','https://'+'a'.repeat(3000),null,42])assert.equal(safeExternalUrl(v),null,String(v).slice(0,40));
 assert.equal(optionalHttps('https://crash.test/ingest/'),'https://crash.test/ingest');for(const v of [undefined,'','http://crash.test','https://localhost/x','not a url'])assert.equal(optionalHttps(v),null);
});
await test('crash reports and analytics are scrubbed of tokens and personal data',()=>{
 const e=new Error('fetch failed for alice@example.com with Bearer abc.def.ghi and ExponentPushToken[xyz] code=SECRET123 phone +92 300 1234567');
 const r=crashReport('crash',e,{fatal:true,version:'0.3.0',build:'3',platform:'android',now:new Date(0)});
 for(const leak of ['alice@','abc.def','xyz]','SECRET123','1234567'])assert(!JSON.stringify(r).includes(leak),leak);assert.equal(r.fatal,true);assert.equal(r.at,'1970-01-01T00:00:00.000Z');
 assert.equal(crashReport('unhandled_rejection','plain',{version:'1',build:'',platform:'ios'}).message,'Error: plain');
 assert.equal(analyticsEvent('Bad Name'),null);assert.deepEqual(analyticsEvent('post_created',{media:true,count:2,body:{nested:1},Email:'x',note:'mail bob@x.io'}),{name:'post_created',props:{media:true,count:2,note:'mail [email]'}});
});
await test('offline snapshots are validated and expire',()=>{
 const now=Date.now(),data={userId:'u1',...Object.fromEntries(['moderation','profiles','posts','comments','cars','following','memberships','rsvps','notifications','blocked','friendships','circles','events','stories','listings','pages','conversations','reports','audit'].map(k=>[k,[]]))};
 assert.equal(parseSnapshot(JSON.stringify({savedAt:now-1000,data}),now)?.data.userId,'u1');
 assert.equal(parseSnapshot(JSON.stringify({savedAt:now,data:{userId:'u1',profiles:[]}}),now),null,'partial cache must not crash screens');
 for(const bad of ['nope','{}',JSON.stringify({savedAt:now,data:{profiles:[]}}),JSON.stringify({savedAt:now-SNAPSHOT_MAX_AGE-1,data}),JSON.stringify({savedAt:now+3600000,data})])assert.equal(parseSnapshot(bad,now),null);
});
await test('long assistant replies do not break follow-up questions',()=>{
 const history=Array.from({length:20},(_,i)=>({role:i%2?'user' as const:'assistant' as const,content:'x'.repeat(8000)}));
 const bounded=assistantHistory(history);assert.equal(bounded.length,12);assert(bounded.every(m=>m.content.length===1500));assert.equal(history[0]!.content.length,8000);
});
console.log(`${checks} mobile core checks passed.`);
