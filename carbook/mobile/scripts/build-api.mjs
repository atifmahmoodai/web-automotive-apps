import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url);
let esbuild;try{esbuild=require('esbuild')}catch{esbuild=require('../../node_modules/.pnpm/esbuild@0.28.0/node_modules/esbuild')}
mkdirSync('service/dist',{recursive:true});
await esbuild.build({entryPoints:['service/worker.ts'],outfile:'service/dist/worker.js',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers'],minify:false,tsconfig:'service/tsconfig.json',conditions:['workerd','worker','browser'],logLevel:'info'});
