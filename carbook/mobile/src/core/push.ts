import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import type {CarbookClient} from './client';
import {readPref,writePref} from './prefs';
// Remote push needs an EAS project ID (EAS_PROJECT_ID at build time). Local reminders work without it.
export const projectId=():string|null=>{const id=(Constants.expoConfig?.extra as {eas?:{projectId?:string}}|undefined)?.eas?.projectId||Constants.easConfig?.projectId;return id&&/^[0-9a-f-]{36}$/i.test(id)?id:null};
let configured=false;
export async function setupNotifications(){if(configured)return;configured=true;
 Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('default',{name:'Carbook',importance:Notifications.AndroidImportance.DEFAULT}).catch(()=>{});}
export async function permissionStatus(){try{return (await Notifications.getPermissionsAsync()).status}catch{return 'undetermined'}}
export async function askPermission(){await setupNotifications();const current=await Notifications.getPermissionsAsync();if(current.status==='granted')return true;if(!current.canAskAgain)return false;return (await Notifications.requestPermissionsAsync()).status==='granted';}
export type PushResult={ok:true;token:string}|{ok:false;reason:string};
export async function enablePush(client:CarbookClient):Promise<PushResult>{if(!(await askPermission()))return {ok:false,reason:'Notifications are blocked. Allow them for Carbook in system settings.'};
 const id=projectId();if(!id)return {ok:false,reason:'Remote push is not set up for this build (missing EAS project ID). Local garage reminders still work.'};
 try{const {data:token}=await Notifications.getExpoPushTokenAsync({projectId:id});await client.request('/api/push/register',{method:'POST',body:JSON.stringify({token,platform:Platform.OS==='ios'?'ios':'android'})});await writePref('push',token);return {ok:true,token};}
 catch(e){return {ok:false,reason:e instanceof Error&&e.message.length<160?e.message:'Could not register this device for push.'}}}
export async function disablePush(client:CarbookClient){const token=await readPref('push');await writePref('push','off');if(token&&token!=='off')await client.request('/api/push/unregister',{method:'POST',body:JSON.stringify({token})}).catch(()=>{});}
/** Sign-out: remove this device's token from the account (while the session is still valid) and forget the opt-in so the next member on this device starts with push off. */
export async function disablePushForSignOut(client:CarbookClient){const token=await readPref('push');await writePref('push',null);await clearGarageReminders();if(token&&token!=='off')await client.request('/api/push/unregister',{method:'POST',body:JSON.stringify({token})},5000).catch(()=>{});}
/** Re-register silently on launch when the member opted in earlier and permission is still granted. */
export async function syncPush(client:CarbookClient){const pref=await readPref('push');if(!pref||pref==='off')return;if(await permissionStatus()!=='granted')return;await enablePush(client).catch(()=>{});}
export async function pushEnabled(){const p=await readPref('push');return !!p&&p!=='off'}
export async function scheduleLocal(items:{id:string;at:number;title:string;body:string;route:string}[],prefix:string){await setupNotifications();
 const existing=await Notifications.getAllScheduledNotificationsAsync().catch(()=>[] as Notifications.NotificationRequest[]),want=new Set(items.map(i=>i.id));
 for(const n of existing)if(n.identifier.startsWith(prefix)&&!want.has(n.identifier))await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(()=>{});
 if((await permissionStatus())!=='granted')return 0;let count=0;
 for(const i of items){await Notifications.scheduleNotificationAsync({identifier:i.id,content:{title:i.title,body:i.body,data:{route:i.route}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(i.at),channelId:'default'}}).then(()=>count++).catch(()=>{})}return count;}

/** Private vehicle names and document titles must not appear after the account signs out. */
export async function clearGarageReminders(){
 const scheduled=await Notifications.getAllScheduledNotificationsAsync().catch(()=>[] as Notifications.NotificationRequest[]);
 await Promise.all(scheduled.filter(n=>n.identifier.startsWith('garage-')).map(n=>Notifications.cancelScheduledNotificationAsync(n.identifier).catch(()=>{})));
 const delivered=await Notifications.getPresentedNotificationsAsync().catch(()=>[] as Notifications.Notification[]);
 await Promise.all(delivered.filter(n=>n.request.identifier.startsWith('garage-')).map(n=>Notifications.dismissNotificationAsync(n.request.identifier).catch(()=>{})));
}
