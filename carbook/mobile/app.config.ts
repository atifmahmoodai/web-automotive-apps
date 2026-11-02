import type {ExpoConfig,ConfigContext} from 'expo/config';
export default ({config}:ConfigContext):ExpoConfig=>({
 ...config,name:'Carbook',slug:'carbook-mobile',scheme:'com.analysight.carbook',version:'0.1.0',orientation:'default',userInterfaceStyle:'light',
 icon:'./assets/icon.png',
 ios:{supportsTablet:true,bundleIdentifier:'com.analysight.carbook',infoPlist:{ITSAppUsesNonExemptEncryption:false,NSCameraUsageDescription:'Take photos to share in your Carbook posts and garage.',NSPhotoLibraryUsageDescription:'Choose photos and videos to share with your Carbook community.'}},
 android:{package:'com.analysight.carbook',adaptiveIcon:{foregroundImage:'./assets/adaptive-icon.png',backgroundColor:'#183E31'},blockedPermissions:['android.permission.RECORD_AUDIO','android.permission.ACCESS_FINE_LOCATION','android.permission.ACCESS_COARSE_LOCATION']},
 plugins:['expo-router','expo-status-bar','expo-image','expo-video','expo-sharing','expo-secure-store','expo-web-browser',['expo-splash-screen',{image:'./assets/splash-icon.png',imageWidth:140,backgroundColor:'#F7F8F4'}],['expo-image-picker',{photosPermission:'Choose photos and videos for your posts, stories and garage.',cameraPermission:'Take a photo for your Carbook community.',microphonePermission:false}]],
 experiments:{typedRoutes:true},
 extra:{eas:process.env.EAS_PROJECT_ID?{projectId:process.env.EAS_PROJECT_ID}:undefined},
 web:{bundler:'metro',output:'static',favicon:'./assets/favicon.png'}
});
