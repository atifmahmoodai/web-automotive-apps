import {createRequire} from 'node:module';
import {mkdirSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const mobile=resolve(dirname(fileURLToPath(import.meta.url)),'..'),root=resolve(mobile,'..'),require=createRequire(import.meta.url);
let esbuild;try{esbuild=require('esbuild')}catch{esbuild=require('../../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild')}
process.chdir(root);mkdirSync('.sites-runtime/mobile-checks',{recursive:true});
const platform={name:'test-platform',setup(build){build.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'test'}));build.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const env=new Proxy({}, {get:(_,key)=>globalThis.__testEnv?.[key]});',loader:'js'}));}};
for(const name of ['core','identity','api']){const entry=`mobile/tests/${name}.test.ts`,outfile=`.sites-runtime/mobile-checks/${name}.mjs`;await esbuild.build({absWorkingDir:root,entryPoints:[entry],outfile,bundle:true,platform:'node',format:'esm',target:'node22',tsconfig:'tsconfig.json',plugins:[platform],logLevel:'warning'});await import(pathToFileURL(resolve(outfile)).href+'?v='+Date.now());}
function walk(path){return readdirSync(path,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(path,e.name)):/\.(tsx?|jsx?)$/.test(e.name)?[resolve(path,e.name)]:[])}
const routes=walk(resolve(mobile,'app'));
await esbuild.build({absWorkingDir:root,stdin:{contents:routes.map(p=>'import '+JSON.stringify(p)+';').join('\n'),resolveDir:root,loader:'tsx'},outfile:'.sites-runtime/mobile-checks/syntax.js',bundle:true,write:false,platform:'neutral',packages:'external',format:'esm',target:'es2022',jsx:'automatic',tsconfig:'tsconfig.json',loader:{'.jpg':'dataurl','.png':'dataurl'},treeShaking:false,logLevel:'warning'});
console.log(`Syntax and local import graph passed for ${routes.length} native routes. External SDK APIs are not typechecked by this check.`);
