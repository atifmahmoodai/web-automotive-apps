/** Only plain http(s) links without embedded credentials may leave the app. Returns the normalised URL or null. */
export function safeExternalUrl(value:unknown):string|null{
 if(typeof value!=='string')return null;const trimmed=value.trim();if(!trimmed||trimmed.length>2048)return null;
 let url:URL;try{url=new URL(trimmed);}catch{return null;}
 if(url.protocol!=='https:'&&url.protocol!=='http:')return null;if(url.username||url.password||!url.hostname)return null;
 return url.href;
}
/** Optional HTTPS endpoint from build-time env (telemetry, website). Anything else is treated as "not configured". */
export function optionalHttps(value:string|undefined|null):string|null{
 if(!value)return null;try{const url=new URL(value.trim());return url.protocol==='https:'&&!url.username&&!url.password&&url.hostname!=='localhost'?url.href.replace(/\/$/,''):null;}catch{return null;}
}
