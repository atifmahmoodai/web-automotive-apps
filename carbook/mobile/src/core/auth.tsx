import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import {AppState} from 'react-native';
import {getConfig,configurationError} from './config';
import {RefreshVault} from './vault';
import {ApiError} from './client';
import {clearSnapshot} from './cache';
WebBrowser.maybeCompleteAuthSession();
const vault=new RefreshVault({getItemAsync:SecureStore.getItemAsync,setItemAsync:(k,v)=>SecureStore.setItemAsync(k,v,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),deleteItemAsync:SecureStore.deleteItemAsync});
type Session={accessToken:string;expiresAt:number};
type SignOutHook=()=>Promise<unknown>|unknown;
const signOutHooks=new Set<SignOutHook>();
/** Register cleanup that must run while the session is still valid (e.g. unregistering this device's push token). */
export function onSignOut(hook:SignOutHook){signOutHooks.add(hook);return()=>{signOutHooks.delete(hook)};}
async function runSignOutHooks(){const all=[...signOutHooks].map(h=>Promise.resolve().then(h).catch(()=>{}));await Promise.race([Promise.all(all),new Promise(r=>setTimeout(r,4000))]);}
type Auth={status:'loading'|'signedOut'|'signedIn';error:string|null;busy:boolean;accessToken:string;signIn:()=>Promise<void>;signOut:()=>Promise<void>;token:(options?:{force?:boolean})=>Promise<string>};
const Context=createContext<Auth|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){
 const [status,setStatus]=useState<Auth['status']>('loading'),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[accessToken,setAccessToken]=useState('');
 const session=useRef<Session|null>(null),refreshInFlight=useRef<Promise<string>|null>(null),generation=useRef(0),signingIn=useRef(false);
 async function accept(response:AuthSession.TokenResponse,epoch:number){
  if(epoch!==generation.current)throw new Error('Session changed.');if(!response.accessToken)throw new Error('The identity provider did not return an access token.');
  if(response.refreshToken)await vault.write(response.refreshToken);
  if(epoch!==generation.current)throw new Error('Session changed.');
  session.current={accessToken:response.accessToken,expiresAt:Date.now()+(response.expiresIn||300)*1000};setAccessToken(response.accessToken);setStatus('signedIn');setError(null);return response.accessToken;
 }
 function endSession(message:string|null){vaultSafeClear();session.current=null;setAccessToken('');setStatus('signedOut');setError(message);clearSnapshot();}
 function vaultSafeClear(){void vault.clear().catch(()=>{});}
 async function token(options?:{force?:boolean}){
  if(!options?.force&&session.current&&session.current.expiresAt>Date.now()+60000)return session.current.accessToken;
  if(refreshInFlight.current)return refreshInFlight.current;
  const epoch=generation.current;
  const promise=(async()=>{const refreshToken=await vault.read();if(!refreshToken){if(epoch===generation.current)endSession('Your session ended. Sign in again to continue.');throw new ApiError('Your session ended. Sign in again to continue.',401);}const cfg=getConfig(),discovery=await AuthSession.fetchDiscoveryAsync(cfg.issuer);
   try{return await accept(await AuthSession.refreshAsync({clientId:cfg.clientId,refreshToken},discovery),epoch);}catch(e){const code=(e as {code?:string;errorCode?:string}).code||(e as {errorCode?:string}).errorCode;if(code==='invalid_grant'&&epoch===generation.current){endSession('Your session expired. Sign in again to continue.');throw new ApiError('Your session expired. Sign in again to continue.',401);}throw e;}
  })();refreshInFlight.current=promise;try{return await promise}finally{if(refreshInFlight.current===promise)refreshInFlight.current=null}
 }
 async function signIn(){if(signingIn.current)return;signingIn.current=true;setBusy(true);setError(null);const epoch=++generation.current;refreshInFlight.current=null;
  try{const cfg=getConfig(),discovery=await AuthSession.fetchDiscoveryAsync(cfg.issuer),redirectUri=AuthSession.makeRedirectUri({scheme:'com.analysight.carbook',path:'auth/callback'});
   const request=new AuthSession.AuthRequest({clientId:cfg.clientId,redirectUri,responseType:AuthSession.ResponseType.Code,usePKCE:true,scopes:['openid','profile','email','offline_access','carbook'],extraParams:{audience:cfg.audience,prompt:'select_account'}});
   const result=await request.promptAsync(discovery);if(result.type==='cancel'||result.type==='dismiss')return;if(result.type!=='success'||!result.params.code||!request.codeVerifier)throw new Error('Sign-in was not completed. Please try again.');
   await vault.clear();await accept(await AuthSession.exchangeCodeAsync({clientId:cfg.clientId,code:result.params.code,redirectUri,extraParams:{code_verifier:request.codeVerifier}},discovery),epoch);
  }catch(e){setError(e instanceof Error?e.message:'Sign-in could not be completed.');}finally{signingIn.current=false;setBusy(false);}
 }
 async function signOut(){if(session.current)await runSignOutHooks();clearSnapshot();generation.current++;refreshInFlight.current=null;session.current=null;setAccessToken('');setStatus('signedOut');setError(null);signingIn.current=true;setBusy(true);let old:string|null=null;try{old=await vault.take();}catch{setError('Secure session cleanup failed. Reopen Carbook and sign out again.');}finally{signingIn.current=false;setBusy(false);}if(old){const revoked=old;void(async()=>{try{const c=getConfig(),d=await AuthSession.fetchDiscoveryAsync(c.issuer);if(d.revocationEndpoint)await AuthSession.revokeAsync({clientId:c.clientId,token:revoked,tokenTypeHint:AuthSession.TokenTypeHint.RefreshToken},d);}catch{/* Local sign-out is complete even if provider revocation is offline. */}})();}}

 // Launch: a saved refresh token keeps the member signed in even when offline. The store then shows the
 // last saved snapshot and retries; only a rejected/missing refresh token returns to the sign-in screen.
 useEffect(()=>{let alive=true;(async()=>{if(configurationError()){setStatus('signedOut');return;}let saved:string|null=null;try{saved=await vault.read();}catch{saved=null;}if(!saved){if(alive)setStatus('signedOut');return;}try{await token();}catch(e){if(!alive)return;if(e instanceof ApiError&&e.status===401)return;/* endSession already ran */setStatus('signedIn');setError('You’re offline. Showing saved data until Carbook can reconnect.');}})();return()=>{alive=false}},[]);
 useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state==='active'&&session.current)void token().catch(()=>setError('Reconnect to refresh your session.'));});return()=>listener.remove()},[]);
 return <Context.Provider value={{status,error,busy,accessToken,signIn,signOut,token}}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider is required');return value;}
