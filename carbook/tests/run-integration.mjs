import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);
const esbuild=require('../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild');
mkdirSync('.sites-runtime/tests',{recursive:true});
await esbuild.build({entryPoints:['tests/integration-entry.ts'],outfile:'.sites-runtime/tests/routes.mjs',bundle:true,platform:'node',format:'esm',target:'node22',plugins:[{name:'test-platform-boundaries',setup(build){
 build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'cloudflare',namespace:'test'}));
 build.onResolve({filter:/(^|\/)chatgpt-auth$/},()=>({path:'identity',namespace:'test'}));
 build.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='cloudflare'?'export const env=new Proxy({}, {get:(_,key)=>globalThis.__testEnv?.[key]});':'export async function getChatGPTUser(){return globalThis.__testUser||null}',loader:'js'}));
}}]});
await import(pathToFileURL(process.cwd()+'/.sites-runtime/tests/routes.mjs').href);
