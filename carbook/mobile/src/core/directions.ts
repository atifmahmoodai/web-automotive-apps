import {Linking,Platform} from 'react-native';
import {directionsUrls} from './geo';
/** Hand off to the phone's maps app; falls back to a keyless OpenStreetMap web route. */
export async function openDirections(lat:number,lng:number,label:string){for(const url of directionsUrls(lat,lng,label,Platform.OS)){try{if(url.startsWith('https:')||await Linking.canOpenURL(url)){await Linking.openURL(url);return true}}catch{/* try the next handler */}}return false}
