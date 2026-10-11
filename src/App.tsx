import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Images, Grid2X2, List, CheckSquare, Square, Star, Download, ExternalLink, X, ChevronLeft, ChevronRight, RefreshCcw, FolderOpen, ShieldCheck, Copy, Filter } from 'lucide-react';
import type { MediaItem, MediaPage, Source } from './types';
import { mediaType, stableKey } from './types';

type Tab = 'all' | Source | 'favorites' | 'selected';
const SOURCES: {value:Tab;label:string}[] = [{value:'all',label:'All media'},{value:'private',label:'Private references'},{value:'public',label:'Web assets'},{value:'favorites',label:'Favorites'},{value:'selected',label:'Selected'}];
function readSet(k:string): Set<string> { try { const value=JSON.parse(localStorage.getItem(k)||'[]'); return new Set(Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'):[]); } catch {return new Set()} }
function App(){
 const [tab,setTab]=useState<Tab>('all'),[query,setQuery]=useState(''),[draft,setDraft]=useState(''),[items,setItems]=useState<MediaItem[]>([]),[cursor,setCursor]=useState<string|undefined>(),[hasMore,setHasMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState<Set<string>>(()=>readSet('dvl:selected:v1')),[favorites,setFavorites]=useState<Set<string>>(()=>readSet('dvl:favorites:v1')),[active,setActive]=useState<MediaItem|null>(null),[listMode,setListMode]=useState(false),[showFilters,setShowFilters]=useState(false),[kind,setKind]=useState('all');
 const source:Source|'all'=tab==='public'||tab==='private'?tab:'all';
 const load=useCallback(async (next?:string, reset=false)=>{
   setBusy(true);setError('');
   try {
     const params=new URLSearchParams({source,limit:'80'});if(query.trim())params.set('q',query.trim());if(next)params.set('cursor',next);
     const resp=await fetch('/api/media?'+params,{credentials:'same-origin',cache:'no-store'});
     if(!resp.ok){let msg='Gallery request failed ('+resp.status+')';try{const x=await resp.json();msg=x.error||msg}catch{}throw new Error(msg)}
     const data=await resp.json() as MediaPage;
     setItems(prev=>reset ? data.items : [...prev.filter(p=>!data.items.some(d=>d.id===p.id)),...data.items]);
     setCursor(data.cursor);setHasMore(data.hasMore);
   }catch(e){setError(e instanceof Error?e.message:String(e)); if(reset)setItems([])}
   finally{setBusy(false)}
 },[source,query]);
 useEffect(()=>{void load(undefined,true)},[load]);
 useEffect(()=>localStorage.setItem('dvl:selected:v1',JSON.stringify([...selected])),[selected]);
 useEffect(()=>localStorage.setItem('dvl:favorites:v1',JSON.stringify([...favorites])),[favorites]);
 useEffect(()=>{function onEscape(e:KeyboardEvent){if(e.key==='Escape')setActive(null)}window.addEventListener('keydown',onEscape);return()=>window.removeEventListener('keydown',onEscape)},[]);
 const visible=useMemo(()=>items.filter(i=>(kind==='all'||mediaType(i.key)===kind) && (tab!=='favorites'||favorites.has(stableKey(i))) && (tab!=='selected'||selected.has(stableKey(i)))),[items,kind,tab,favorites,selected]);
 const toggle=(item:MediaItem)=>setSelected(old=>{const next=new Set(old),id=stableKey(item);next.has(id)?next.delete(id):next.add(id);return next});
 const favorite=(item:MediaItem)=>setFavorites(old=>{const next=new Set(old),id=stableKey(item);next.has(id)?next.delete(id):next.add(id);return next});
 function exportSelection(){const chosen=items.filter(i=>selected.has(stableKey(i))).map(({id,source,key,title,mime})=>({id,source,key,title,mime}));const blob=new Blob([JSON.stringify({schema:'datapass.visual-selection/1',exportedAt:new Date().toISOString(),items:chosen},null,2)],{type:'application/json'});const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download='datapass-visual-selection.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 const activeIndex=visible.findIndex(x=>x.id===active?.id);
 const move=(dir:number)=>{if(!visible.length)return;setActive(visible[(activeIndex+dir+visible.length)%visible.length])};
 return <div className="shell">
   <aside className="rail">
     <div className="brand"><span className="brand-icon"><Images size={22}/></span><div><strong>DataPass</strong><small>Visual Library</small></div></div>
     <p className="nav-label">LIBRARY</p>
     <nav aria-label="Media sources">{SOURCES.map(t=><button key={t.value} className={'nav-item '+(tab===t.value?'current':'')} onClick={()=>setTab(t.value)}><FolderOpen size={16}/><span>{t.label}</span>{t.value==='selected'&&selected.size>0?<em>{selected.size}</em>:null}</button>)}</nav>
     <div className="rail-bottom"><ShieldCheck size={15}/><span>Private by default. No public publishing.</span></div>
   </aside>
   <main className="main">
     <header><div><div className="eyebrow">YOUR VISUAL REFERENCE WORKSPACE</div><h1>Visual Library</h1><p>Search, inspect and curate Cloudflare images without exposing private originals.</p></div><span className="account-label"><ShieldCheck size={15}/> Authenticated workspace</span></header>
     <div className="toolbar"><form className="search" onSubmit={e=>{e.preventDefault();setQuery(draft)}}><Search size={19}/><input aria-label="Search media" placeholder="Search filenames, paths, references..." value={draft} onChange={e=>setDraft(e.target.value)}/><button type="submit">Search</button></form><button aria-label="Refresh" className="tool" onClick={()=>void load(undefined,true)}><RefreshCcw size={17}/></button><button aria-label="Filters" className="tool" onClick={()=>setShowFilters(x=>!x)}><Filter size={17}/></button><button aria-label="Toggle layout" className="tool" onClick={()=>setListMode(x=>!x)}>{listMode?<Grid2X2 size={17}/>:<List size={17}/>}</button></div>
     {showFilters&&<div className="filters"><label>Media type <select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All files</option><option value="image">Images</option><option value="video">Video</option><option value="other">Other files</option></select></label><span>Search currently matches R2 object keys. Mongo semantic metadata is a separate adapter.</span></div>}
     <div className="section-title"><div><h2>{SOURCES.find(s=>s.value===tab)?.label}</h2><span>{visible.length} visible · {items.length} loaded</span></div><div className="selection-tools"><strong>{selected.size} selected</strong><button disabled={!selected.size} onClick={exportSelection}><Download size={15}/> Export manifest</button><button disabled={!selected.size} onClick={()=>setSelected(new Set())}>Clear</button></div></div>
     {error&&<div role="alert" className="error"><strong>Unable to load images.</strong> {error}<button onClick={()=>void load(undefined,true)}>Retry</button></div>}
     {!busy&&!error&&visible.length===0&&<div className="empty"><Images size={30}/><h3>No matching images in this view</h3><p>Try another source or search query. Collections and favorites are saved only in this browser profile.</p></div>}
     <div className={listMode?'gallery list':'gallery'}>{visible.map(item=>{const chosen=selected.has(stableKey(item)),starred=favorites.has(stableKey(item));return <article key={item.id} className={'media '+(chosen?'picked':'')}>
       <div className="media-frame" onClick={()=>setActive(item)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')setActive(item)}} aria-label={'Open '+item.title}>{mediaType(item.key)==='image'?<img src={item.url} loading="lazy" alt={item.title}/>:<div className="no-preview">{mediaType(item.key)==='video'?'Video':'File'} preview</div>}</div>
       <div className="media-data"><div className="media-head"><span title={item.title}>{item.title}</span><button title="Favorite" aria-label={'Favorite '+item.title} className={'mini '+(starred?'active':'')} onClick={()=>favorite(item)}><Star size={17} fill={starred?'currentColor':'none'}/></button></div><div className="meta"><span>{item.source==='private'?'PRIVATE R2':'WEB ASSETS'}</span><span>{item.mime.split('/').pop()?.toUpperCase()}</span></div><div className="media-actions"><button onClick={()=>toggle(item)}>{chosen?<CheckSquare size={16}/>:<Square size={16}/>} {chosen?'Selected':'Select'}</button><button aria-label={'Copy R2 key of '+item.title} title="Copy R2 key" onClick={()=>void navigator.clipboard?.writeText(item.key)}><Copy size={15}/></button></div></div>
       </article>})}</div>
     {hasMore&&!error&&<div className="load"><button disabled={busy} onClick={()=>void load(cursor)}>{busy?'Loading...':'Load more'}</button></div>}
     {busy&&!items.length&&<p className="loading">Loading your media securely...</p>}
   </main>
   {active&&<div className="overlay" role="dialog" aria-modal="true" aria-label="Media viewer" onClick={()=>setActive(null)}><div className="viewer" onClick={e=>e.stopPropagation()}><div className="viewer-bar"><div><strong>{active.title}</strong><small>{active.source} / {active.key}</small></div><button aria-label="Close viewer" onClick={()=>setActive(null)}><X size={22}/></button></div><div className="viewer-image"><button aria-label="Previous image" onClick={()=>move(-1)}><ChevronLeft/></button>{mediaType(active.key)==='image'?<img src={active.url} alt={active.title}/>:mediaType(active.key)==='video'?<video controls src={active.url}/>:<p>Preview unavailable for this file type.</p>}<button aria-label="Next image" onClick={()=>move(1)}><ChevronRight/></button></div><div className="viewer-footer"><span>{activeIndex+1} / {visible.length}</span><div><button onClick={()=>toggle(active)}><CheckSquare size={16}/> {selected.has(stableKey(active))?'Deselect':'Select'}</button><button onClick={()=>void navigator.clipboard?.writeText(active.key)}><Copy size={16}/> Copy R2 key</button><a href={active.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/> Open original</a></div></div></div></div>}
 </div>
}
export default App;
