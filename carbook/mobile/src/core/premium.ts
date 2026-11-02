import type {CarbookClient} from './client';
import type {VehicleRecord} from './garage';
export type Offer={id:string;listing_id:string;buyer_id:string;seller_id:string;amount:number;counter:number|null;currency:string;message:string;status:'pending'|'countered'|'accepted'|'declined'|'withdrawn';created:number;updated:number;title:string;price:number;image:string|null;listing_status:string;buyer_name:string;seller_name:string};
export type Insight={listingId:string;currency:string;category:string;basis:'similar'|'category'|null;enough:boolean;stats:{count:number;median:number;low:number;high:number;min:number;max:number;position:'below'|'within'|'above'|null}|null;source:string};
export type Place={id:string;title:string;city:string;location:string;starts:number;image:string|null;lat:number;lng:number;checkins:number;checked_in:boolean};
export type Checkins={eventId:string;place:{lat:number;lng:number}|null;count:number;checkedIn:boolean;members:{id:string;name:string;avatar:string|null}[];opensAt:number;closesAt:number};
export type ChatMessage={role:'user'|'assistant';content:string};
const post=<T,>(c:CarbookClient,path:string,body:unknown,timeout?:number)=>c.request<T>(path,{method:'POST',body:JSON.stringify(body)},timeout);
export const premium={
 status:(c:CarbookClient)=>c.request<{assistant:boolean;push:boolean}>('/api/premium/status'),
 records:(c:CarbookClient,carId?:string)=>c.request<{records:VehicleRecord[]}>('/api/garage/records'+(carId?'?'+new URLSearchParams({carId}):'')).then(r=>r.records),
 saveRecord:(c:CarbookClient,record:Record<string,unknown>)=>post<{ok:boolean;id:string}>(c,'/api/garage/record',record),
 deleteRecord:(c:CarbookClient,id:string)=>post(c,'/api/garage/record/delete',{id}),
 offers:(c:CarbookClient,listingId?:string)=>c.request<{offers:Offer[]}>('/api/market/offers'+(listingId?'?'+new URLSearchParams({listingId}):'')).then(r=>r.offers),
 offer:(c:CarbookClient,listingId:string,amount:number,message='')=>post<{ok:boolean;id:string}>(c,'/api/market/offer',{listingId,amount,message}),
 respond:(c:CarbookClient,offerId:string,decision:'accept'|'decline'|'counter'|'withdraw',amount?:number)=>post<{ok:boolean;status:string}>(c,'/api/market/offer/respond',{offerId,decision,amount}),
 insight:(c:CarbookClient,listingId:string)=>c.request<Insight>('/api/market/insight?'+new URLSearchParams({listingId})),
 places:(c:CarbookClient)=>c.request<{places:Place[]}>('/api/events/places').then(r=>r.places),
 checkins:(c:CarbookClient,eventId:string)=>c.request<Checkins>('/api/events/checkins?'+new URLSearchParams({eventId})),
 setPlace:(c:CarbookClient,eventId:string,lat:number|null,lng:number|null)=>post(c,'/api/events/place',{eventId,lat,lng}),
 checkIn:(c:CarbookClient,eventId:string)=>post(c,'/api/events/checkin',{eventId}),
 ask:(c:CarbookClient,messages:ChatMessage[],carId?:string)=>post<{reply:string}>(c,'/api/assistant',{messages,carId},45000),
};
export const parseAmount=(v:string)=>{const n=Number(v.replace(/[,\s]/g,''));return Number.isInteger(n)&&n>0?n:null};
