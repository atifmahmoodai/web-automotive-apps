import {spawnSync} from 'node:child_process';
// Expo selects the React, React Native and native-module versions for this SDK.
// Run once on a network-enabled development machine, then commit the generated lockfile.
const packages=['react','react-native','expo-router','expo-linking','expo-constants','expo-status-bar','expo-splash-screen','expo-dev-client','expo-auth-session','expo-web-browser','expo-crypto','expo-secure-store','expo-image','expo-image-picker','expo-image-manipulator','expo-video','expo-haptics','expo-file-system','expo-sharing','react-native-safe-area-context','react-native-screens','react-native-gesture-handler','react-native-reanimated','react-native-worklets','react-native-svg','react-dom','react-native-web'];
for(const args of [['install'],['exec','--','expo','install',...packages],['exec','--','expo','install','--fix']]){
 const r=spawnSync('npm',args,{stdio:'inherit',shell:process.platform==='win32'});if(r.status!==0)process.exit(r.status||1);
}
