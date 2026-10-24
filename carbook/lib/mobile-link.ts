import {database,requireActive,rateLimit,ApiError} from './server';
export async function hashLink(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function createMobileLink(uid:string){
 await requireActive(uid);await rateLimit(uid,'mobile-link',3);
 const code=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','').slice(0,16),hash=await hashLink(code),expires=Date.now()+5*60000,db=database();
 await db.batch([db.prepare('DELETE FROM mobile_link_codes WHERE user_id=? OR expires<?').bind(uid,Date.now()),db.prepare('INSERT INTO mobile_link_codes(hash,user_id,expires) VALUES(?,?,?)').bind(hash,uid,expires)]);
 return {code,expires};
}
export async function redeemMobileLink(identityId:string,uid:string|null,code:string){
 if(!/^[a-f0-9]{48}$/.test(code))throw new ApiError('Enter the complete connection code.');
 if(uid)await requireActive(uid);await rateLimit('mobile-identity-'+identityId,'redeem-mobile-link',5);const db=database(),hash=await hashLink(code),link=await db.prepare('SELECT user_id,expires FROM mobile_link_codes WHERE hash=?').bind(hash).first<{user_id:string;expires:number}>();
 if(!link||link.expires<Date.now())throw new ApiError('This connection code has expired or has already been used.',400);
 await requireActive(link.user_id);if(link.user_id===uid)throw new ApiError('This account is already connected.');
 if(uid&&!uid.startsWith('mob-'))throw new ApiError('This mobile identity is already connected to a website account.',409);
 const p=uid?await db.prepare('SELECT role FROM profiles WHERE id=?').bind(uid).first<{role:string}>():null;if(p?.role==='owner')throw new ApiError('The owner account cannot be replaced. Contact support.',409);
 const tables:[string,string][]=[['posts','author_id'],['comments','author_id'],['cars','owner_id'],['stories','author_id'],['listings','seller_id'],['pages','owner_id'],['circles','owner_id'],['meetups','organizer_id'],['messages','sender_id'],['media','owner_id'],['follows','user_id'],['blocks','user_id'],['reactions','user_id'],['saves','user_id'],['poll_votes','user_id'],['memberships','user_id'],['rsvps','user_id'],['listing_saves','user_id'],['page_follows','user_id']];
 if(uid)for(const [table,column]of tables)if(await db.prepare(`SELECT 1 FROM ${table} WHERE ${column}=? LIMIT 1`).bind(uid).first())throw new ApiError('Connect before publishing from this new mobile profile. Existing content requires a reviewed account merge.',409);
 if(uid&&await db.prepare('SELECT 1 FROM friendships WHERE sender_id=? OR recipient_id=? LIMIT 1').bind(uid,uid).first())throw new ApiError('Connect before making connections from this new profile. Existing relationships require a reviewed account merge.',409);
 // The mapping is updated only while an unexpired code exists. A competing redemption consumes it.
 await db.batch([
  db.prepare('INSERT INTO mobile_identities(id,user_id,created) SELECT ?,user_id,? FROM mobile_link_codes WHERE hash=? AND expires>? ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id').bind(identityId,Date.now(),hash,Date.now()),
  db.prepare('DELETE FROM mobile_link_codes WHERE hash=?').bind(hash)
 ]);
 const mapped=await db.prepare('SELECT user_id FROM mobile_identities WHERE id=?').bind(identityId).first<{user_id:string}>();if(mapped?.user_id!==link.user_id)throw new ApiError('This connection code was already used.',409);
 if(uid)await db.prepare("UPDATE profiles SET status='deactivated' WHERE id=? AND NOT EXISTS(SELECT 1 FROM mobile_identities WHERE user_id=?)").bind(uid,uid).run();
 return {ok:true,userId:link.user_id};
}
