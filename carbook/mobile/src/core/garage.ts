// Pure garage maths: fuel economy from full-tank intervals, spend totals and due reminders. No I/O so it is unit-tested in core.test.ts.
export type RecordKind='service'|'fuel'|'expense'|'document';
export type VehicleRecord={id:string;car_id:string;kind:RecordKind;title:string;category:string;date:number;amount:number|null;currency:string;odometer:number|null;litres:number|null;full_tank:number;due_date:number|null;due_odometer:number|null;image:string|null;notes:string;created:number;updated:number};
export const KIND_LABEL:Record<RecordKind,string>={service:'Service',fuel:'Fuel',expense:'Expense',document:'Document'};
export const EXPENSE_CATEGORIES=['Insurance','Tax & registration','Parts','Repairs','Tyres','Detailing','Parking & tolls','Modifications','Other'];
export const DOCUMENT_TYPES=['Insurance','Registration','Tax token','Warranty','Inspection','Other'];
export const DAY=86400000;
export function money(amount:number,currency='PKR'){return `${currency} ${Math.round(amount).toLocaleString('en-US')}`}
/** Consumption only counts closed full-tank to full-tank intervals; partial fills in between are added to the closing fill. */
export function fuelStats(records:VehicleRecord[]){
 const fills=records.filter(r=>r.kind==='fuel'&&r.litres&&r.odometer!=null).sort((a,b)=>a.odometer!-b.odometer!||a.date-b.date);
 let anchor:VehicleRecord|null=null,pending=0,litres=0,distance=0,cost=0,costDistance=0;const intervals:{date:number;l100:number}[]=[];
 for(const f of fills){if(!anchor){if(f.full_tank)anchor=f;continue}
  pending+=f.litres!;if(!f.full_tank)continue;const d=f.odometer!-anchor.odometer!;
  if(d>0){litres+=pending;distance+=d;intervals.push({date:f.date,l100:pending/d*100});const spent=fills.filter(x=>x.odometer!>anchor!.odometer!&&x.odometer!<=f.odometer!).reduce((n,x)=>n+(x.amount||0),0);if(spent){cost+=spent;costDistance+=d}}
  anchor=f;pending=0;}
 const totalLitres=fills.reduce((n,f)=>n+f.litres!,0),odo=fills.map(f=>f.odometer!);
 return {fills:fills.length,totalLitres,distance:odo.length>1?Math.max(...odo)-Math.min(...odo):0,average:distance?litres/distance*100:null,kmPerLitre:litres?distance/litres:null,costPerKm:costDistance?cost/costDistance:null,last:intervals.at(-1)?.l100??null,intervals};
}
export function categoryTotals(records:VehicleRecord[],currency='PKR'){const map=new Map<string,number>();
 for(const r of records)if(r.amount&&r.currency===currency){const key=r.kind==='fuel'?'Fuel':r.kind==='service'?'Service':r.category||KIND_LABEL[r.kind];map.set(key,(map.get(key)||0)+r.amount)}
 const rows=[...map].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value);return {rows,total:rows.reduce((n,r)=>n+r.value,0)};}
export function monthlySpend(records:VehicleRecord[],now=Date.now(),months=6,currency='PKR'){const out:{label:string;value:number;key:string}[]=[];const d=new Date(now);
 for(let i=months-1;i>=0;i--){const m=new Date(d.getFullYear(),d.getMonth()-i,1);out.push({key:`${m.getFullYear()}-${m.getMonth()}`,label:m.toLocaleDateString('en-US',{month:'short'}),value:0})}
 for(const r of records){if(!r.amount||r.currency!==currency)continue;const m=new Date(r.date),slot=out.find(o=>o.key===`${m.getFullYear()}-${m.getMonth()}`);if(slot)slot.value+=r.amount}
 return out.map(({label,value})=>({label,value}));}
export type DueItem={record:VehicleRecord;state:'overdue'|'soon'|'later';days:number|null;kmLeft:number|null};
export function dueItems(records:VehicleRecord[],now=Date.now(),odometer=latestOdometer(records)){
 return records.filter(r=>r.due_date!=null||r.due_odometer!=null).map(r=>{const days=r.due_date!=null?Math.ceil((r.due_date-now)/DAY):null,kmLeft=r.due_odometer!=null&&odometer!=null?r.due_odometer-odometer:null;
  const state:DueItem['state']=(days!=null&&days<0)||(kmLeft!=null&&kmLeft<0)?'overdue':(days!=null&&days<=30)||(kmLeft!=null&&kmLeft<=1000)?'soon':'later';return {record:r,state,days,kmLeft}})
  .sort((a,b)=>({overdue:0,soon:1,later:2}[a.state]-{overdue:0,soon:1,later:2}[b.state])||((a.days??1e9)-(b.days??1e9)));}
export function latestOdometer(records:VehicleRecord[]){const o=records.filter(r=>r.odometer!=null).map(r=>r.odometer!);return o.length?Math.max(...o):null}
/** Local reminder plan: one alert 7 days before (if still ahead) and one on the due morning at 09:00. */
export function reminderPlan(r:Pick<VehicleRecord,'id'|'title'|'due_date'>,carName:string,now=Date.now()){if(r.due_date==null)return [];const due=new Date(r.due_date);due.setHours(9,0,0,0);const early=new Date(due.getTime()-7*DAY);
 return [{id:`record-${r.id}-early`,at:early.getTime(),title:`${r.title} due in 7 days`,body:`${carName}: plan ahead so it does not lapse.`},{id:`record-${r.id}-due`,at:due.getTime(),title:`${r.title} is due today`,body:`${carName}: tap to open your garage.`}].filter(x=>x.at>now+60000);}
export function parseDay(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const [y,m,d]=value.split('-').map(Number);const t=new Date(y!,m!-1,d!,12);return t.getFullYear()===y&&t.getMonth()===m!-1&&t.getDate()===d?t.getTime():null}
export const dayString=(ms:number)=>{const d=new Date(ms);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
