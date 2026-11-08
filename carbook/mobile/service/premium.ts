import {z} from 'zod';
import {database,json,ApiError,rateLimit,memberAccessible,checkImages,WITH,V,activeOwner,notify,requireActive} from '../../lib/server';
// Native-only premium features: push delivery, garage records, offers, price insight, event places/check-ins and the AI assistant.
export interface PremiumEnv{AI_API_KEY?:string;AI_BASE_URL?:string;AI_MODEL?:string;AI_DAILY_LIMIT?:string;EXPO_ACCESS_TOKEN?:string;PUSH_DISABLED?:string}
const EXPO_PUSH='https://exp.host/--/api/v2/push/send',DAY=86400000;
const id=z.string().trim().min(1).max(120),int=(max:number)=>z.number().int().min(0).max(max);
/** Per-member daily cap for paid AI calls (AI_DAILY_LIMIT, default 40). Protects the provider bill from a single account. */
export function assistantDailyLimit(env:PremiumEnv){const n=Number(env.AI_DAILY_LIMIT);return Number.isInteger(n)&&n>0&&n<=10000?n:40;}
async function dailyQuota(uid:string,scope:string,max:number){const now=Date.now(),day=Math.floor(now/DAY);const row=await database().prepare('INSERT INTO rate_limits(id,hits,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1 RETURNING hits').bind(`${uid}:${scope}:day:${day}`,(day+1)*DAY+3600000).first<{hits:number}>();if((row?.hits||0)>max)throw new ApiError(`You have reached today’s limit of ${max} assistant questions. It resets at midnight UTC.`,429);}
export function assistantConfigured(env:PremiumEnv){return !!(env.AI_API_KEY&&env.AI_BASE_URL&&env.AI_MODEL&&/^https:\/\//.test(env.AI_BASE_URL))}
const parse=<T>(schema:z.ZodType<T>,input:unknown)=>{const r=schema.safeParse(input);if(!r.success)throw new ApiError(r.error.issues[0]?.message||'Check your input.');return r.data;};
const uuid=()=>crypto.randomUUID();

// ---------- Push ----------
const pushSchema=z.object({token:z.string().regex(/^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,200}\]$/,'Invalid push token.'),platform:z.enum(['android','ios']).default('android')});
async function registerPush(input:unknown,uid:string){const a=parse(pushSchema,input),db=database(),now=Date.now();await rateLimit(uid,'push-register',10);
 // A device token belongs to the member currently signed in on that device.
 await db.prepare('INSERT INTO push_tokens(token,user_id,platform,created,updated) VALUES(?,?,?,?,?) ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id,platform=excluded.platform,updated=excluded.updated').bind(a.token,uid,a.platform,now,now).run();
 await db.prepare('DELETE FROM push_tokens WHERE user_id=? AND token NOT IN(SELECT token FROM push_tokens WHERE user_id=? ORDER BY updated DESC LIMIT 10)').bind(uid,uid).run();return {ok:true};}
async function unregisterPush(input:unknown,uid:string){const a=parse(z.object({token:z.string().max(260)}),input);await database().prepare('DELETE FROM push_tokens WHERE token=? AND user_id=?').bind(a.token,uid).run();return {ok:true};}
export type PushMessage={userId:string;title:string;body:string;route?:string};
export async function sendPush(env:PremiumEnv,messages:PushMessage[]){if(env.PUSH_DISABLED==='true'||!messages.length)return 0;const db=database(),users=[...new Set(messages.map(m=>m.userId))];
 const tokens=(await db.prepare(`SELECT token,user_id FROM push_tokens WHERE user_id IN(${users.map(()=>'?').join(',')})`).bind(...users).all()).results as {token:string;user_id:string}[];
 const out=messages.flatMap(m=>tokens.filter(t=>t.user_id===m.userId).map(t=>({to:t.token,title:m.title,body:m.body.slice(0,180),sound:'default',channelId:'default',data:m.route?{route:m.route}:{}})));let sent=0;
 for(let i=0;i<out.length;i+=100){const chunk=out.slice(i,i+100);try{const res=await fetch(EXPO_PUSH,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(env.EXPO_ACCESS_TOKEN?{Authorization:'Bearer '+env.EXPO_ACCESS_TOKEN}:{})},body:JSON.stringify(chunk),signal:AbortSignal.timeout(10000)});if(!res.ok)continue;const body=await res.json() as {data?:{status:string;details?:{error?:string}}[]};
  const dead=(body.data||[]).map((t,j)=>t.status==='error'&&t.details?.error==='DeviceNotRegistered'?chunk[j]!.to:null).filter(Boolean) as string[];sent+=(body.data||[]).filter(t=>t.status==='ok').length;
  if(dead.length)await db.batch(dead.map(t=>db.prepare('DELETE FROM push_tokens WHERE token=?').bind(t)));}catch{/* Push is best effort; the in-app notification remains. */}}
 return sent;}
type Row={id:string;recipient_id:string;message:string;post_id:string|null;name:string};
function notificationPush(r:Row):PushMessage{return {userId:r.recipient_id,title:'Carbook',body:`${r.name} ${r.message}`,route:r.post_id?'/post/'+r.post_id:'/notifications'};}
async function pushRows(env:PremiumEnv,rows:Row[]){if(!rows.length)return;const db=database();await db.batch(rows.map(r=>db.prepare('UPDATE notifications SET pushed=1 WHERE id=?').bind(r.id)));await sendPush(env,rows.map(notificationPush));}
const rowSql=`SELECT n.id,n.recipient_id,n.message,n.post_id,p.name FROM notifications n JOIN profiles p ON p.id=n.actor_id JOIN profiles r ON r.id=n.recipient_id WHERE n.pushed=0 AND n.read=0 AND r.notifications_enabled=1 AND r.status='active' AND NOT EXISTS(SELECT 1 FROM blocks b WHERE (b.user_id=n.recipient_id AND b.target_id=n.actor_id) OR (b.user_id=n.actor_id AND b.target_id=n.recipient_id))`;
/** Called after a successful mobile action; sends pushes for notifications that action created (already filtered by preferences) and for new direct messages. Never throws. */
export async function afterAction(env:PremiumEnv,uid:string,action:{action:string;conversationId?:string},result:unknown,start:number){try{const db=database();
 await pushRows(env,(await db.prepare(rowSql+' AND n.actor_id=? AND n.created>=? LIMIT 200').bind(uid,start).all()).results as Row[]);
 const messageId=(result as {id?:string})?.id;
 if(action.action==='message'&&messageId){const m=await db.prepare(`SELECT m.conversation_id,CASE WHEN c.user_a=? THEN c.user_b ELSE c.user_a END peer,s.name FROM messages m JOIN conversations c ON c.id=m.conversation_id JOIN profiles s ON s.id=m.sender_id WHERE m.id=? AND m.sender_id=? AND m.created>=?`).bind(uid,messageId,uid,start).first<{conversation_id:string;peer:string;name:string}>();
  if(m){const peer=await db.prepare("SELECT 1 ok FROM profiles WHERE id=? AND status='active' AND notifications_enabled=1").bind(m.peer).first();if(peer)await sendPush(env,[{userId:m.peer,title:'New message',body:`${m.name} sent you a message`,route:'/chat/'+m.conversation_id}]);}}
}catch{/* best effort */}}
/** Cron sweep: pushes recent notifications created outside the mobile API (for example on the website). */
export async function pushPending(env:PremiumEnv){const rows=(await database().prepare(rowSql+' AND n.created>? ORDER BY n.created LIMIT 200').bind(Date.now()-2*3600000).all()).results as Row[];await pushRows(env,rows);return rows.length;}

// ---------- Garage records ----------
const optInt=(max:number)=>int(max).nullable().optional();
const recordSchema=z.object({id:id.optional(),carId:id,kind:z.enum(['service','fuel','expense','document']),title:z.string().trim().min(1,'Add a title.').max(120),category:z.string().trim().max(40).default(''),date:z.number().int(),amount:optInt(100_000_000_000),currency:z.string().regex(/^[A-Z]{3}$/).default('PKR'),odometer:optInt(5_000_000),litres:z.number().positive().max(2000).nullable().optional(),fullTank:z.boolean().default(true),dueDate:z.number().int().nullable().optional(),dueOdometer:optInt(5_000_000),image:z.string().max(300).nullable().optional(),notes:z.string().trim().max(1000).default('')});
async function ownCar(carId:string,uid:string){const car=await database().prepare('SELECT id,name,year,story FROM cars WHERE id=? AND owner_id=?').bind(carId,uid).first<{id:string;name:string;year:number;story:string}>();if(!car)throw new ApiError('This car is not in your garage.',404);return car;}
async function saveRecord(input:unknown,uid:string){const a=parse(recordSchema,input),db=database(),now=Date.now();await ownCar(a.carId,uid);await rateLimit(uid,'garage-records',30);
 if(a.date<Date.UTC(1950,0,1)||a.date>now+DAY)throw new ApiError('Choose a date that is not in the future.');if(a.dueDate!=null&&(a.dueDate<Date.UTC(1950,0,1)||a.dueDate>now+20*365*DAY))throw new ApiError('Choose a due date within the next 20 years.');
 if(a.kind==='fuel'&&(!a.litres||a.odometer==null))throw new ApiError('Fuel entries need litres and the odometer reading.');
 if(a.image)await checkImages([a.image],uid);
 const values=[a.kind,a.title,a.category,a.date,a.amount??null,a.currency,a.odometer??null,a.litres??null,a.fullTank?1:0,a.dueDate??null,a.dueOdometer??null,a.image||null,a.notes,now];
 if(a.id){const r=await db.prepare('UPDATE vehicle_records SET kind=?,title=?,category=?,date=?,amount=?,currency=?,odometer=?,litres=?,full_tank=?,due_date=?,due_odometer=?,image=?,notes=?,updated=? WHERE id=? AND owner_id=? AND car_id=?').bind(...values,a.id,uid,a.carId).run();if(!r.meta?.changes)throw new ApiError('Record unavailable.',404);return {ok:true,id:a.id};}
 const count=await db.prepare('SELECT COUNT(*) n FROM vehicle_records WHERE car_id=?').bind(a.carId).first<{n:number}>();if((count?.n||0)>=1000)throw new ApiError('This car has reached 1,000 records.');
 const rid=uuid();await db.prepare('INSERT INTO vehicle_records(kind,title,category,date,amount,currency,odometer,litres,full_tank,due_date,due_odometer,image,notes,updated,id,owner_id,car_id,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(...values,rid,uid,a.carId,now).run();return {ok:true,id:rid};}
async function deleteRecord(input:unknown,uid:string){const a=parse(z.object({id}),input);const r=await database().prepare('DELETE FROM vehicle_records WHERE id=? AND owner_id=?').bind(a.id,uid).run();if(!r.meta?.changes)throw new ApiError('Record unavailable.',404);return {ok:true};}
async function listRecords(url:URL,uid:string){const carId=url.searchParams.get('carId');if(carId)await ownCar(carId,uid);
 const rows=(await database().prepare(`SELECT id,car_id,kind,title,category,date,amount,currency,odometer,litres,full_tank,due_date,due_odometer,image,notes,created,updated FROM vehicle_records WHERE owner_id=?${carId?' AND car_id=?':''} ORDER BY date DESC,created DESC LIMIT 1000`).bind(...(carId?[uid,carId]:[uid])).all()).results;return {records:rows};}

// ---------- Offers ----------
const offerSchema=z.object({listingId:id,amount:z.number().int().min(1,'Enter an offer amount.').max(100_000_000_000),message:z.string().trim().max(500).default('')});
const respondSchema=z.object({offerId:id,decision:z.enum(['accept','decline','counter','withdraw']),amount:z.number().int().min(1).max(100_000_000_000).optional()});
const short=(t:string)=>t.length>60?t.slice(0,57)+'…':t;
async function makeOffer(input:unknown,uid:string){const a=parse(offerSchema,input),db=database(),now=Date.now();
 const l=await db.prepare('SELECT id,seller_id,title,currency,status FROM listings WHERE id=?').bind(a.listingId).first<{id:string;seller_id:string;title:string;currency:string;status:string}>();if(!l||l.status==='deleted')throw new ApiError('Listing unavailable.',404);
 if(l.seller_id===uid)throw new ApiError('You cannot make an offer on your own listing.',409);if(l.status!=='active')throw new ApiError('This listing is no longer accepting offers.',409);
 await memberAccessible(l.seller_id,uid);await rateLimit(uid,'offers',10);
 if(await db.prepare("SELECT 1 FROM listing_offers WHERE listing_id=? AND status='accepted' AND buyer_id!=?").bind(l.id,uid).first())throw new ApiError('The seller has already accepted another offer.',409);
 const existing=await db.prepare('SELECT id,status FROM listing_offers WHERE listing_id=? AND buyer_id=?').bind(l.id,uid).first<{id:string;status:string}>();if(existing?.status==='accepted')throw new ApiError('Your offer was already accepted. Message the seller to arrange the sale.',409);
 const oid=existing?.id||uuid();const changed=await db.prepare("INSERT INTO listing_offers(id,listing_id,buyer_id,seller_id,amount,counter,currency,message,status,created,updated) VALUES(?,?,?,?,?,NULL,?,?,'pending',?,?) ON CONFLICT(listing_id,buyer_id) DO UPDATE SET amount=excluded.amount,counter=NULL,message=excluded.message,status='pending',updated=excluded.updated WHERE listing_offers.status!='accepted'").bind(oid,l.id,uid,l.seller_id,a.amount,l.currency,a.message,now,now).run();
 if(!changed.meta?.changes)throw new ApiError('Your offer was already accepted. Refresh to see the latest status.',409);
 await notify(l.seller_id,uid,null,`made an offer of ${l.currency} ${a.amount.toLocaleString('en-US')} on “${short(l.title)}”`);return {ok:true,id:oid};}
async function respondOffer(input:unknown,uid:string){const a=parse(respondSchema,input),db=database(),now=Date.now();
 const o=await db.prepare('SELECT o.*,l.title,l.status listing_status FROM listing_offers o JOIN listings l ON l.id=o.listing_id WHERE o.id=?').bind(a.offerId).first<any>();if(!o||(o.buyer_id!==uid&&o.seller_id!==uid))throw new ApiError('Offer unavailable.',404);
 const seller=o.seller_id===uid,peer=seller?o.buyer_id:o.seller_id;await memberAccessible(peer,uid);await rateLimit(uid,'offers',20);
 const open=['pending','countered'].includes(o.status);if(!open)throw new ApiError('This offer is already closed.',409);
 if((a.decision==='accept'||a.decision==='counter')&&o.listing_status!=='active')throw new ApiError('This listing is no longer active.',409);
 let status:string,amount=o.amount,counter=o.counter,message:string;
 if(a.decision==='withdraw'){if(seller)throw new ApiError('Only the buyer can withdraw an offer.',403);status='withdrawn';message=`withdrew their offer on “${short(o.title)}”`;}
 else if(a.decision==='decline'){if(seller?o.status!=='pending':o.status!=='countered')throw new ApiError('There is nothing to decline yet.',409);status='declined';message=`declined the offer on “${short(o.title)}”`;}
 else if(a.decision==='counter'){if(!seller)throw new ApiError('Make a new offer to change your amount.',403);if(o.status!=='pending')throw new ApiError('Wait for the buyer to respond to your counter-offer.',409);if(!a.amount||a.amount===o.amount)throw new ApiError('Enter a different counter-offer amount.');status='countered';counter=a.amount;message=`countered with ${o.currency} ${a.amount.toLocaleString('en-US')} on “${short(o.title)}”`;}
 else{if(seller?o.status!=='pending':o.status!=='countered')throw new ApiError(seller?'The buyer must respond to your counter-offer.':'There is no counter-offer to accept.',409);status='accepted';if(!seller)amount=o.counter;message=`accepted the offer of ${o.currency} ${Number(amount).toLocaleString('en-US')} on “${short(o.title)}”`;}
 if(status==='accepted'&&await db.prepare("SELECT 1 FROM listing_offers WHERE listing_id=? AND status='accepted' AND id!=?").bind(o.listing_id,o.id).first())throw new ApiError('Another offer on this listing was already accepted.',409);
 // Atomic listing-wide acceptance guard: per-offer version checks alone cannot prevent two different buyers winning concurrently.
 const changed=await db.prepare("UPDATE listing_offers SET status=?,amount=?,counter=?,updated=? WHERE id=? AND status=? AND updated=? AND (?!='accepted' OR NOT EXISTS(SELECT 1 FROM listing_offers accepted WHERE accepted.listing_id=? AND accepted.status='accepted' AND accepted.id!=?)) AND (? NOT IN('accepted','countered') OR EXISTS(SELECT 1 FROM listings WHERE id=? AND status='active'))").bind(status,amount,counter,now,o.id,o.status,o.updated,status,o.listing_id,o.id,status,o.listing_id).run();if(!changed.meta?.changes)throw new ApiError('This offer changed. Refresh and try again.',409);
 await notify(peer,uid,null,message);return {ok:true,status};}
async function listOffers(url:URL,uid:string){const listingId=url.searchParams.get('listingId');
 const rows=(await database().prepare(WITH+`SELECT o.id,o.listing_id,o.buyer_id,o.seller_id,o.amount,o.counter,o.currency,o.message,o.status,o.created,o.updated,l.title,l.price,l.image,l.status listing_status,b.name buyer_name,s.name seller_name FROM listing_offers o JOIN listings l ON l.id=o.listing_id JOIN profiles b ON b.id=o.buyer_id JOIN profiles s ON s.id=o.seller_id
  WHERE (o.buyer_id=${V} OR o.seller_id=(SELECT id FROM viewer)) AND l.status!='deleted' AND ${activeOwner("CASE WHEN o.buyer_id=(SELECT id FROM viewer) THEN o.seller_id ELSE o.buyer_id END")}${listingId?' AND o.listing_id=?':''} ORDER BY o.updated DESC LIMIT 100`).bind(...(listingId?[uid,listingId]:[uid])).all()).results;return {offers:rows};}

// ---------- Price insight (Carbook listings only) ----------
const STOP=new Set(['for','sale','the','and','with','new','used','good','condition','car','cars','set','pair','original','genuine','price','urgent','model']);
export function titleTokens(title:string){return [...new Set(title.toLowerCase().split(/[^a-z0-9]+/).filter(t=>t.length>=3&&!/^\d+$/.test(t)&&!STOP.has(t)))];}
function quantile(sorted:number[],q:number){const pos=(sorted.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);return Math.round(sorted[lo]!+(sorted[hi]!-sorted[lo]!)*(pos-lo));}
export function priceStats(prices:number[],price?:number){const s=prices.filter(p=>Number.isFinite(p)&&p>0).sort((a,b)=>a-b);if(s.length<3)return null;const low=quantile(s,0.25),high=quantile(s,0.75);
 return {count:s.length,median:quantile(s,0.5),low,high,min:s[0]!,max:s[s.length-1]!,position:price==null?null:price<low?'below':price>high?'above':'within' as 'below'|'above'|'within'|null};}
async function insight(url:URL,uid:string){const listingId=url.searchParams.get('listingId')||'',db=database();
 const l=await db.prepare(WITH+`SELECT id,title,price,currency,category FROM listings l WHERE id=? AND status!='deleted' AND (seller_id=(SELECT id FROM viewer) OR ${activeOwner('l.seller_id')})`).bind(uid,listingId).first<{id:string;title:string;price:number;currency:string;category:string}>();if(!l)throw new ApiError('Listing unavailable.',404);
 const rows=(await db.prepare(WITH+`SELECT title,price FROM listings l WHERE category=? AND currency=? AND id!=? AND status IN('active','sold') AND (seller_id=(SELECT id FROM viewer) OR ${activeOwner('l.seller_id')}) ORDER BY created DESC LIMIT 400`).bind(uid,l.category,l.currency,l.id).all()).results as {title:string;price:number}[];
 const tokens=titleTokens(l.title),similar=rows.filter(r=>titleTokens(r.title).some(t=>tokens.includes(t)));
 let basis:'similar'|'category'='similar',stats=priceStats(similar.map(r=>r.price),l.price);if(!stats){basis='category';stats=priceStats(rows.map(r=>r.price),l.price);}
 const source=`Based only on ${stats?.count||rows.length} Carbook listing${(stats?.count||rows.length)===1?'':'s'} in ${l.category} priced in ${l.currency}${basis==='similar'&&stats?' with similar titles':''}. Not a market valuation.`;
 return {listingId:l.id,currency:l.currency,category:l.category,basis:stats?basis:null,enough:!!stats,stats,source};}

// ---------- Event places and check-ins ----------
const placeSchema=z.object({eventId:id,lat:z.number().min(-90).max(90).nullable(),lng:z.number().min(-180).max(180).nullable()});
async function visibleEvent(eventId:string,uid:string){const e=await database().prepare(WITH+`SELECT id,organizer_id,title,starts,status FROM meetups e WHERE id=? AND (e.organizer_id IS NULL OR e.organizer_id=(SELECT id FROM viewer) OR ${activeOwner('e.organizer_id')})`).bind(uid,eventId).first<{id:string;organizer_id:string|null;title:string;starts:number;status:string}>();if(!e)throw new ApiError('Event unavailable.',404);return e;}
async function setPlace(input:unknown,uid:string){const a=parse(placeSchema,input),db=database();const e=await visibleEvent(a.eventId,uid);if(e.organizer_id!==uid)throw new ApiError('Only the organizer can pin the event location.',403);await rateLimit(uid,'event-place',20);
 if(a.lat==null||a.lng==null){await db.prepare('DELETE FROM event_places WHERE event_id=?').bind(e.id).run();return {ok:true};}
 await db.prepare('INSERT INTO event_places(event_id,lat,lng,updated) VALUES(?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET lat=excluded.lat,lng=excluded.lng,updated=excluded.updated').bind(e.id,a.lat,a.lng,Date.now()).run();return {ok:true};}
export const CHECKIN_BEFORE=2*3600000,CHECKIN_AFTER=12*3600000;
async function checkIn(input:unknown,uid:string){const a=parse(z.object({eventId:id}),input),now=Date.now();const e=await visibleEvent(a.eventId,uid);
 if(e.status!=='published')throw new ApiError('This event is not running.',409);if(now<e.starts-CHECKIN_BEFORE)throw new ApiError('Check-in opens two hours before the event starts.',409);if(now>e.starts+CHECKIN_AFTER)throw new ApiError('Check-in for this event has closed.',409);
 await rateLimit(uid,'checkins',10);const r=await database().prepare('INSERT OR IGNORE INTO event_checkins(event_id,user_id,created) VALUES(?,?,?)').bind(e.id,uid,now).run();
 if(r.meta?.changes&&e.organizer_id)await notify(e.organizer_id,uid,null,`checked in at “${short(e.title)}”`);return {ok:true};}
async function places(uid:string){const rows=(await database().prepare(WITH+`SELECT e.id,e.title,e.city,e.location,e.starts,e.image,p.lat,p.lng,(SELECT COUNT(*) FROM event_checkins c WHERE c.event_id=e.id) checkins,EXISTS(SELECT 1 FROM event_checkins c WHERE c.event_id=e.id AND c.user_id=(SELECT id FROM viewer)) checked_in FROM meetups e JOIN event_places p ON p.event_id=e.id
  WHERE e.status='published' AND e.starts>? AND (e.organizer_id IS NULL OR e.organizer_id=(SELECT id FROM viewer) OR ${activeOwner('e.organizer_id')}) ORDER BY e.starts LIMIT 200`).bind(uid,Date.now()-CHECKIN_AFTER).all()).results as any[];
 return {places:rows.map(r=>({...r,checked_in:!!r.checked_in}))};}
async function eventCheckins(url:URL,uid:string){const e=await visibleEvent(url.searchParams.get('eventId')||'',uid),db=database();
 const place=await db.prepare('SELECT lat,lng FROM event_places WHERE event_id=?').bind(e.id).first();
 // Attendance totals and your status must not depend on the first 50 visible members.
 const summary=await db.prepare(WITH+`SELECT COUNT(*) count,COALESCE(MAX(CASE WHEN p.id=(SELECT id FROM viewer) THEN 1 ELSE 0 END),0) checked_in FROM event_checkins c JOIN profiles p ON p.id=c.user_id WHERE c.event_id=? AND (p.id=(SELECT id FROM viewer) OR ${activeOwner('p.id')})`).bind(uid,e.id).first<{count:number;checked_in:number}>();
 const rows=(await db.prepare(WITH+`SELECT p.id,p.name,p.avatar FROM event_checkins c JOIN profiles p ON p.id=c.user_id WHERE c.event_id=? AND (p.id=(SELECT id FROM viewer) OR ${activeOwner('p.id')}) ORDER BY c.created DESC LIMIT 50`).bind(uid,e.id).all()).results as {id:string}[];
 return {eventId:e.id,place,count:summary?.count||0,checkedIn:!!summary?.checked_in,members:rows,opensAt:e.starts-CHECKIN_BEFORE,closesAt:e.starts+CHECKIN_AFTER};}

// ---------- AI assistant ----------
const assistantSchema=z.object({carId:id.optional(),messages:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().trim().min(1).max(1500)})).min(1).max(12)});
export const ASSISTANT_RULES=`You are the Carbook car assistant, helping car enthusiasts in a community app understand maintenance, ownership, modifications, buying and driving.
Rules: You are not a substitute for a qualified mechanic or inspection. For anything safety-critical (brakes, steering, suspension failure, airbags, fuel or brake fluid leaks, overheating, smoke, flashing check-engine light) tell the member to stop driving if unsafe and have the car inspected by a professional. Do not invent prices, recalls, specifications or part numbers you are unsure of; say when you are unsure and suggest how to verify. Keep answers concise and practical, using short paragraphs or lists. Decline requests unrelated to cars or that would be illegal or unsafe (for example defeating emissions or safety systems).`;
async function assistant(input:unknown,uid:string,env:PremiumEnv){if(!assistantConfigured(env))throw new ApiError('The car assistant is not configured on this server.',503);const a=parse(assistantSchema,input);if(a.messages[a.messages.length-1]!.role!=='user')throw new ApiError('Ask a question first.');
 await rateLimit(uid,'assistant',8);await dailyQuota(uid,'assistant',assistantDailyLimit(env));let context='';
 if(a.carId){const car=await ownCar(a.carId,uid);const recent=(await database().prepare("SELECT kind,title,date,odometer FROM vehicle_records WHERE car_id=? AND kind IN('service','fuel') ORDER BY date DESC LIMIT 6").bind(car.id).all()).results as {kind:string;title:string;date:number;odometer:number|null}[];
  context=`The member's car: ${car.year} ${car.name}.${car.story?` Owner notes: ${car.story.slice(0,400)}`:''}${recent.length?` Recent records: ${recent.map(r=>`${new Date(r.date).toISOString().slice(0,10)} ${r.kind} ${r.title}${r.odometer!=null?` at ${r.odometer} km`:''}`).join('; ')}.`:''}`;}
 let res:Response;try{res=await fetch(env.AI_BASE_URL!.replace(/\/+$/,'')+'/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.AI_API_KEY},body:JSON.stringify({model:env.AI_MODEL,temperature:0.3,max_tokens:700,messages:[{role:'system',content:ASSISTANT_RULES+(context?'\n'+context:'')},...a.messages]}),signal:AbortSignal.timeout(30000)});}catch{throw new ApiError('The car assistant is unavailable right now. Try again shortly.',502);}
 if(!res.ok)throw new ApiError(res.status===429?'The car assistant is busy. Try again in a minute.':'The car assistant is unavailable right now. Try again shortly.',502);
 const body=await res.json().catch(()=>null) as {choices?:{message?:{content?:unknown}}[]}|null,content=body?.choices?.[0]?.message?.content,reply=typeof content==='string'?content.trim():'';if(!reply)throw new ApiError('The car assistant returned no answer. Try rephrasing.',502);
 return {reply:reply.slice(0,8000)};}

// ---------- Routing ----------
const GET_ROUTES=['/api/premium/status','/api/garage/records','/api/market/offers','/api/market/insight','/api/events/places','/api/events/checkins'];
const POST_ROUTES=['/api/push/register','/api/push/unregister','/api/garage/record','/api/garage/record/delete','/api/market/offer','/api/market/offer/respond','/api/events/place','/api/events/checkin','/api/assistant'];
export const isPremiumGet=(path:string)=>GET_ROUTES.includes(path),isPremiumPost=(path:string)=>POST_ROUTES.includes(path);
export async function premiumGet(url:URL,uid:string,env:PremiumEnv):Promise<Response>{await requireActive(uid);switch(url.pathname){
 case '/api/premium/status':return json({assistant:assistantConfigured(env),assistantDailyLimit:assistantDailyLimit(env),push:env.PUSH_DISABLED!=='true'});
 case '/api/garage/records':return json(await listRecords(url,uid));
 case '/api/market/offers':return json(await listOffers(url,uid));
 case '/api/market/insight':return json(await insight(url,uid));
 case '/api/events/places':return json(await places(uid));
 default:return json(await eventCheckins(url,uid));}}
export async function premiumPost(path:string,input:unknown,uid:string,env:PremiumEnv):Promise<Response>{await requireActive(uid);switch(path){
 case '/api/push/register':return json(await registerPush(input,uid));
 case '/api/push/unregister':return json(await unregisterPush(input,uid));
 case '/api/garage/record':return json(await saveRecord(input,uid));
 case '/api/garage/record/delete':return json(await deleteRecord(input,uid));
 case '/api/market/offer':return json(await makeOffer(input,uid));
 case '/api/market/offer/respond':return json(await respondOffer(input,uid));
 case '/api/events/place':return json(await setPlace(input,uid));
 case '/api/events/checkin':return json(await checkIn(input,uid));
 default:return json(await assistant(input,uid,env));}}
