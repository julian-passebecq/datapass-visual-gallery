import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const built=await build({entryPoints:['worker/library.ts'],bundle:true,format:'esm',platform:'node',target:'node22',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const origin='https://datapass-visual-gallery-preview.datapass.workers.dev';
const rows=[
 {id:'VR-01',title:'Agent cockpit architecture',summary:'Agent windows',visual:'Multiple panels',created_at:'2026-10-09T12:00:00Z',source_kind:'screenshot',source_url:'javascript:alert(1)',aliases:[],search_text:'developer',domains:['ai-agents','software-engineering'],routes:['datapass-pm'],purposes:['INSPIRATION'],scopes:['DATAPASS'],topics:['agent-ui'],tags:['cockpit'],assets:[{key:'originals/agent/img.png',mime:'image/png'}]},
 {id:'REF-02',title:'Power BI notebook',summary:'Notebook article',visual:'',created_at:'2026-10-07T09:00:00Z',source_kind:'article',source_url:'https://example.com/bi',aliases:[],search_text:'power bi',domains:['data-engineering'],routes:['datapass-bi'],purposes:['LEARN'],scopes:['PROFESSIONAL_DOMAIN'],topics:['notebooks'],tags:['fabric'],assets:[]},
 {id:'REF-03',title:'Agent tree',summary:'Another view',visual:'subagents',created_at:'2026-10-08T09:00:00Z',source_kind:'screenshot',aliases:[],search_text:'agent tree',domains:['ai-agents'],routes:['agent-vscode'],purposes:['REFERENCE'],scopes:['DATAPASS'],topics:['agent-ui'],tags:['graph'],assets:[{key:'originals/agent/tree.png',mime:'image/png'}]}
];
const snapshot={schema:'datapass.visual-gallery.catalog/1',refreshed_at:'2026-10-13T08:00:00Z',references:rows};
const store=new Map([['catalog-v1',JSON.stringify(snapshot)]]);
const env={CATALOG:{async get(key,type){const value=store.get(key);return value&&type==='json'?JSON.parse(value):null},async put(){throw Error('Read-only feed must not write KV')}}};
const request=(path)=>new Request(origin+path);
test('taxonomy returns complete Mongo-derived facets without treating tags as authored folders',async()=>{
 const r=await api.taxonomy(request('/api/taxonomy'),env);assert.equal(r.status,200);
 const body=await r.json();assert.equal(body.count,3);assert.equal(body.entries[0].domains.length,2);
 assert.equal(body.semantics,'derived-facets-not-mongo-folders');
 assert.equal(body.entries[1].hasMedia,false);
});
test('feed orders dates, includes link-only references and excludes unsafe external URLs',async()=>{
 const r=await api.referenceFeed(request('/api/feed?limit=2'),env);assert.equal(r.status,200);
 const body=await r.json();assert.deepEqual(body.entries.map(x=>x.id),['VR-01','REF-03']);
 assert.equal(body.total,3);assert.equal(body.hasMore,true);
 assert.equal(body.entries[0].sourceUrl,undefined);
 const p=new URLSearchParams({limit:'2',cursor:body.cursor});
 const next=await api.referenceFeed(request('/api/feed?'+p),env);
 assert.deepEqual((await next.json()).entries.map(x=>x.id),['REF-02']);
});
test('intersection of domain topic facets retains overlapping membership',async()=>{
 const path=btoa(JSON.stringify([{field:'domains',value:'ai-agents'},{field:'topics',value:'agent-ui'}]));
 const r=await api.referenceFeed(request('/api/feed?path='+encodeURIComponent(path)+'&media=images'),env);
 const data=await r.json();assert.deepEqual(data.entries.map(x=>x.id),['VR-01','REF-03']);
 const one=await api.referenceFeed(request('/api/feed?path='+encodeURIComponent(path)+'&q=graph'),env);
 assert.deepEqual((await one.json()).entries.map(x=>x.id),['REF-03']);
});
test('invalid facet fields and mismatched cursors fail safely',async()=>{
 const path=btoa(JSON.stringify([{field:'admin',value:'all'}]));
 const a=await api.referenceFeed(request('/api/feed?path='+encodeURIComponent(path)),env);
 assert.equal(a.status,400);
 const first=await (await api.referenceFeed(request('/api/feed?limit=1'),env)).json();
 const bad=await api.referenceFeed(request('/api/feed?limit=1&q=unrelated&cursor='+encodeURIComponent(first.cursor)),env);
 assert.equal(bad.status,409);
});
test('taxonomy rejects parameters that might cause hidden filtering',async()=>{
 assert.equal((await api.taxonomy(request('/api/taxonomy?q=irrelevant'),env)).status,400);
 assert.equal(store.size,1);
});
