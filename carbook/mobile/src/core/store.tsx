import React,{createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {CarbookClient,mergeById} from './client';
import {getConfig} from './config';
import {useAuth,onSignOut} from './auth';
import {clearSnapshot,loadSnapshot,saveSnapshot} from './cache';
import {appVersion} from './app-info';
import {disablePushForSignOut} from './push';
import type {State,Profile,FeedResult} from './types';
type Store={data:State|null;me:Profile|null;loading:boolean;error:string|null;/** When set, data came from the offline snapshot or the last refresh failed. */staleSince:number|null;refresh:()=>Promise<void>;act:<T={ok:boolean;id?:string}>(payload:unknown)=>Promise<T>;client:CarbookClient;mergeFeed:(result:FeedResult)=>void};
const Context=createContext<Store|null>(null);
export function StoreProvider({children}:{children:React.ReactNode}){
 const auth=useAuth(),[data,setData]=useState<State|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null),[staleSince,setStaleSince]=useState<number|null>(null),loadedAt=useRef(0),epoch=useRef(0),refreshInFlight=useRef<Promise<void>|null>(null),authRef=useRef(auth);authRef.current=auth;
 const client=useMemo(()=>new CarbookClient(getConfig().apiUrl,options=>authRef.current.token(options),fetch,{version:appVersion}),[]);
 async function refresh(){if(refreshInFlight.current)return refreshInFlight.current;const e=epoch.current;setLoading(true);const promise=(async()=>{try{const result=await client.request<State>('/api/state');if(e===epoch.current){setData(result);setError(null);setStaleSince(null);loadedAt.current=Date.now();void saveSnapshot(result);}}catch(x){if(e===epoch.current){setError(x instanceof Error?x.message:'Unable to load Carbook.');setStaleSince(prev=>prev??(loadedAt.current||null));}throw x;}finally{if(e===epoch.current)setLoading(false);}})();refreshInFlight.current=promise;try{await promise}finally{if(refreshInFlight.current===promise)refreshInFlight.current=null}}
 async function act<T>(payload:unknown):Promise<T>{const result=await client.action<T>(payload);try{await refresh()}catch{/* Preserve the successful write outcome; the refresh banner offers recovery. */}return result;}
 useEffect(()=>{const startEpoch=epoch.current;void loadSnapshot().then(snap=>{if(snap&&epoch.current===startEpoch&&!loadedAt.current){setData(prev=>prev??snap.data);setStaleSince(prev=>prev??snap.savedAt);}});const unhook=onSignOut(()=>disablePushForSignOut(client));void refresh().catch(()=>{});const listener=AppState.addEventListener('change',s=>{if(s==='active')void refresh().catch(()=>{});});const timer=setInterval(()=>{if(AppState.currentState==='active')void client.read<Pick<State,'notifications'|'friendships'|'conversations'|'profiles'>>('updates').then(update=>setData(previous=>previous?{...previous,...update,profiles:mergeById(previous.profiles,update.profiles)}:previous)).catch(()=>{});},20000);return()=>{epoch.current++;unhook();if(authRef.current.status!=='signedIn')clearSnapshot();clearInterval(timer);listener.remove();setData(null)}},[]);
 function mergeFeed(result:FeedResult){setData(d=>d?{...d,profiles:mergeById(d.profiles,result.profiles),comments:mergeById(d.comments,result.comments),posts:mergeById(d.posts,result.posts)}:d)}
 return <Context.Provider value={{data,me:data?.profiles.find(p=>p.id===data.userId)||null,loading,error,staleSince,refresh,act,client,mergeFeed}}>{children}</Context.Provider>;
}
export function useCarbook(){const store=useContext(Context);if(!store)throw new Error('StoreProvider is required');return store;}
