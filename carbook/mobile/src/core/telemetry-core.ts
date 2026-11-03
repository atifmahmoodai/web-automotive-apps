// Pure helpers for optional crash/analytics reporting. No network here so they are unit-testable.
const PATTERNS:[RegExp,string][]=[
 [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi,'Bearer [redacted]'],
 [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,'[jwt]'],
 [/ExponentPushToken\[[^\]]+\]/g,'ExponentPushToken[redacted]'],
 [/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]'],
 [/(\b(?:code|token|access_token|refresh_token|id_token|state|key|password|secret)[=:]\s*)[^&\s#,;]+/gi,'$1[redacted]'],
 [/\+?\d[\d\s-]{8,}\d/g,'[number]'],
];
export function scrub(text:string,max=2000){let out=String(text);for(const [re,rep] of PATTERNS)out=out.replace(re,rep);return out.length>max?out.slice(0,max)+'…':out;}
export type CrashReport={kind:'crash'|'unhandled_rejection'|'render_error';message:string;stack:string;fatal:boolean;version:string;build:string;platform:string;at:string};
export function crashReport(kind:CrashReport['kind'],error:unknown,meta:{fatal?:boolean;version:string;build:string;platform:string;now?:Date}):CrashReport{
 const e=error instanceof Error?error:new Error(typeof error==='string'?error:'Non-error thrown');
 return {kind,message:scrub(`${e.name}: ${e.message}`,500),stack:scrub(e.stack||'',4000),fatal:!!meta.fatal,version:meta.version,build:meta.build,platform:meta.platform,at:(meta.now||new Date()).toISOString()};
}
/** Analytics events carry a name and a few flat, non-personal properties only. */
export function analyticsEvent(name:string,props:Record<string,unknown>={}){
 if(!/^[a-z][a-z0-9_]{1,40}$/.test(name))return null;
 const clean:Record<string,string|number|boolean>={};
 for(const [k,v] of Object.entries(props).slice(0,12)){if(!/^[a-z][a-z0-9_]{0,30}$/.test(k))continue;if(typeof v==='number'&&Number.isFinite(v))clean[k]=v;else if(typeof v==='boolean')clean[k]=v;else if(typeof v==='string')clean[k]=scrub(v,80);}
 return {name,props:clean};
}
