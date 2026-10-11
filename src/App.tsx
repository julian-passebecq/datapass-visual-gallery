import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Search, Images, Grid2X2, List, CheckSquare, Square, Star, Download, ExternalLink, X, ChevronLeft, ChevronRight, RefreshCcw, FolderOpen, ShieldCheck, Copy, Filter, Upload, Plus, FolderPlus, Trash2, Pencil, AlertCircle } from 'lucide-react';
import type { MediaItem, MediaPage, Source, ReferenceMatch, ReferenceResult, CollectionState, Collection, StoredImage } from './types';
import { mediaType, stableKey, fromStored } from './types';

type Tab = 'all' | Source | 'favorites' | 'selected' | 'collections';
const SOURCES:{value:Tab;label:string}[]=[
 {value:'all',label:'All media'},{value:'private',label:'Private references'},
 {value:'generated',label:'Generated & imported'},{value:'public',label:'Web assets'},
 {value:'collections',label:'Collections'},{value:'favorites',label:'Favorites'},
 {value:'selected',label:'Selected'}];
const emptyState:CollectionState={schema:'datapass.visual-gallery.collections/1',revision:'initial',collections:[],favorites:[],updatedAt:''};
function readSet(k:string):Set<string>{try{const x=JSON.parse(localStorage.getItem(k)||'[]');return new Set(Array.isArray(x)?x.filter((v):v is string=>typeof v==='string'):[])}catch{return new Set()}}
function readRecords():Record<string,MediaItem>{try{const v=JSON.parse(localStorage.getItem('dvl:selected-records:v1')||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}}
function readableError(err:unknown){return err instanceof Error?err.message:String(err)}
function toSaved(items:MediaItem[]):StoredImage[]{return items.map(i=>({source:i.source,key:i.key,title:i.title,mime:i.mime}))}
function unique(items:MediaItem[]):MediaItem[]{const seen=new Set<string>();return items.filter(i=>{const id=stableKey(i);if(seen.has(id))return false;seen.add(id);return true})}
function referenceItems(results:ReferenceMatch[]):MediaItem[]{return unique(results.flatMap(r=>r.assets.map(i=>({id:'private:'+i.key,source:'private' as const,key:i.key,title:r.title,size:0,mime:i.mime,url:i.url}))))}

function App(){
 const [tab,setTab]=useState<Tab>('all'),[query,setQuery]=useState(''),[draft,setDraft]=useState('');
 const [items,setItems]=useState<MediaItem[]>([]),[cursor,setCursor]=useState<string|undefined>(),[hasMore,setHasMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [selected,setSelected]=useState<Set<string>>(()=>new Set([...readSet('dvl:selected:v1'),...Object.keys(readRecords())]));
 const [selectedRecords,setSelectedRecords]=useState<Record<string,MediaItem>>(readRecords);
 const [favorites,setFavorites]=useState<Set<string>>(()=>readSet('dvl:favorites:v1'));
 const [collections,setCollections]=useState<CollectionState>(emptyState),[collectionsLoaded,setCollectionsLoaded]=useState(false),[collectionBusy,setCollectionBusy]=useState(false),[collectionError,setCollectionError]=useState('');
 const [activeCollection,setActiveCollection]=useState(''),[newCollection,setNewCollection]=useState(''),[editingCollection,setEditingCollection]=useState(''),[editingName,setEditingName]=useState('');
 const [references,setReferences]=useState<ReferenceMatch[]>([]),[snapshotAt,setSnapshotAt]=useState(''),[searchError,setSearchError]=useState(''),[searchBusy,setSearchBusy]=useState(false);
 const [active,setActive]=useState<MediaItem|null>(null),[listMode,setListMode]=useState(false),[showFilters,setShowFilters]=useState(false),[kind,setKind]=useState('all');
 const [showImport,setShowImport]=useState(false),[uploading,setUploading]=useState(false),[uploadFile,setUploadFile]=useState<File|null>(null),[uploadTitle,setUploadTitle]=useState(''),[uploadTags,setUploadTags]=useState(''),[uploadPurpose,setUploadPurpose]=useState('GENERATED_IMAGE');
 const [notice,setNotice]=useState('');
 const source:Source|'all'=tab==='private'||tab==='public'||tab==='generated'?tab:'all';
 const load=useCallback(async(next?:string,reset=false)=>{
  setBusy(true);setError('');
  try{const params=new URLSearchParams({source,limit:'80'});if(query.trim())params.set('q',query.trim());if(next)params.set('cursor',next);
   const resp=await fetch('/api/media?'+params,{credentials:'same-origin',cache:'no-store'});
   if(!resp.ok){let msg='Gallery request failed ('+resp.status+')';try{msg=(await resp.json()).error||msg}catch{}throw new Error(msg)}
   const data=await resp.json() as MediaPage;
   setItems(old=>reset?data.items:unique([...old,...data.items]));
   setCursor(data.cursor);setHasMore(data.hasMore);
  }catch(e){setError(readableError(e));if(reset)setItems([])}
  finally{setBusy(false)}
 },[source,query]);
 useEffect(()=>{void load(undefined,true)},[load]);
 useEffect(()=>{localStorage.setItem('dvl:selected:v1',JSON.stringify([...selected]))},[selected]);
 useEffect(()=>{localStorage.setItem('dvl:selected-records:v1',JSON.stringify(selectedRecords))},[selectedRecords]);
 useEffect(()=>{localStorage.setItem('dvl:favorites:v1',JSON.stringify([...favorites]))},[favorites]);
 useEffect(()=>{function onEscape(e:KeyboardEvent){if(e.key==='Escape')setActive(null)}window.addEventListener('keydown',onEscape);return()=>window.removeEventListener('keydown',onEscape)},[]);
 useEffect(()=>{let cancelled=false;(async()=>{try{
  const res=await fetch('/api/collections',{credentials:'same-origin',cache:'no-store'});
  if(!res.ok)throw new Error('Collections unavailable ('+res.status+')');
  const state=await res.json() as CollectionState;
  if(!cancelled){setCollections(state);setFavorites(new Set(state.favorites));setCollectionsLoaded(true);setActiveCollection(v=>v||state.collections[0]?.id||'')}
 }catch(e){if(!cancelled){setCollectionError(readableError(e));setCollectionsLoaded(false)}}})();return()=>{cancelled=true}},[]);
 useEffect(()=>{let cancelled=false;
  if(!query.trim()||tab==='public'){setReferences([]);setSearchError('');return}
  setSearchBusy(true);setSearchError('');
  const params=new URLSearchParams({q:query,limit:'35'});
  void fetch('/api/references?'+params,{credentials:'same-origin',cache:'no-store'})
   .then(async res=>{if(!res.ok)throw new Error('Reference search unavailable ('+res.status+')');return res.json() as Promise<ReferenceResult>})
   .then(data=>{if(!cancelled){setReferences(data.matched);setSnapshotAt(data.snapshotAt)}})
   .catch(e=>{if(!cancelled){setReferences([]);setSearchError(readableError(e))}})
   .finally(()=>{if(!cancelled)setSearchBusy(false)});
  return()=>{cancelled=true};
 },[query,tab]);
 const recorded=Object.values(selectedRecords).filter(i=>selected.has(stableKey(i)));
 const missingSelections=selected.size-recorded.length;
 const selectedCollection=collections.collections.find(c=>c.id===activeCollection);
 const visible=useMemo(()=>{
  const base=tab==='collections'?selectedCollection?.items.map(fromStored)||[]:tab==='selected'?recorded:items;
  return base.filter(i=>(kind==='all'||mediaType(i.key)===kind)&& (tab!=='favorites'||favorites.has(stableKey(i))));
 },[items,kind,tab,favorites,activeCollection,collections,selectedRecords,selected]);
 const matchedItems=useMemo(()=>referenceItems(references),[references]);
 const previews=useMemo(()=>unique([...visible,...matchedItems]),[visible,matchedItems]);
 const activeIndex=previews.findIndex(i=>active&&stableKey(i)===stableKey(active));
 function move(dir:number){if(previews.length)setActive(previews[((activeIndex<0?0:activeIndex)+dir+previews.length)%previews.length])}
 function toggle(item:MediaItem){
  const id=stableKey(item),wasSelected=selected.has(id);
  setSelected(old=>{const next=new Set(old);wasSelected?next.delete(id):next.add(id);return next});
  setSelectedRecords(old=>{const next={...old};if(wasSelected)delete next[id];else next[id]=item;return next});
 }
 function clearSelection(){setSelected(new Set());setSelectedRecords({})}
 function exportSelection(){
  if(missingSelections>0){setNotice('Some old selections lack metadata. Open and reselect those images before exporting.');return}
  const manifest={schema:'datapass.visual-selection/1',exportedAt:new Date().toISOString(),items:toSaved(recorded)};
  const url=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='datapass-visual-selection.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  setNotice('Selection manifest exported ('+recorded.length+' images).');
 }
 async function persist(next:Collection[],nextFavorites:Set<string>){
  if(!collectionsLoaded||collectionBusy)throw new Error('Collections are unavailable or busy. Try again.');
  setCollectionBusy(true);setCollectionError('');
  try{
   const res=await fetch('/api/collections',{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json','if-match':collections.revision},body:JSON.stringify({collections:next,favorites:[...nextFavorites]})});
   if(!res.ok){const obj=await res.json().catch(()=>({error:'Collection save failed'}));throw new Error(obj.error||'Collection save failed ('+res.status+')')}
   const state=await res.json() as CollectionState;
   setCollections(state);setFavorites(new Set(state.favorites));return state;
  }catch(e){setCollectionError(readableError(e));throw e}
  finally{setCollectionBusy(false)}
 }
 async function favorite(item:MediaItem){
  const next=new Set(favorites),id=stableKey(item);next.has(id)?next.delete(id):next.add(id);
  try{await persist(collections.collections,next)}catch{/* user-visible collectionError */}
 }
 function createCollection(e:FormEvent){
  e.preventDefault();const name=newCollection.trim();if(!name||name.length>70)return;
  const now=new Date().toISOString(),id=crypto.randomUUID();
  const added:StoredImage[]=toSaved(recorded.slice(0,200));
  const next=[...collections.collections,{id,name,items:added,createdAt:now,updatedAt:now}];
  void persist(next,favorites).then(()=>{setActiveCollection(id);setNewCollection('');setNotice('Collection created. Items stay in their original buckets.')}).catch(()=>{});
 }
 function addSelectedToCollection(){
  if(!selectedCollection||!recorded.length)return;
  const existing=new Set(selectedCollection.items.map(i=>i.source+':'+i.key));
  const added=toSaved(recorded).filter(i=>!existing.has(i.source+':'+i.key));
  const next=collections.collections.map(c=>c.id===activeCollection?{...c,items:[...c.items,...added].slice(0,200)}:c);
  void persist(next,favorites).then(()=>setNotice(added.length+' image(s) added to collection.')).catch(()=>{});
 }
 function removeFromCollection(item:MediaItem){
  const next=collections.collections.map(c=>c.id===activeCollection?{...c,items:c.items.filter(i=>i.source+':'+i.key!==stableKey(item))}:c);
  void persist(next,favorites).catch(()=>{});
 }
 function renameCollection(e:FormEvent){
  e.preventDefault();if(!editingCollection||!editingName.trim())return;
  const next=collections.collections.map(c=>c.id===editingCollection?{...c,name:editingName.trim().slice(0,70)}:c);
  void persist(next,favorites).then(()=>setEditingCollection('')).catch(()=>{});
 }
 function deleteCollection(){
  if(!selectedCollection||!window.confirm('Delete this collection? The original images will not be deleted.'))return;
  const next=collections.collections.filter(c=>c.id!==selectedCollection.id);
  void persist(next,favorites).then(()=>{setActiveCollection(next[0]?.id||'');setNotice('Collection removed. No original images were deleted.')}).catch(()=>{});
 }
 async function upload(e:FormEvent){
  e.preventDefault();if(!uploadFile)return;
  setUploading(true);setNotice('');
  try{
   const body=new FormData();body.set('file',uploadFile);body.set('purpose',uploadPurpose);body.set('title',uploadTitle||uploadFile.name);body.set('tags',uploadTags);
   const res=await fetch('/api/import',{method:'POST',body,credentials:'same-origin'});
   const obj=await res.json();
   if(!res.ok)throw new Error(obj.error||'Import failed');
   setShowImport(false);setUploadFile(null);setUploadTitle('');setUploadTags('');
   setQuery('');setDraft('');setTab('generated');
   setNotice('Image archived privately. Its MongoDB reference intake remains pending.');
  }catch(err){setNotice('Import error: '+readableError(err))}
  finally{setUploading(false)}
 }
 return <div className="shell">
  <aside className="rail">
   <div className="brand"><span className="brand-icon"><Images size={22}/></span><div><strong>DataPass</strong><small>Visual Library</small></div></div>
   <p className="nav-label">LIBRARY</p>
   <nav aria-label="Media sources">{SOURCES.map(t=><button key={t.value} className={'nav-item '+(tab===t.value?'current':'')} onClick={()=>setTab(t.value)}><FolderOpen size={16}/><span>{t.label}</span>{t.value==='selected'&&selected.size>0?<em>{selected.size}</em>:null}</button>)}</nav>
   <div className="rail-bottom"><ShieldCheck size={15}/><span>Private by default. Imports are never published automatically.</span></div>
  </aside>
  <main className="main">
   <header><div><div className="eyebrow">YOUR VISUAL REFERENCE WORKSPACE</div><h1>Visual Library</h1><p>Search MongoDB reference descriptions and browse your original Cloudflare images.</p></div><span className="account-label"><ShieldCheck size={15}/> Authenticated workspace</span></header>
   <div className="toolbar"><form className="search" onSubmit={e=>{e.preventDefault();setQuery(draft)}}><Search size={19}/><input aria-label="Search references or media" placeholder="Try: agent cockpit, diagram, workflow, UI…" value={draft} onChange={e=>setDraft(e.target.value)}/><button type="submit">Search</button></form>
    <button aria-label="Refresh media" className="tool" onClick={()=>void load(undefined,true)}><RefreshCcw size={17}/></button>
    <button aria-label="Filters" className="tool" onClick={()=>setShowFilters(x=>!x)}><Filter size={17}/></button>
    <button aria-label="Toggle layout" className="tool" onClick={()=>setListMode(x=>!x)}>{listMode?<Grid2X2 size={17}/>:<List size={17}/>}</button>
    <button className="import-button" onClick={()=>setShowImport(x=>!x)}><Upload size={16}/> Import</button>
   </div>
   {showFilters&&<div className="filters"><label>Media type <select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All files</option><option value="image">Images</option><option value="video">Video</option><option value="other">Other files</option></select></label><span>Filename search uses R2 keys. Reference search ranks MongoDB snapshot descriptions and tags; it is not vector search.</span></div>}
   {notice&&<div className="notice" role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss notice"><X size={14}/></button></div>}
   {showImport&&<form className="import-panel" onSubmit={e=>void upload(e)}><h3>Archive an image privately</h3><p>Upload an image created in ChatGPT or saved locally. MongoDB reference intake is a separate step.</p><div className="import-fields">
    <label>Image <input required type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>setUploadFile(e.target.files?.[0]||null)}/></label>
    <label>Title <input maxLength={160} value={uploadTitle} onChange={e=>setUploadTitle(e.target.value)} placeholder="Optional description"/></label>
    <label>Purpose <select value={uploadPurpose} onChange={e=>setUploadPurpose(e.target.value)}><option value="GENERATED_IMAGE">Generated image</option><option value="DESIGN_INSPIRATION">Design inspiration</option><option value="REFERENCE">Reference</option><option value="OTHER">Other</option></select></label>
    <label>Tags <input maxLength={360} value={uploadTags} onChange={e=>setUploadTags(e.target.value)} placeholder="agent, diagram, concept"/></label>
   </div><button type="submit" disabled={uploading||!uploadFile}>{uploading?'Archiving…':'Archive to private R2'}</button></form>}
   {tab==='collections'&&<section className="collections-panel" aria-label="Your collections"><div className="section-title"><div><h2>Collections</h2><span>Server-backed, visible on your other authenticated devices</span></div></div>
    {collectionError&&<div role="alert" className="error"><AlertCircle size={16}/> {collectionError}</div>}
    <form className="collection-create" onSubmit={createCollection}><input aria-label="New collection name" maxLength={70} placeholder="New collection name" value={newCollection} onChange={e=>setNewCollection(e.target.value)}/><button disabled={!collectionsLoaded||collectionBusy||!newCollection.trim()||collections.collections.length>=40} type="submit"><FolderPlus size={15}/> Create{recorded.length?' with selected':''}</button></form>
    <div className="collection-tabs">{collections.collections.map(c=><button key={c.id} className={'collection-tab '+(activeCollection===c.id?'current':'')} onClick={()=>setActiveCollection(c.id)}>{c.name}<span>{c.items.length}</span></button>)}{!collections.collections.length&&<p>No collections yet. Create one to curate your references.</p>}</div>
    {selectedCollection&&<div className="collection-actions">{editingCollection===activeCollection?<form onSubmit={renameCollection}><input aria-label="Rename collection" maxLength={70} value={editingName} onChange={e=>setEditingName(e.target.value)}/><button type="submit">Save name</button><button type="button" onClick={()=>setEditingCollection('')}>Cancel</button></form>:<><strong>{selectedCollection.name}</strong><button disabled={collectionBusy||!recorded.length} onClick={addSelectedToCollection}><Plus size={14}/> Add {recorded.length} selected</button><button onClick={()=>{setEditingCollection(activeCollection);setEditingName(selectedCollection.name)}}><Pencil size={14}/> Rename</button><button onClick={deleteCollection} disabled={collectionBusy}><Trash2 size={14}/> Delete collection</button></>}</div>}
   </section>}
   {!!query.trim()&&tab!=='public'&&<section className="reference-section" aria-label="MongoDB reference search results">
    <div className="section-title"><div><h2>Reference matches</h2><span>From MongoDB reference metadata · read-only snapshot {snapshotAt?snapshotAt.slice(0,10):''}</span></div><span>{searchBusy?'Searching…':references.length+' references'}</span></div>
    {searchError&&<div role="alert" className="error">Reference search: {searchError}</div>}
    {!searchBusy&&!searchError&&references.length===0&&<p className="ref-empty">No matching reference metadata. You can still browse matching R2 filenames below.</p>}
    <div className="reference-results">{references.slice(0,25).map(r=><article className="reference-card" key={r.id}>
     <div className="reference-images">{r.assets.slice(0,3).map(a=><button aria-label={'Open '+r.title} key={a.key} onClick={()=>setActive({id:'private:'+a.key,source:'private',key:a.key,title:r.title,size:0,mime:a.mime,url:a.url})}><img loading="lazy" alt={r.title} src={a.url}/></button>)}{!r.assets.length&&<span>No linked image</span>}</div>
     <div><div className="reference-code">{r.id} · metadata match</div><strong>{r.title}</strong><p>{r.visual||r.summary}</p><div className="reference-tags">{r.tags.slice(0,5).map(t=><span key={t}>{t}</span>)}</div></div>
     {r.assets[0]&&<button className="ref-select" onClick={()=>toggle({id:'private:'+r.assets[0].key,source:'private',key:r.assets[0].key,title:r.title,size:0,mime:r.assets[0].mime,url:r.assets[0].url})}>{selected.has('private:'+r.assets[0].key)?'Deselect':'Select image'}</button>}
    </article>)}</div>
   </section>}
   <div className="section-title"><div><h2>{SOURCES.find(s=>s.value===tab)?.label}</h2><span>{visible.length} visible · {items.length} loaded</span></div><div className="selection-tools"><strong>{selected.size} selected</strong><button disabled={!recorded.length} onClick={exportSelection}><Download size={15}/> Export manifest</button><button disabled={!selected.size} onClick={clearSelection}>Clear</button></div></div>
   {error&&<div role="alert" className="error"><strong>Unable to load images.</strong> {error}<button onClick={()=>void load(undefined,true)}>Retry</button></div>}
   {!busy&&!error&&visible.length===0&&<div className="empty"><Images size={30}/><h3>No matching images in this view</h3><p>Try another source, search or collection. Selected and favorite image pointers do not publish originals.</p></div>}
   <div className={listMode?'gallery list':'gallery'}>{visible.map(item=>{const chosen=selected.has(stableKey(item)),starred=favorites.has(stableKey(item));return <article key={stableKey(item)} className={'media '+(chosen?'picked':'')}>
    <div className="media-frame" onClick={()=>setActive(item)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')setActive(item)}} aria-label={'Open '+item.title}>{mediaType(item.key)==='image'?<img src={item.url} loading="lazy" alt={item.title}/>:<div className="no-preview">{mediaType(item.key)==='video'?'Video':'File'} preview</div>}</div>
    <div className="media-data"><div className="media-head"><span title={item.title}>{item.title}</span><button title="Favorite" aria-label={'Favorite '+item.title} className={'mini '+(starred?'active':'')} disabled={collectionBusy||!collectionsLoaded} onClick={()=>void favorite(item)}><Star size={17} fill={starred?'currentColor':'none'}/></button></div>
     <div className="meta"><span>{item.source==='private'?'PRIVATE R2':item.source==='generated'?'GENERATED / IMPORTED':'WEB ASSETS'}</span><span>{item.mime.split('/').pop()?.toUpperCase()}</span></div>
     <div className="media-actions"><button onClick={()=>toggle(item)}>{chosen?<CheckSquare size={16}/>:<Square size={16}/>} {chosen?'Selected':'Select'}</button><button aria-label={'Copy R2 key of '+item.title} title="Copy R2 key" onClick={()=>void navigator.clipboard?.writeText(item.key)}><Copy size={15}/></button>{tab==='collections'&&<button title="Remove from collection" aria-label={'Remove '+item.title+' from collection'} disabled={collectionBusy} onClick={()=>removeFromCollection(item)}><X size={15}/></button>}</div>
    </div></article>})}</div>
   {hasMore&&!error&&tab!=='collections'&&tab!=='selected'&&<div className="load"><button disabled={busy} onClick={()=>void load(cursor)}>{busy?'Loading…':'Load more'}</button></div>}
   {busy&&!items.length&&<p className="loading">Loading your media securely…</p>}
   {collectionError&&tab!=='collections'&&<div role="alert" className="error">Collection sync: {collectionError}</div>}
  </main>
  {active&&<div className="overlay" role="dialog" aria-modal="true" aria-label="Media viewer" onClick={()=>setActive(null)}><div className="viewer" onClick={e=>e.stopPropagation()}><div className="viewer-bar"><div><strong>{active.title}</strong><small>{active.source} / {active.key}</small></div><button aria-label="Close viewer" onClick={()=>setActive(null)}><X size={22}/></button></div>
   <div className="viewer-image"><button aria-label="Previous image" onClick={()=>move(-1)}><ChevronLeft/></button>{mediaType(active.key)==='image'?<img src={active.url} alt={active.title}/>:mediaType(active.key)==='video'?<video controls src={active.url}/>:<p>Preview unavailable for this file type.</p>}<button aria-label="Next image" onClick={()=>move(1)}><ChevronRight/></button></div>
   <div className="viewer-footer"><span>{activeIndex+1} / {previews.length}</span><div><button onClick={()=>toggle(active)}><CheckSquare size={16}/> {selected.has(stableKey(active))?'Deselect':'Select'}</button><button onClick={()=>void navigator.clipboard?.writeText(active.key)}><Copy size={16}/> Copy R2 key</button><a href={active.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Open original</a></div></div></div></div>}
 </div>;
}
export default App;
