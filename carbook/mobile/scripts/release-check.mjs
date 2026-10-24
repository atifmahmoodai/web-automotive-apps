import {existsSync,readFileSync} from 'node:fs';
if(existsSync('.env'))process.loadEnvFile('.env');
const required=['EXPO_PUBLIC_API_URL','EXPO_PUBLIC_OIDC_ISSUER','EXPO_PUBLIC_OIDC_CLIENT_ID','EXPO_PUBLIC_OIDC_AUDIENCE','EXPO_PUBLIC_SUPPORT_URL','EXPO_PUBLIC_PRIVACY_URL','EXPO_PUBLIC_TERMS_URL','EAS_PROJECT_ID'];
const release=process.env.CARBOOK_BUILD_CHANNEL==='production'||process.argv.includes('--production');
const errors=[];
for(const name of required){const value=process.env[name]?.trim();if(!value){errors.push(name+' is missing');continue;}if(name.endsWith('_URL')||name.endsWith('_ISSUER')){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.hostname.endsWith('.invalid')||u.hostname==='example.com'||u.hostname==='localhost'||u.hostname.endsWith('.chatgpt.site'))throw new Error();}catch{errors.push(name+' must be a configured HTTPS service URL');}}}
if(process.env.EAS_PROJECT_ID&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(process.env.EAS_PROJECT_ID))errors.push('EAS_PROJECT_ID must be the UUID returned by eas init');
if(!existsSync('package-lock.json'))errors.push('Run npm run setup and commit package-lock.json');
const pkg=JSON.parse(readFileSync('package.json','utf8'));for(const key of ['react','react-native','expo-router'])if(!pkg.dependencies[key])errors.push('Run npm run setup to resolve '+key);
if(errors.length){console.error('Release configuration incomplete:\n- '+errors.join('\n- '));if(release)process.exit(1);}else console.log('Release configuration is present. Device acceptance and store review are still required.');
