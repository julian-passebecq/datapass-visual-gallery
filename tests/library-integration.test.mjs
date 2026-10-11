import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Execute the actual TypeScript module under Node 22, without a network service.
const compiled=await build({entryPoints:['worker/library.ts'],bundle:true,format:'esm',platform:'node',target:'node22',write:false});
const library=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const ORIGIN='https://datapass-visual-gallery-preview.datapass.workers.dev';
function kv(seed={}){
 const storage=new Map(Object.entries(seed));
 return {storage,async get(k,type){const val=storage.get(k);return val===undefined?null:type==='json'?JSON.parse(val):val},async put(k,v){storage.set(k,v)}};
}
function env(seed={}){
 const store=kv(seed),writes=[];
 return {CATALOG:store,PRIVATE_MEDIA:{async put(key,bytes,opt){writes.push({key,bytes,opt})}},WEB_ASSETS:{async put(){throw Error('Public bucket must not be written')}},writes};
}
const snapshot={schema:'datapass.visual-gallery.catalog/1',refreshed_at:'2026-10-11T22:00:26Z',references:[
 {id:'VR-001',title:'Agent cockpit with four provider windows',summary:'An integrated view of coding agents',visual:'Agent team panels and command center',aliases:['agent control room'],search_text:'codex claude terminal team',tags:['multiagent','cockpit'],topics:['agents'],domains:['developer tools'],routes:[],scopes:[],purposes:[],visual_elements:['four panes'],assets:[{key:'originals/agent/snapshot.png',mime:'image/png',asset_id:'ASSET-001'}]},
 {id:'VR-002',title:'Travel booking screenshot',summary:'A tourist map and train times',visual:'Calendar and map',aliases:[],search_text:'travel itinerary',tags:['travel'],topics:[],domains:[],routes:[],scopes:[],purposes:[],visual_elements:[],assets:[]}
]};
const req=(path,init)=>new Request(ORIGIN+path,init);

test('Mongo-derived metadata search returns linked private R2 key and reference provenance',async()=>{
 const e=env({'catalog-v1':JSON.stringify(snapshot)});
 const res=await library.queryCatalog(req('/api/references?q=agent%20cockpit'),e);
 assert.equal(res.status,200);const data=await res.json();
 assert.equal(data.mode,'metadata-relevance');assert.equal(data.vectorSearch,false);
 assert.equal(data.matched[0].id,'VR-001');assert.equal(data.matched[0].assets[0].key,'originals/agent/snapshot.png');
 assert.ok(data.matched[0].assets[0].url.startsWith('/api/file/private/'));
 assert.ok(!data.matched.some(x=>x.id==='VR-002'));
 assert.equal(e.CATALOG.storage.size,1); // Search does not modify authoritative data.
});
test('Missing retrieval snapshot fails explicitly, without fake results',async()=>{
 const r=await library.queryCatalog(req('/api/references?q=agent'),env());
 assert.equal(r.status,503);assert.match((await r.json()).error,/index unavailable/i);
});
test('Named collections are isolated by Access subject, optimistic conflict and Origin guard',async()=>{
 const e=env();
 const alice=await library.getCollections(e,'owner-a'),bob=await library.getCollections(e,'owner-b');
 assert.equal((await alice.json()).revision,'initial');assert.equal((await bob.json()).collections.length,0);
 const record={collections:[{id:'board_001',name:'Agent views',items:[{source:'private',key:'originals/agent/snapshot.png',title:'Agent cockpit'}],createdAt:'2026-10-11T22:01Z'}],favorites:['private:originals/agent/snapshot.png']};
 const res=await library.putCollections(req('/api/collections',{method:'PUT',headers:{origin:ORIGIN,'if-match':'initial','content-type':'application/json'},body:JSON.stringify(record)}),e,'owner-a');
 assert.equal(res.status,200);const stored=await res.json();
 assert.equal(stored.collections[0].name,'Agent views');assert.notEqual(stored.revision,'initial');
 assert.equal((await (await library.getCollections(e,'owner-b')).json()).collections.length,0);
 const stale=await library.putCollections(req('/api/collections',{method:'PUT',headers:{origin:ORIGIN,'if-match':'initial'},body:JSON.stringify(record)}),e,'owner-a');
 assert.equal(stale.status,409);
 const csrf=await library.putCollections(req('/api/collections',{method:'PUT',headers:{origin:'https://attacker.example','if-match':stored.revision},body:JSON.stringify(record)}),e,'owner-a');
 assert.equal(csrf.status,403);
});
test('Import archives a signed owner-selected PNG only to private media pending Mongo intake',async()=>{
 const e=env();
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/hAAAAABJRU5ErkJggg==','base64');
 const form=new FormData();form.append('file',new File([png],'generated-image.png',{type:'image/png'}));form.append('purpose','GENERATED_IMAGE');form.append('title','DataPass agency diagram');form.append('tags','agent, diagram');
 const res=await library.importImage(req('/api/import',{method:'POST',headers:{origin:ORIGIN},body:form}),e);
 assert.equal(res.status,201);const data=await res.json();assert.equal(data.intake,'PENDING_REFERENCE_INTAKE');
 assert.equal(data.item.source,'generated');assert.match(data.item.key,/^originals\/gallery-import\/\d{4}-\d{2}-\d{2}\/[-a-f0-9]+\.png$/);
 assert.equal(e.writes.length,1);assert.equal(e.writes[0].opt.httpMetadata.contentType,'image/png');
 assert.equal(e.writes[0].opt.customMetadata.purpose,'GENERATED_IMAGE');
 assert.equal(e.writes[0].opt.customMetadata.intake_status,'PENDING_REFERENCE_INTAKE');
 const denied=await library.importImage(req('/api/import',{method:'POST',headers:{origin:'https://evil.invalid'},body:form}),e);
 assert.equal(denied.status,403);assert.equal(e.writes.length,1);
});
