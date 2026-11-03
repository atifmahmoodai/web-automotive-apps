// Last-known account snapshot so Carbook opens offline. Stored in the app's private documents
// directory (excluded from Android backup via allowBackup=false) and wiped on sign-out.
import {File,Paths} from 'expo-file-system';
import type {State} from './types';
import {parseSnapshot,type Snapshot} from './snapshot';
export type {Snapshot};
const file=()=>new File(Paths.document,'carbook-snapshot-v1.json');
export async function loadSnapshot():Promise<Snapshot|null>{try{const f=file();if(!f.exists)return null;return parseSnapshot(await f.text());}catch{return null;}}
export async function saveSnapshot(data:State){try{await file().write(JSON.stringify({savedAt:Date.now(),data}));}catch{/* cache is best-effort */}}
export function clearSnapshot(){try{const f=file();if(f.exists)f.delete();}catch{/* ignore */}}
