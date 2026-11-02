import * as SecureStore from 'expo-secure-store';
// Small non-secret device preferences (theme, onboarding). Secure store is used only because it is already bundled.
export type ThemeMode='system'|'light'|'dark';
const KEYS={theme:'carbook.pref.theme',onboarded:'carbook.pref.onboarded',push:'carbook.pref.push'} as const;
export async function readPref(key:keyof typeof KEYS){try{return await SecureStore.getItemAsync(KEYS[key])}catch{return null}}
export async function writePref(key:keyof typeof KEYS,value:string|null){try{value==null?await SecureStore.deleteItemAsync(KEYS[key]):await SecureStore.setItemAsync(KEYS[key],value)}catch{/* preference only */}}
export const parseThemeMode=(v:string|null):ThemeMode=>v==='light'||v==='dark'?v:'system';
