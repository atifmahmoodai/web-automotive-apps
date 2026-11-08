import Constants from 'expo-constants';
import {Platform} from 'react-native';
const cfg=Constants.expoConfig;
export const appVersion:string=cfg?.version||'0.0.0';
export const appBuild:string=String(Platform.OS==='ios'?cfg?.ios?.buildNumber||'':cfg?.android?.versionCode||'');
export const appLabel=`${appVersion}${appBuild?` (${appBuild})`:''}`;
