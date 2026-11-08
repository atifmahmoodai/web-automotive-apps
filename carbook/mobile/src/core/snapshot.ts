import type {State} from './types';
export type Snapshot={savedAt:number;data:State};
/** Snapshots older than this are ignored so a long-offline device never shows very stale content. */
export const SNAPSHOT_MAX_AGE=14*86400000;
const MAX_AGE=SNAPSHOT_MAX_AGE;
const ARRAY_FIELDS=['moderation','profiles','posts','comments','cars','following','memberships','rsvps','notifications','blocked','friendships','circles','events','stories','listings','pages','conversations','reports','audit'] as const;
export function parseSnapshot(text:string,now=Date.now()):Snapshot|null{
 try{const v=JSON.parse(text) as Partial<Snapshot>;if(!v||typeof v.savedAt!=='number'||!v.data||typeof v.data!=='object'||typeof (v.data as State).userId!=='string'||!ARRAY_FIELDS.every(k=>Array.isArray((v.data as State)[k])))return null;if(now-v.savedAt>MAX_AGE||v.savedAt>now+60000)return null;return v as Snapshot;}catch{return null;}
}
