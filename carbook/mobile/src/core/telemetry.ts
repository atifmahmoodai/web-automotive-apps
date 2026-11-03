// Optional crash + analytics hooks. Both are OFF unless an HTTPS endpoint is set at build time:
//   EXPO_PUBLIC_CRASH_REPORT_URL, EXPO_PUBLIC_ANALYTICS_URL
// Reports are scrubbed (tokens, emails, numbers) and never include post, message or profile content.
import {Platform} from 'react-native';
import {appBuild,appVersion} from './app-info';
import {optionalHttps} from './urls';
import {analyticsEvent,crashReport,type CrashReport} from './telemetry-core';
const crashUrl=optionalHttps(process.env.EXPO_PUBLIC_CRASH_REPORT_URL),analyticsUrl=optionalHttps(process.env.EXPO_PUBLIC_ANALYTICS_URL);
export const telemetryEnabled={crash:!!crashUrl,analytics:!!analyticsUrl};
let installed=false,sent=0;
function post(url:string,body:unknown){if(sent>=30)return;sent++;void fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error'}).catch(()=>{});}
export function reportError(error:unknown,kind:CrashReport['kind']='render_error',fatal=false){if(!crashUrl)return;try{post(crashUrl,crashReport(kind,error,{fatal,version:appVersion,build:appBuild,platform:Platform.OS}));}catch{/* never let reporting crash the app */}}
export function track(name:string,props?:Record<string,unknown>){if(!analyticsUrl)return;const event=analyticsEvent(name,props);if(event)post(analyticsUrl,{...event,version:appVersion,platform:Platform.OS,at:new Date().toISOString()});}
type ErrorUtilsShape={getGlobalHandler():(e:unknown,fatal?:boolean)=>void;setGlobalHandler(h:(e:unknown,fatal?:boolean)=>void):void};
/** Chains onto React Native's global handler (keeps the default red-box/crash behaviour) and tracks unhandled rejections in release builds. */
export function installTelemetry(){if(installed||!crashUrl)return;installed=true;
 const utils=(globalThis as {ErrorUtils?:ErrorUtilsShape}).ErrorUtils;
 if(utils){const previous=utils.getGlobalHandler();utils.setGlobalHandler((e,fatal)=>{reportError(e,'crash',!!fatal);previous(e,fatal);});}
 const hermes=(globalThis as {HermesInternal?:{enablePromiseRejectionTracker?:(o:{allRejections:boolean;onUnhandled:(id:number,e:unknown)=>void})=>void}}).HermesInternal;
 if(!__DEV__&&hermes?.enablePromiseRejectionTracker)hermes.enablePromiseRejectionTracker({allRejections:true,onUnhandled:(_id,e)=>reportError(e,'unhandled_rejection')});
}
