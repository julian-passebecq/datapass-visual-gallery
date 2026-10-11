import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

// Alternate packaging of the canonical React/Vite and Worker source when an
// authenticated integration has Worker-script uploads but no assets JWT header.
// This is generated only from dist/ and worker/index.ts, never from another UI.
const ROOT=process.cwd(),DIST=join(ROOT,'dist'),OUT=join(ROOT,'.connector');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon','.png':'image/png','.woff2':'font/woff2','.webp':'image/webp'};
async function paths(dir) {const names=(await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name));const out=[];for(const n of names){const p=join(dir,n.name);if(n.isDirectory())out.push(...await paths(p));else if(n.isFile())out.push(p)}return out}
const files=await paths(DIST);if(!files.some(p=>p.endsWith('/index.html')))throw new Error('Vite index missing');
const assets={};
for(const p of files){const path='/'+relative(DIST,p).replaceAll('\\','/');const b=await readFile(p);const gz=gzipSync(b,{level:9,mtime:0});assets[path]={type:MIME[extname(p).toLowerCase()]||'application/octet-stream',body:gz.toString('base64')};}
const entry=`
import original from './worker/index.ts';
const FILES=${JSON.stringify(assets)};
const ASSETS={fetch(req) {
 const pathname=new URL(req.url).pathname;
 const key=pathname==='/'?'/index.html':pathname;
 const found=Object.prototype.hasOwnProperty.call(FILES,key)?FILES[key]:undefined;
 if(!found)return new Response('Not Found',{status:404,headers:{'cache-control':'no-store'}});
 const bytes=Uint8Array.from(atob(found.body),c=>c.charCodeAt(0));
 return new Response(req.method==='HEAD'?null:bytes,{headers:{'content-type':found.type,'content-encoding':'gzip','cache-control':'private, max-age=300','x-content-type-options':'nosniff'}});
}};
export default {fetch(request,env,ctx){return original.fetch(request,{...env,ASSETS},ctx)}};
`;
const bundled=await build({stdin:{contents:entry,resolveDir:ROOT,sourcefile:'connector-entry.mjs'},bundle:true,minify:true,write:false,platform:'browser',format:'esm',target:'es2022',conditions:['workerd','worker','browser'],logLevel:'warning'});
if(bundled.outputFiles.length!==1)throw new Error('Expected single Worker module');
const script=bundled.outputFiles[0].text;
const digest=createHash('sha256').update(script).digest('hex');
await mkdir(OUT,{recursive:true});
await writeFile(join(OUT,'gallery-worker.mjs'),script);
await writeFile(join(OUT,'manifest.json'),JSON.stringify({format:'datapass.connector-bundle/1',sourceCommit:process.env.GITHUB_SHA||null,sha256:digest,assetPaths:Object.keys(assets).sort(),length:Buffer.byteLength(script)},null,2));
console.log('DPG_SOURCE_SHA='+ (process.env.GITHUB_SHA||'UNKNOWN'));
console.log('DPG_WORKER_SHA256='+digest);
console.log('DPG_ASSET_PATHS='+Object.keys(assets).sort().join(','));
console.log('DPG_SCRIPT_BYTES='+Buffer.byteLength(script));
if(process.argv.includes('--emit')) {
 const packed=gzipSync(Buffer.from(script),{level:9,mtime:0}).toString('base64');
 for(let i=0;i<packed.length;i+=5000)console.log('DPG_CHUNK_'+String(i/5000).padStart(4,'0')+'='+packed.slice(i,i+5000));
 console.log('DPG_CHUNKS='+Math.ceil(packed.length/5000));
 console.log('DPG_END');
}
