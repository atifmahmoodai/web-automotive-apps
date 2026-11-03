// Carbook release build settings for Android, applied on every `expo prebuild`.
// - Slim, arm64-only Hermes build with R8 minify + resource shrinking (overridable via env).
// - Release signing from environment variables. Keystores and passwords are never committed;
//   when the variables are absent the release build falls back to the debug key and is NOT
//   suitable for Play upload (Gradle prints a warning).
const {withGradleProperties, withAppBuildGradle} = require('@expo/config-plugins');

const PROPS = {
  'org.gradle.jvmargs': '-Xmx3072m -XX:MaxMetaspaceSize=768m',
  'org.gradle.workers.max': '3',
  reactNativeArchitectures: process.env.CARBOOK_ANDROID_ABIS || 'arm64-v8a',
  hermesEnabled: 'true',
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
  'expo.useLegacyPackaging': 'true',
};

const MARKER = '// carbook-release-signing';
const SIGNING = `
    ${MARKER}
    def carbookStoreFile = System.getenv('CARBOOK_UPLOAD_STORE_FILE')
    def carbookHasUploadKey = carbookStoreFile && System.getenv('CARBOOK_UPLOAD_STORE_PASSWORD') && System.getenv('CARBOOK_UPLOAD_KEY_ALIAS') && System.getenv('CARBOOK_UPLOAD_KEY_PASSWORD')
    if (carbookHasUploadKey) {
        signingConfigs.create('carbookUpload') {
            storeFile file(carbookStoreFile)
            storePassword System.getenv('CARBOOK_UPLOAD_STORE_PASSWORD')
            keyAlias System.getenv('CARBOOK_UPLOAD_KEY_ALIAS')
            keyPassword System.getenv('CARBOOK_UPLOAD_KEY_PASSWORD')
        }
        buildTypes.release.signingConfig signingConfigs.carbookUpload
    } else {
        logger.warn('Carbook: CARBOOK_UPLOAD_* not set; release APK is signed with the DEBUG key (sideload/testing only).')
    }
`;

module.exports = function withAndroidRelease(config) {
  config = withGradleProperties(config, cfg => {
    for (const [key, value] of Object.entries(PROPS)) {
      const existing = cfg.modResults.find(item => item.type === 'property' && item.key === key);
      if (existing) existing.value = value;
      else cfg.modResults.push({type: 'property', key, value});
    }
    return cfg;
  });
  return withAppBuildGradle(config, cfg => {
    if (cfg.modResults.language !== 'groovy') throw new Error('with-android-release expects a Groovy app/build.gradle');
    let src = cfg.modResults.contents;
    if (!src.includes(MARKER)) {
      // Append inside the android { } block, after buildTypes has been declared.
      const anchor = /\n    packagingOptions \{/;
      if (!anchor.test(src)) throw new Error('with-android-release: could not find packagingOptions in app/build.gradle');
      src = src.replace(anchor, `${SIGNING}\n    packagingOptions {`);
    }
    cfg.modResults.contents = src;
    return cfg;
  });
};
