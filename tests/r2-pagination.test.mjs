import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise the actual exported R2 list route without authenticating a real user.
// The production fetch handler separately verifies Cloudflare Access before this route.
const buildResult=await build({entryPoints:['worker/index.ts'],bundle:true,format:'esm',platform:'node',target:'node22',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(buildResult.outputFiles[0].text).toString('base64'));
const ORIGIN='https://datapass-visual-gallery-preview.datapass.workers.dev';

function bucket(keys){
 const calls=[];
 return {calls,async list(options={}){
  calls.push(options);
  const all=options.prefix?keys.filter(k=>k.startsWith(options.prefix)):keys;
  const start=options.cursor?Number(options.cursor):0;
  const end=Math.min(all.length,start+(options.limit??1000));
  return {objects:all.slice(start,end).map(key=>({key,size:900,uploaded:new Date('2026-10-12T00:00:00Z')})),
          truncated:end<all.length,cursor:end<all.length?String(end):undefined};
 }};
}
function context(privateKeys,publicKeys){
 const privateBucket=bucket(privateKeys),publicBucket=bucket(publicKeys);
 return {env:{PRIVATE_MEDIA:privateBucket,WEB_ASSETS:publicBucket},privateBucket,publicBucket};
}
async function list(query,env){
 const res=await api.list(new Request(ORIGIN+'/api/media?'+query),env);
 return {status:res.status,data:await res.json()};
}
test('R2 pagination respects requested page size exactly across page boundaries',async()=>{
 const files=Array.from({length:251},(_,i)=>'originals/batch/IMG_'+String(i).padStart(4,'0')+'.png');
 const {env}=context(files,[]);
 const seen=new Set();
 let cursor='',calls=0;
 while(true){
  const page=await list(new URLSearchParams({source:'private',limit:'31',...(cursor?{cursor}:{})}).toString(),env);
  assert.equal(page.status,200);
  assert.ok(page.data.items.length<=31);
  for(const item of page.data.items){assert.ok(!seen.has(item.key),'duplicate '+item.key);seen.add(item.key)}
  calls++;
  if(!page.data.hasMore)break;
  cursor=page.data.cursor;assert.ok(cursor);
  assert.ok(calls<25,'pagination loop');
 }
 assert.equal(seen.size,251);
 assert.equal(calls,9);
});
test('Source=all transitions from private to public once, without duplicates',async()=>{
 const a=Array.from({length:27},(_,i)=>'originals/private/'+i+'.jpg');
 const b=Array.from({length:13},(_,i)=>'originals/assets/'+i+'.png');
 const {env}=context(a,b);
 let cursor='',pages=[];
 do{
  const res=await list(new URLSearchParams({source:'all',limit:'11',...(cursor?{cursor}:{})}).toString(),env);
  assert.equal(res.status,200);pages.push(...res.data.items);
  cursor=res.data.hasMore?res.data.cursor:'';
 }while(cursor);
 assert.equal(pages.length,40);
 assert.equal(pages.filter(x=>x.source==='private').length,27);
 assert.equal(pages.filter(x=>x.source==='public').length,13);
 assert.equal(new Set(pages.map(x=>x.id)).size,40);
});
test('Filename search scans bounded listing pages without skipping images',async()=>{
 const a=Array.from({length:370},(_,i)=>'originals/batch/'+(i%43===0?'agent':'misc')+'_'+String(i).padStart(3,'0')+'.png');
 const {env}=context(a,[]);
 let cursor='',received=[],passes=0;
 do{
  const res=await list(new URLSearchParams({source:'private',limit:'3',q:'agent',...(cursor?{cursor}:{})}).toString(),env);
  assert.equal(res.status,200);
  received.push(...res.data.items.map(x=>x.key));
  cursor=res.data.hasMore?res.data.cursor:'';
  assert.ok(++passes<30);
 }while(cursor);
 assert.equal(received.length,a.filter(x=>x.includes('agent')).length);
 assert.equal(new Set(received).size,received.length);
});
test('Opaque cursor cannot be reused for another search or source',async()=>{
 const {env}=context(Array.from({length:210},(_,i)=>'originals/private/'+i+'.png'),[]);
 const first=await list('source=private&limit=7',env);
 assert.ok(first.data.cursor);
 const mismatch=await list(new URLSearchParams({source:'private',q:'other',cursor:first.data.cursor}).toString(),env);
 assert.equal(mismatch.status,400);
 const mismatchSource=await list(new URLSearchParams({source:'generated',cursor:first.data.cursor}).toString(),env);
 assert.equal(mismatchSource.status,400);
});
test('Generated intake filtering is limited to its private namespace',async()=>{
 const {env}=context(['originals/gallery-import/2026-10-12/img1.png','originals/other/a.png'],[]);
 const {status,data}=await list('source=generated&limit=5',env);
 assert.equal(status,200);assert.equal(data.items.length,1);
 assert.equal(data.items[0].source,'generated');
 assert.match(data.items[0].url,/^\/api\/file\/private\//);
});
test('Worker denies missing Access assertion on HTML and private bytes',async()=>{
 const {env}=context(['originals/private/a.png'],[]);
 const securityEnv={...env,ACCESS_TEAM_DOMAIN:'https://proud-cell-ad39.cloudflareaccess.com',ACCESS_AUD:'test',
  PUBLIC_ORIGIN:ORIGIN,ASSETS:{fetch:async()=>new Response('SHOULD NOT HAPPEN')}};
 for(const path of ['/','/api/media','/api/file/private/originals/private/a.png','/api/references?q=agent']){
  const res=await api.default.fetch(new Request(ORIGIN+path),securityEnv);
  assert.equal(res.status,401,path);
 }
});
