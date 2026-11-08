export type MobileConfig={apiUrl:string;issuer:string;clientId:string;audience:string;supportUrl:string;privacyUrl:string;termsUrl:string};
export function secureOrigin(value:string,label:string){
 const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search)throw new Error(`${label} must use HTTPS without credentials or query parameters.`);
 if(url.hostname==='localhost'||url.hostname.endsWith('.invalid'))throw new Error(`${label} is not configured.`);
 return url.toString().replace(/\/$/,'');
}
export function validateConfig(config:MobileConfig){
 const missing=Object.entries(config).filter(([,v])=>!v.trim()).map(([k])=>k);
 if(missing.length)throw new Error('Carbook mobile service is not connected yet.');
 const apiUrl=secureOrigin(config.apiUrl,'API');if(new URL(apiUrl).hostname.endsWith('.chatgpt.site'))throw new Error('The website login cannot be used as the native API. Configure the mobile service.');
 return {...config,apiUrl,issuer:secureOrigin(config.issuer,'Identity provider')+(config.issuer.endsWith('/')?'/':''),supportUrl:secureOrigin(config.supportUrl,'Support'),privacyUrl:secureOrigin(config.privacyUrl,'Privacy'),termsUrl:secureOrigin(config.termsUrl,'Terms')};
}
export const rawConfig:MobileConfig={apiUrl:process.env.EXPO_PUBLIC_API_URL||'',issuer:process.env.EXPO_PUBLIC_OIDC_ISSUER||'',clientId:process.env.EXPO_PUBLIC_OIDC_CLIENT_ID||'',audience:process.env.EXPO_PUBLIC_OIDC_AUDIENCE||'',supportUrl:process.env.EXPO_PUBLIC_SUPPORT_URL||'',privacyUrl:process.env.EXPO_PUBLIC_PRIVACY_URL||'',termsUrl:process.env.EXPO_PUBLIC_TERMS_URL||''};
export function getConfig(){return validateConfig(rawConfig)}
export function configurationError(){try{getConfig();return null}catch(e){return e instanceof Error?e.message:'Service configuration is unavailable.'}}
/** Public Carbook website (account linking, web-only tools). Override with EXPO_PUBLIC_WEB_URL. */
export const WEBSITE_URL=(()=>{try{const u=new URL(process.env.EXPO_PUBLIC_WEB_URL||'https://astra-webapp-carbook.atifmahmood131.chatgpt.site');return u.protocol==='https:'?u.origin:null;}catch{return null;}})();
export function websiteUrl(view?:string){return WEBSITE_URL?WEBSITE_URL+'/'+(view?'?view='+encodeURIComponent(view):''):null;}
