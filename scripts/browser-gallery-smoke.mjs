import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const PORT=4178,HOME='http://127.0.0.1:'+PORT;
const imageBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/hAAAAABJRU5ErkJggg==','base64');
const paths=['originals/test-fixtures/agent-cockpit.png','originals/test-fixtures/architecture-diagram.png'];
const record=(key,title,source='private')=>({id:source+':'+key,source,key,title,size:22000,mime:'image/png',url:'/api/file/'+(source==='generated'?'private':source)+'/'+key});
const imported='originals/gallery-import/2026-10-12/generated-example.png';
const media=[record(paths[0],'Agent cockpit'),record(paths[1],'Architecture diagram')];
const referenceTags={'VR-TEST-001':['cockpit','workflow','agents','architecture'],'VR-TEST-002':['diagram','workflow'],'REF-TEST-003':['article']};
const referenceScopes={'VR-TEST-001':['DATAPASS'],'VR-TEST-002':['DATA_ENGINEERING'],'REF-TEST-003':['DATAPASS']};
let state={schema:'datapass.visual-gallery.collections/1',revision:'initial',collections:[],favorites:[],updatedAt:''};
let importCalls=0,saveCalls=0;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{stdio:['ignore','pipe','pipe']});
let startup='';server.stdout?.on('data',b=>startup+=b.toString());server.stderr?.on('data',b=>startup+=b.toString());
async function ready(){
 for(let i=0;i<60;i++){if(server.exitCode!==null)throw Error('Vite exited: '+startup);try{const r=await fetch(HOME);if(r.ok)return}catch{}
 await new Promise(r=>setTimeout(r,300));}
 throw Error('Vite startup timeout: '+startup);
}
function json(payload,status=200){return {status,contentType:'application/json',headers:{'cache-control':'no-store'},body:JSON.stringify(payload)}}
let browser;
try{
 await ready();browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1400,height:960},acceptDownloads:true});
 page.on('pageerror',e=>{console.error('PAGEERROR',String(e))});
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
  if(path==='/api/media'){
   const src=url.searchParams.get('source')||'all';
   const q=(url.searchParams.get('q')||'').toLowerCase();
   const results=media.filter(x=>(src==='all'||src===x.source)&&(q===''||x.key.toLowerCase().includes(q)));
   return route.fulfill(json({items:results,hasMore:false,sources:{private:true,public:true}}));
  }
  if(path==='/api/references'){
   const q=(url.searchParams.get('q')||'').toLowerCase();
   return route.fulfill(json({schema:'datapass.visual-gallery.search/1',query:q,mode:'metadata-relevance',snapshotAt:'2026-10-12T00:00:00Z',totalReferences:2,
    matched:q.includes('agent')?[{id:'VR-TEST-001',title:'Agent cockpit',summary:'Agent window layout',visual:'Four agent panes',tags:['multi-agent'],topics:['agents'],score:55,
    assets:[{source:'private',key:paths[0],url:'/api/file/private/'+paths[0],title:'Agent cockpit',mime:'image/png'}]}]:[]}));
  }
  if(path==='/api/taxonomy'){
   const entries=[['VR-TEST-001','ai-agents','agent-vscode','agent-ui'],['VR-TEST-002','ai-agents','datapass-pm','agent-ui'],['REF-TEST-003','data-engineering','datapass-bi','fabric']].map(([id,domain,route,topic])=>({id,domains:[domain],routes:[route],topics:[topic],tags:referenceTags[id],scopes:referenceScopes[id],purposes:['REFERENCE'],hasMedia:id!=='REF-TEST-003'}));
   return route.fulfill(json({schema:'datapass.visual-gallery.taxonomy/1',snapshotAt:'2026-10-13T08:00:00Z',count:entries.length,entries}));
  }
  if(path==='/api/feed'){
   const data=[{id:'VR-TEST-001',title:'Agent cockpit',domain:'ai-agents',route:'agent-vscode',topic:'agent-ui',key:paths[0]},{id:'VR-TEST-002',title:'Architecture diagram',domain:'ai-agents',route:'datapass-pm',topic:'agent-ui',key:paths[1]},{id:'REF-TEST-003',title:'Learning article',domain:'data-engineering',route:'datapass-bi',topic:'fabric',key:null}];
   const steps=url.searchParams.get('path')?JSON.parse(atob(url.searchParams.get('path'))):[];
   const q=(url.searchParams.get('q')||'').toLowerCase();
   const axis=url.searchParams.get('axis');
   const matched=data.filter(x=>steps.every(s=>({domains:[x.domain],routes:[x.route],topics:[x.topic],tags:referenceTags[x.id],scopes:referenceScopes[x.id],purposes:['REFERENCE']}[s.field]||[]).includes(s.value))&&(!axis||({domains:[x.domain],routes:[x.route],topics:[x.topic],tags:referenceTags[x.id],scopes:referenceScopes[x.id],purposes:['REFERENCE']}[axis]||[]).length>0)&&(!q||x.title.toLowerCase().includes(q))&&(url.searchParams.get('media')!=='images'||x.key));
   const entries=matched.map(x=>({id:x.id,title:x.title,summary:'A synthetic design reference',visual:'Synthetic visual description',date:'2026-10-12T00:00:00Z',kind:x.key?'screenshot':'article',domains:[x.domain],routes:[x.route],purposes:['REFERENCE'],topics:[x.topic],tags:referenceTags[x.id],assets:x.key?[{source:'private',key:x.key,url:'/api/file/private/'+x.key,title:x.title,mime:'image/png'}]:[]}));
   return route.fulfill(json({schema:'datapass.visual-gallery.feed/1',snapshotAt:'2026-10-13T08:00:00Z',total:entries.length,entries,hasMore:false,source:'MongoDB snapshot'}));
  }
  if(path==='/api/collections'&&method==='GET')return route.fulfill(json(state));
  if(path==='/api/collections'&&method==='PUT'){
   if(request.headers()['if-match']!==state.revision)return route.fulfill(json({error:'Concurrent update'},409));
   const incoming=JSON.parse(request.postData()||'{}');
   state={schema:state.schema,revision:'revision-'+(++saveCalls),collections:incoming.collections,favorites:incoming.favorites,updatedAt:new Date().toISOString()};
   return route.fulfill(json(state));
  }
  if(path==='/api/import'&&method==='POST'){
   importCalls++;media.push(record(imported,'Imported mock screenshot','generated'));
   return route.fulfill(json({status:'archived_private',intake:'PENDING_REFERENCE_INTAKE',
    item:record(imported,'Imported mock screenshot','generated')},201));
  }
  if(path.startsWith('/api/file/'))return route.fulfill({status:200,contentType:'image/png',body:imageBytes,headers:{'cache-control':'private, max-age=60'}});
  return route.fulfill(json({error:'Mock API not found'},404));
 });
 await page.goto(HOME,{waitUntil:'domcontentloaded'});
 await page.locator('.gallery .media').first().waitFor({state:'visible'});
 assert.equal(await page.locator('.gallery .media').count(),2);
 await page.getByLabel('Card size').selectOption('large');
 assert.ok((await page.locator('.gallery').getAttribute('class')).includes('density-large'));
 await page.locator('.media').nth(0).getByRole('button',{name:'Compare Agent cockpit'}).click();
 await page.locator('.media').nth(1).getByRole('button',{name:'Compare Architecture diagram'}).click();
 await page.getByRole('button',{name:'Compare now'}).click();
 await page.getByRole('dialog',{name:'Compare two images'}).waitFor();
 await page.getByRole('dialog',{name:'Compare two images'}).getByRole('button',{name:'Zoom in'}).click();
 assert.ok((await page.getByRole('dialog',{name:'Compare two images'}).innerText()).includes('120%'));
 await page.getByRole('button',{name:'Close comparison'}).click();
 await page.getByRole('dialog',{name:'Compare two images'}).waitFor({state:'hidden'});
 await page.locator('.media-frame').first().click();
 await page.getByRole('dialog',{name:'Media viewer'}).waitFor();
 await page.getByRole('dialog',{name:'Media viewer'}).getByRole('button',{name:'Zoom in'}).click();
 assert.ok((await page.getByRole('dialog',{name:'Media viewer'}).innerText()).includes('120%'));
 await page.keyboard.press('Escape');
 await page.getByRole('dialog',{name:'Media viewer'}).waitFor({state:'hidden'});
 await page.locator('.media').nth(0).getByRole('button',{name:'Select'}).click();
 await page.locator('.media').nth(1).getByRole('button',{name:'Select'}).click();
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export manifest'}).click()]);
 assert.equal(download.suggestedFilename(),'datapass-visual-selection.json');
 await page.getByRole('button',{name:'Collections',exact:true}).click();
 await page.getByLabel('New collection name').fill('Agent design board');
 await page.getByRole('button',{name:/Create with selected/}).click();
 await page.locator('.collection-tab.current').waitFor();
 assert.match(await page.locator('.collection-tab.current').innerText(),/Agent design board/);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Collections',exact:true}).click();
 await page.locator('.collection-tab.current').waitFor();
 assert.ok((await page.locator('.collection-tab.current').innerText()).includes('Agent design board'));
 // Owner scenario: Mongo folder tree must be visible even while Collections is selected.
 await page.locator('.feed-tree').waitFor({state:'visible'});
 await page.locator('.feed-tree-all').waitFor({state:'visible'});
 await page.locator('.feed-tree').getByRole('button',{name:'Ai Agents',exact:true}).click();
 await page.locator('.reference-feed-card').first().waitFor();
 await page.waitForFunction(()=>document.querySelectorAll('.reference-feed-card').length===2);
 assert.equal(await page.locator('.reference-feed-card').count(),2);
 await page.getByRole('button',{name:'Collections',exact:true}).click();
 await page.locator('.feed-tree').waitFor({state:'visible'});
 await page.locator('.feed-tree-all').click();
 await page.getByRole('button',{name:'All media',exact:true}).click();
 await page.locator('.feed-tree').waitFor({state:'visible'});
 await page.getByLabel('Search references or media').fill('agent cockpit');
 await page.getByRole('button',{name:'Search',exact:true}).click();
 await page.locator('.reference-card').first().waitFor();
 assert.ok((await page.locator('.reference-card').innerText()).includes('VR-TEST-001'));
 await page.getByRole('button',{name:'Import',exact:true}).click();
 await page.locator('.import-panel input[type=file]').setInputFiles({name:'generated.png',mimeType:'image/png',buffer:imageBytes});
 await page.getByRole('button',{name:'Archive to private R2'}).click();
 await page.getByRole('button',{name:'Generated & imported'}).click();
 await page.locator('.media').filter({hasText:'Imported mock screenshot'}).waitFor();
 assert.equal(importCalls,1);assert.ok(saveCalls>=1);
 await page.getByLabel('Search references or media').fill('');
 await page.getByRole('button',{name:'Search',exact:true}).click();
 await page.getByRole('button',{name:'Reference feed',exact:true}).click();
 await page.locator('.reference-feed-card').first().waitFor();
 assert.equal(await page.locator('.reference-feed-card').count(),3);
 // Feed must display several compact cards per row, including 4-column option.
 const feedColumns=page.getByLabel('Feed columns');
 assert.equal(await feedColumns.inputValue(),'4');
 const columnCount=()=>page.locator('.reference-feed-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
 assert.equal(await columnCount(),4);
 await feedColumns.selectOption('3');
 assert.equal(await columnCount(),3);
 await feedColumns.selectOption('4');
 assert.equal(await columnCount(),4);
 assert.equal(await page.evaluate(()=>localStorage.getItem('dvl:feed-columns:v2')),'4');
 await feedColumns.selectOption('2');
 assert.equal(await columnCount(),2);
 await feedColumns.selectOption('4');
 // A category header is one full-width button: clicking the count side must expand it.
 for(const name of ['Projects','Purposes','Scopes']){
  const axisButton=page.locator('.feed-tree').getByRole('button',{name,exact:true});
  const initial=await axisButton.getAttribute('aria-expanded');
  const bounds=await axisButton.boundingBox();assert.ok(bounds&&bounds.width>120,name+' click target too narrow');
  await axisButton.click({position:{x:bounds.width-8,y:bounds.height/2}});
  assert.notEqual(await axisButton.getAttribute('aria-expanded'),initial,name+' did not toggle from row end');
  // Clicking a root axis must show an overview in the feed, not only expand the tree.
  await page.getByRole('heading',{name,exact:true}).waitFor();
  await page.locator('.feed-axis-options').first().waitFor();
  await axisButton.click();
  assert.equal(await axisButton.getAttribute('aria-expanded'),initial);
 }
 await page.locator('.feed-tree').getByRole('button',{name:'Scopes',exact:true}).click();
 await page.getByRole('heading',{name:'Scopes',exact:true}).waitFor();
 await page.getByRole('button',{name:'Filter Scopes by Datapass'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.reference-feed-card').length===2);
 assert.match(await page.locator('.reference-feed-head h2').innerText(),/datapass/i);
 await page.getByRole('button',{name:'Clear all category and tag filters'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.reference-feed-card').length===3);
 const agentBranch=page.getByRole('button',{name:'Ai Agents',exact:true});
 const wasExpanded=await agentBranch.getAttribute('aria-expanded');
 await agentBranch.click();
 await page.waitForFunction(()=>document.querySelectorAll('.reference-feed-card').length===2);
 const changed=await agentBranch.getAttribute('aria-expanded');
 assert.notEqual(changed,wasExpanded,'Clicking category must toggle its expanded state');
 if(changed!=='true')await agentBranch.click();
 assert.equal(await agentBranch.getAttribute('aria-expanded'),'true');
 await page.getByRole('button',{name:'Agent Ui',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.reference-feed-card').length===2);
 await page.getByRole('button',{name:'Open Agent cockpit media 1'}).click();
 await page.getByRole('dialog',{name:'Media viewer'}).waitFor();
 await page.keyboard.press('Escape');
 await page.getByRole('dialog',{name:'Media viewer'}).waitFor({state:'hidden'});
 await page.locator('.feed-tree-all').click();
 await page.waitForFunction(()=>document.querySelectorAll('.reference-feed-card').length===3);
 await page.getByLabel('Feed media filter').selectOption('images');
 await page.waitForFunction(()=>document.querySelectorAll('.reference-feed-card').length===2);
 await page.getByLabel('Feed media filter').selectOption('all');
 await page.waitForFunction(()=>document.querySelectorAll('.reference-feed-card').length===3);
 // Tags beyond the first two are collapsed; clicking one performs a real facet search.
 const cockpit=page.locator('.reference-feed-card').filter({hasText:'Agent cockpit'});
 // Visual-first cards hide description and tags until the owner asks for them.
 assert.equal(await cockpit.locator('.feed-card-info-body').isVisible(),false);
 assert.equal(await cockpit.locator('.feed-card-tag-menu .feed-card-tags').isVisible(),false);
 const primary=cockpit.getByRole('button',{name:'Open Agent cockpit media 1'});
 const tile=await primary.boundingBox();assert.ok(tile&&tile.height>=220,'Image-first media area is too small');
 await primary.hover();
 await page.locator('.feed-hover-preview').waitFor({state:'visible'});
 const big=await page.locator('.feed-hover-preview').boundingBox();
 assert.ok(big&&big.width>tile.width*1.2&&big.height>tile.height*1.5,'Hover image did not enlarge beyond thumbnail');
 assert.equal(await page.locator('.feed-hover-preview img').getAttribute('src'),'/api/file/private/'+paths[0]);
 await page.mouse.move(10,8);
 await page.locator('.feed-hover-preview').waitFor({state:'hidden'});
 await cockpit.locator('.feed-card-info > summary').click();
 assert.equal(await cockpit.locator('.feed-card-info-body').isVisible(),true);
 await cockpit.locator('.feed-card-info > summary').click();
 await cockpit.locator('.feed-card-tag-menu > summary').click();
 assert.equal(await cockpit.locator('.feed-card-tag-menu .feed-card-tags').isVisible(),true);
 await cockpit.getByText('+2 tags').click();
 await cockpit.getByRole('button',{name:'Filter by tag agents'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.reference-feed-card').length===1);
 assert.ok((await page.locator('.reference-feed-head h2').innerText()).includes('#agents'));
 await page.locator('.reference-feed-card').getByRole('button',{name:'Remove filter for tag agents'}).click();
 await page.waitForFunction(()=>document.querySelectorAll('.reference-feed-card').length===3);
 // Narrow screen must become a single column without horizontal clipping.
 await page.setViewportSize({width:620,height:820});
 assert.equal(await columnCount(),1);
 const mobileImage=page.getByRole('button',{name:'Open Agent cockpit media 1'});
 await mobileImage.hover();
 assert.equal(await page.locator('.feed-hover-preview').count(),0,'Phone-sized view must not show desktop hover overlay');
 await page.setViewportSize({width:1400,height:960});
 assert.equal(await columnCount(),4);
 await mkdir('artifacts/synthetic',{recursive:true});
 await page.screenshot({path:'artifacts/synthetic/visual-gallery.png',fullPage:false});
 console.log('PASS: image-first four-column cards, authenticated hover preview, collapsible Info/Tags, facet filtering, mobile fallback and prior gallery journeys');
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
