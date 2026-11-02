import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import {useColorScheme,View} from 'react-native';
import {applyScheme,colors,type Scheme} from '../components/theme';
import {readPref,writePref,parseThemeMode,type ThemeMode} from './prefs';
type Theme={mode:ThemeMode;scheme:Scheme;ready:boolean;setMode:(mode:ThemeMode)=>void};
const ThemeContext=createContext<Theme>({mode:'system',scheme:'light',ready:false,setMode:()=>{}});
export const resolveScheme=(mode:ThemeMode,system:string|null|undefined):Scheme=>mode==='system'?(system==='dark'?'dark':'light'):mode;
export function ThemeProvider({children}:{children:React.ReactNode}){const system=useColorScheme(),[mode,setModeState]=useState<ThemeMode>('system'),[ready,setReady]=useState(false);
 useEffect(()=>{let alive=true;void readPref('theme').then(v=>{if(alive){setModeState(parseThemeMode(v));setReady(true)}});return ()=>{alive=false}},[]);
 const scheme=resolveScheme(mode,system);applyScheme(scheme);
 const value=useMemo(()=>({mode,scheme,ready,setMode:(next:ThemeMode)=>{setModeState(next);void writePref('theme',next)}}),[mode,scheme,ready]);
 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;}
// Remounting by scheme guarantees every inline style re-reads the live palette; placed below auth/store so sessions are kept.
export function ThemeBoundary({children}:{children:React.ReactNode}){const {scheme}=useTheme();return <View key={scheme} style={{flex:1,backgroundColor:colors.paper}}>{children}</View>}
export const useTheme=()=>useContext(ThemeContext);
