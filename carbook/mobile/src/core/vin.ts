// VIN validation and decoding through the free NHTSA vPIC API (no key). Decoded data comes only from vPIC.
const MAP:Record<string,number>={A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9};
const WEIGHTS=[8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
export const VPIC_URL='https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/';
export function normalizeVin(v:string){return v.toUpperCase().replace(/[\s-]/g,'')}
export function checkDigit(vin:string){let sum=0;for(let i=0;i<17;i++){const c=vin[i]!;sum+=(/\d/.test(c)?Number(c):MAP[c]??0)*WEIGHTS[i]!}const r=sum%11;return r===10?'X':String(r)}
export function validateVin(input:string){const vin=normalizeVin(input);
 if(vin.length!==17)return {vin,ok:false,error:'A VIN has exactly 17 characters.'};
 if(/[IOQ]/.test(vin))return {vin,ok:false,error:'VINs never use the letters I, O or Q.'};
 if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin))return {vin,ok:false,error:'Use only letters and numbers.'};
 const expected=checkDigit(vin),northAmerican=/^[1-5]/.test(vin);
 // The check digit is mandatory for North American VINs; elsewhere it is advisory only.
 if(vin[8]!==expected&&northAmerican)return {vin,ok:false,error:'The check digit does not match. Re-check the VIN.'};
 return {vin,ok:true,warning:vin[8]!==expected?'Check digit not used by this manufacturer; decoding may be partial.':null};}
export type VinDecode={vin:string;make:string;model:string;year:string;trim:string;body:string;engine:string;fuel:string;drive:string;transmission:string;plant:string;manufacturer:string;note:string|null};
const pick=(r:Record<string,string|null|undefined>,k:string)=>(r[k]||'').trim();
export function parseVpic(vin:string,json:unknown):VinDecode{const r=(json as {Results?:Record<string,string>[]})?.Results?.[0];if(!r)throw new Error('The VIN service returned no result.');
 const cyl=pick(r,'EngineCylinders'),disp=pick(r,'DisplacementL'),hp=pick(r,'EngineHP');const engine=[disp&&`${Number(disp).toFixed(1)} L`,cyl&&`${cyl} cyl`,pick(r,'EngineConfiguration'),hp&&`${hp} hp`].filter(Boolean).join(' · ');
 const out={vin,make:pick(r,'Make'),model:pick(r,'Model'),year:pick(r,'ModelYear'),trim:pick(r,'Trim'),body:pick(r,'BodyClass'),engine,fuel:pick(r,'FuelTypePrimary'),drive:pick(r,'DriveType'),transmission:pick(r,'TransmissionStyle'),plant:[pick(r,'PlantCity'),pick(r,'PlantCountry')].filter(Boolean).join(', '),manufacturer:pick(r,'Manufacturer'),note:null as string|null};
 const code=pick(r,'ErrorCode');if(!out.make&&!out.model)throw new Error('vPIC could not decode this VIN. It may be a non-US-market vehicle.');
 if(code&&code!=='0')out.note=pick(r,'ErrorText').split(';')[0]||'Some fields could not be decoded.';return out;}
export async function decodeVin(input:string,transport:typeof fetch=fetch,timeout=15000){const v=validateVin(input);if(!v.ok)throw new Error(v.error);
 const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
 try{const res=await transport(VPIC_URL+encodeURIComponent(v.vin)+'?format=json',{signal:c.signal,headers:{Accept:'application/json'}});if(!res.ok)throw new Error('The NHTSA VIN service is unavailable right now.');return parseVpic(v.vin,await res.json())}
 catch(e){throw e instanceof Error&&!/abort/i.test(e.name+e.message)?e:new Error('The NHTSA VIN service did not respond. Try again.')}finally{clearTimeout(t)}}
export const vinTitle=(d:VinDecode)=>[d.year,d.make&&d.make[0]+d.make.slice(1).toLowerCase(),d.model,d.trim].filter(Boolean).join(' ');
