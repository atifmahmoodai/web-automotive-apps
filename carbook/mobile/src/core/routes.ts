// Only these in-app routes may be opened from a notification payload.
export function notificationRoute(value:unknown){if(typeof value!=='string')return null;
 if(value==='/notifications'||value==='/garage')return value;
 return /^\/(post|chat|member|garage)\/[A-Za-z0-9-]{1,160}$/.test(value)?value:null;}
