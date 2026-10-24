'use client';
import {createContext,useContext} from 'react';
import type {State,Profile} from '../lib/types';
export type View='feed'|'friends'|'messages'|'groups'|'events'|'marketplace'|'pages'|'garage'|'saved'|'profile'|'settings'|'admin'|'search';
export type ModalSpec={type:string;id?:string;entity?:string;record?:any}|null;
export type AppContextType={data:State;me:Profile;authenticated:boolean;busy:boolean;loading:boolean;revision:number;act:(payload:Record<string,unknown>,message?:string)=>Promise<any>;request:(resource:string,params?:Record<string,string>)=>Promise<any>;quiet:(payload:Record<string,unknown>)=>Promise<any>;open:(modal:ModalSpec)=>void;go:(view:View,id?:string)=>void;toast:(message:string)=>void;refresh:()=>Promise<void>};
export const AppContext=createContext<AppContextType>(null!);
export const useApp=()=>useContext(AppContext);
