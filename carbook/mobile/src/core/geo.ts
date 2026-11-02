// Map maths for the OSM tile map, plus directions hand-off and geocoding. No API keys are used anywhere.
export const DEFAULT_TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const DEFAULT_GEOCODER='https://nominatim.openstreetmap.org';
export function tileTemplate(value=process.env.EXPO_PUBLIC_MAP_TILE_URL){const t=(value||DEFAULT_TILES).trim();return /^https:\/\/[^\s?#]+\{z\}[^\s]*\{x\}[^\s]*\{y\}/.test(t)?t:DEFAULT_TILES}
export function geocoderBase(value=process.env.EXPO_PUBLIC_GEOCODER_URL){const v=(value||'').trim().replace(/\/$/,'');if(value!==undefined&&v==='off')return null;return /^https:\/\/[^\s?#]+$/.test(v)?v:DEFAULT_GEOCODER}
export const TILE=256;
export function project(lat:number,lng:number,zoom:number){const s=TILE*2**zoom,sin=Math.sin(Math.max(-85.0511,Math.min(85.0511,lat))*Math.PI/180);return {x:(lng+180)/360*s,y:(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*s}}
export function unproject(x:number,y:number,zoom:number){const s=TILE*2**zoom,lng=x/s*360-180,n=Math.PI-2*Math.PI*y/s;return {lat:180/Math.PI*Math.atan(.5*(Math.exp(n)-Math.exp(-n))),lng}}
export function tileUrl(template:string,z:number,x:number,y:number){const n=2**z,wx=((x%n)+n)%n;return template.replace('{z}',String(z)).replace('{x}',String(wx)).replace('{y}',String(y))}
export function visibleTiles(center:{lat:number;lng:number},zoom:number,width:number,height:number){const c=project(center.lat,center.lng,zoom),left=c.x-width/2,top=c.y-height/2,n=2**zoom,out:{key:string;z:number;x:number;y:number;left:number;top:number}[]=[];
 for(let tx=Math.floor(left/TILE);tx<=Math.floor((left+width)/TILE);tx++)for(let ty=Math.floor(top/TILE);ty<=Math.floor((top+height)/TILE);ty++)if(ty>=0&&ty<n)out.push({key:`${zoom}/${tx}/${ty}`,z:zoom,x:tx,y:ty,left:tx*TILE-left,top:ty*TILE-top});return out}
export function fitBounds(points:{lat:number;lng:number}[],width:number,height:number){if(!points.length)return {center:{lat:30.3753,lng:69.3451},zoom:5};if(points.length===1)return {center:points[0]!,zoom:13};
 for(let z=16;z>=2;z--){const ps=points.map(p=>project(p.lat,p.lng,z)),xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);if(Math.max(...xs)-Math.min(...xs)<width*.8&&Math.max(...ys)-Math.min(...ys)<height*.8)return {center:unproject((Math.max(...xs)+Math.min(...xs))/2,(Math.max(...ys)+Math.min(...ys))/2,z),zoom:z}}return {center:points[0]!,zoom:2}}
export function distanceKm(a:{lat:number;lng:number},b:{lat:number;lng:number}){const r=Math.PI/180,d=Math.sin((b.lat-a.lat)*r/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin((b.lng-a.lng)*r/2)**2;return 12742*Math.asin(Math.sqrt(d))}
/** Native maps first (geo: on Android, Apple Maps on iOS), then a keyless web fallback. */
export function directionsUrls(lat:number,lng:number,label:string,platform:string){const q=encodeURIComponent(label.slice(0,80)),c=`${lat.toFixed(6)},${lng.toFixed(6)}`;
 const web=`https://www.openstreetmap.org/directions?route=%3B${encodeURIComponent(c)}#map=15/${lat.toFixed(5)}/${lng.toFixed(5)}`;
 return platform==='ios'?[`maps:?daddr=${c}&q=${q}`,web]:[`geo:${c}?q=${c}(${q})`,`google.navigation:q=${c}`,web];}
export type GeoResult={label:string;lat:number;lng:number};
export async function geocode(query:string,transport:typeof fetch=fetch,base=geocoderBase()){if(!base)throw new Error('Address search is turned off. Enter coordinates instead.');const q=query.trim();if(q.length<3)throw new Error('Enter at least three characters.');
 const res=await transport(`${base}/search?${new URLSearchParams({q,format:'jsonv2',limit:'5',addressdetails:'0'})}`,{headers:{Accept:'application/json','User-Agent':'Carbook-mobile/0.2 (event pin)'}});if(!res.ok)throw new Error('Address search is unavailable right now.');
 const rows=await res.json() as {display_name?:string;lat?:string;lon?:string}[];return (Array.isArray(rows)?rows:[]).map(r=>({label:String(r.display_name||'').slice(0,160),lat:Number(r.lat),lng:Number(r.lon)})).filter(r=>r.label&&Number.isFinite(r.lat)&&Number.isFinite(r.lng)&&Math.abs(r.lat)<=90&&Math.abs(r.lng)<=180)}
export function parseCoords(value:string){const m=/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/.exec(value);if(!m)return null;const lat=Number(m[1]),lng=Number(m[2]);return Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng}:null}
