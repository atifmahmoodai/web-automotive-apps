import type {ExpoConfig,ConfigContext} from 'expo/config';
export default ({config}:ConfigContext):ExpoConfig=>({
 ...config,name:'Carbook',slug:'carbook-mobile',scheme:'com.analysight.carbook',version:'0.3.1',orientation:'default',userInterfaceStyle:'automatic',
 icon:'./assets/icon.png',
 ios:{supportsTablet:true,bundleIdentifier:'com.analysight.carbook',infoPlist:{ITSAppUsesNonExemptEncryption:false,NSCameraUsageDescription:'Take photos to share in your Carbook posts and garage.',NSPhotoLibraryUsageDescription:'Choose photos and videos to share with your Carbook community.'}},
 android:{package:'com.analysight.carbook',versionCode:4,allowBackup:false,adaptiveIcon:{foregroundImage:'./assets/adaptive-icon.png',backgroundColor:'#183E31'},blockedPermissions:['android.permission.SYSTEM_ALERT_WINDOW','android.permission.RECORD_AUDIO','android.permission.ACCESS_FINE_LOCATION','android.permission.ACCESS_COARSE_LOCATION']},
 plugins:['expo-router','expo-status-bar','expo-image','expo-video','expo-sharing','expo-secure-store','expo-web-browser',['expo-notifications',{color:'#183E31'}],['expo-splash-screen',{image:'./assets/splash-icon.png',imageWidth:140,backgroundColor:'#F7F8F4',dark:{image:'./assets/splash-icon.png',backgroundColor:'#0D1411'}}],['expo-image-picker',{photosPermission:'Choose photos and videos for your posts, stories and garage.',cameraPermission:'Take a photo for your Carbook community.',microphonePermission:false}],'./plugins/with-android-release'],
 experiments:{typedRoutes:true},
 extra:{eas:process.env.EAS_PROJECT_ID?{projectId:process.env.EAS_PROJECT_ID}:undefined},
 web:{bundler:'metro',output:'static',favicon:'./assets/favicon.png'}
});
