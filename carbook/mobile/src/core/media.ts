import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
export async function selectMedia(camera=false,allowVideo=false){
 if(camera){const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted)throw new Error('Camera access is off. You can enable it in device settings or choose a photo.');}
 const options:ImagePicker.ImagePickerOptions={mediaTypes:allowVideo?['images','videos']:['images'],quality:.85,allowsMultipleSelection:false,videoMaxDuration:60};
 const result=camera?await ImagePicker.launchCameraAsync({...options,mediaTypes:['images']}):await ImagePicker.launchImageLibraryAsync(options);
 if(result.canceled||!result.assets[0])return null;const asset=result.assets[0];
 if(asset.type==='video'){if(!['video/mp4','video/webm'].includes(asset.mimeType||''))throw new Error('Choose an MP4 or WebM video. Export other formats as MP4 first.');if(!asset.fileSize||asset.fileSize>20*1024*1024)throw new Error('Choose a video under 20 MB.');return {uri:asset.uri,mimeType:asset.mimeType!,name:asset.fileName||'video.mp4',type:'video' as const};}
 const width=Math.min(asset.width||1600,1600);const image=await ImageManipulator.manipulateAsync(asset.uri,[{resize:{width}}],{compress:.85,format:ImageManipulator.SaveFormat.JPEG});return {uri:image.uri,mimeType:'image/jpeg',name:'carbook-photo.jpg',type:'image' as const};
}
