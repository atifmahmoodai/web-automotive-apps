import {Alert,Linking} from 'react-native';
import {safeExternalUrl} from './urls';
/** Opens an http(s) link outside the app. Rejects other schemes and never throws into the caller. */
export async function openExternal(value:unknown,label='link'){
 const url=safeExternalUrl(value);
 if(!url){Alert.alert('Can’t open this '+label,'Only web links starting with http:// or https:// can be opened.');return false;}
 try{await Linking.openURL(url);return true;}catch{Alert.alert('Can’t open this '+label,'No app on this device could open it. Try again later.');return false;}
}
