import assert from 'node:assert/strict';
import {CarbookClient,ApiError,mediaUrl,mergeById,parseDeepLink} from '../src/core/client';
import {RefreshVault} from '../src/core/vault';
import {localEventTime} from '../src/core/dates';
import {validateConfig} from '../src/core/config';
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
await test('timeouts cancel reads without inventing an empty result',async()=>{
 const c=new CarbookClient('https://api.carbook.test',async()=>'token',async(_url,options)=>new Promise((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(new Error('abort')))));
 await assert.rejects(c.request('/api/state',{},10),(e:any)=>e instanceof ApiError&&!e.uncertain);
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
console.log(`${checks} mobile core checks passed.`);
