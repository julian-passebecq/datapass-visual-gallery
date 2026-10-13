import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, CheckSquare, ExternalLink, Image as ImageIcon, RefreshCw, Rss, Square } from 'lucide-react';
import type { MediaItem } from './types';
import {human,type FacetPath} from './FeedCategoryTree';

interface Asset {source:'private';key:string;url:string;title:string;mime:string}
interface ReferenceEntry {id:string;title:string;summary:string;visual:string;date:string;kind:string;sourceUrl?:string;domains:string[];routes:string[];purposes:string[];topics:string[];tags:string[];assets:Asset[]}
interface FeedPage {schema:string;snapshotAt:string;total:number;entries:ReferenceEntry[];cursor?:string;hasMore:boolean}
function asItem(x:Asset,title:string):MediaItem{return {id:'private:'+x.key,source:'private',key:x.key,title,mime:x.mime,url:x.url,size:0}}
function dateLabel(value:string){const date=new Date(value);return Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en',{dateStyle:'medium'}).format(date):'Date unknown'}
export default function ReferenceFeed({path,query,selected,onOpen,onSelect}:{path:FacetPath;query:string;selected:Set<string>;onOpen:(item:MediaItem)=>void;onSelect:(item:MediaItem)=>void}){
 const [items,setItems]=useState<ReferenceEntry[]>([]),[cursor,setCursor]=useState<string|undefined>(),[hasMore,setHasMore]=useState(false),[total,setTotal]=useState<number|null>(null),[snapshot,setSnapshot]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [media,setMedia]=useState<'all'|'images'>('all'),[order,setOrder]=useState<'newest'|'oldest'>('newest');
 const [columns,setColumns]=useState<2|3|4>(()=>{const n=Number(localStorage.getItem('dvl:feed-columns:v1'));return n===2||n===4?n:3});
 const pending=useRef<AbortController|null>(null),serial=useRef(0);
 const pathKey=JSON.stringify(path);
 const load=useCallback(async(next?:string,reset=false)=>{
  pending.current?.abort();const controller=new AbortController();pending.current=controller;
  const ticket=++serial.current;setBusy(true);setError('');
  try{
   const p=new URLSearchParams({limit:'24',media,order});
   if(path.length)p.set('path',btoa(pathKey));
   if(query.trim())p.set('q',query.trim());
   if(next)p.set('cursor',next);
   const r=await fetch('/api/feed?'+p,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   if(!r.ok){let err='Feed request failed: '+r.status;try{const v=await r.json();err=v.error||err}catch{}throw new Error(err)}
   const response=await r.json() as FeedPage;
   if(response.schema!=='datapass.visual-gallery.feed/1')throw new Error('Unexpected feed data format');
   if(serial.current!==ticket)return;
   setItems(old=>reset?response.entries:[...old,...response.entries.filter(x=>!old.some(y=>y.id===x.id))]);
   setTotal(response.total);setSnapshot(response.snapshotAt);setCursor(response.cursor);setHasMore(response.hasMore);
  }catch(e){if(serial.current===ticket&&!controller.signal.aborted){setError(e instanceof Error?e.message:String(e));if(reset){setItems([]);setCursor(undefined);setHasMore(false);setTotal(null)}}}
  finally{if(serial.current===ticket)setBusy(false)}
 },[media,order,query,pathKey]);
 useEffect(()=>{void load(undefined,true);return()=>{pending.current?.abort();serial.current++}},[load]);
 useEffect(()=>{localStorage.setItem('dvl:feed-columns:v1',String(columns))},[columns]);
 const breadcrumb=path.length?path.map(x=>human(x.value)).join(' / '):'All references';
 let previousDay='';
 return <section className="reference-feed" aria-label="MongoDB visual reference feed">
  <div className="reference-feed-head"><div><p className="reference-feed-kicker"><Rss size={15}/> MONGODB VISUAL FEED</p>
   <h2>{breadcrumb}</h2><p>Browse archived visuals, articles and ideas as a feed — not chat messages.</p></div>
   <div className="reference-feed-count">{total===null?'Loading':total+' matching references'}<small>Snapshot {snapshot?snapshot.slice(0,10):'pending'}</small></div>
  </div>
  <div className="reference-feed-toolbar"><label>View <select aria-label="Feed media filter" value={media} onChange={e=>setMedia(e.target.value as 'all'|'images')}><option value="all">All references</option><option value="images">With archived media</option></select></label>
   <label>Sort <select aria-label="Feed order" value={order} onChange={e=>setOrder(e.target.value as 'newest'|'oldest')}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
   <label>Cards per row <select aria-label="Feed columns" value={columns} onChange={e=>setColumns(Number(e.target.value) as 2|3|4)}><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
   <button onClick={()=>void load(undefined,true)}><RefreshCw size={14}/> Refresh</button>
  </div>
  {error&&<div className="error" role="alert">{error} <button onClick={()=>void load(undefined,true)}>Retry</button></div>}
  {!busy&&!error&&items.length===0&&<div className="empty"><Rss size={26}/><h3>No references found</h3><p>Try another branch or clear the search.</p></div>}
  <div className={'reference-feed-list feed-cols-'+columns}>{items.map(ref=>{
   const date=dateLabel(ref.date);
   const expandedText=ref.summary.length>160||(ref.visual&&ref.visual!==ref.summary&&ref.visual.length>110);
   return <div className="feed-grid-item" key={ref.id}>
    <article className="reference-feed-card">
     <div className="feed-card-meta"><span className="feed-card-kind">{human(ref.kind)}</span><time dateTime={ref.date||undefined} title={date}><CalendarDays size={12}/>{date}</time></div>
     <div className="feed-card-layout">
      <div className={'feed-card-media '+(ref.assets.length>1?'has-multiple':'')}>{ref.assets.length?ref.assets.slice(0,3).map((a,index)=>{
       const entry=asItem(a,ref.title),video=a.mime.startsWith('video/');
       return <button key={a.key} className={index===0?'feed-card-cover':'feed-card-additional'} aria-label={'Open '+ref.title+' media '+(index+1)} onClick={()=>onOpen(entry)}>
        {video?<span className="feed-card-video"><ImageIcon size={24}/> Video reference</span>:<img src={a.url} alt={ref.title+' thumbnail '+(index+1)} loading="lazy" decoding="async"/>}
       </button>;
      }):<div className="feed-card-no-image"><ImageIcon size={25}/><span>Link / text reference</span></div>}</div>
      <div className="feed-card-content">
       <span className="feed-card-id" title={ref.id}>{ref.id}</span>
       <h3 title={ref.title}>{ref.title}</h3>
       {ref.summary&&<p className="feed-card-excerpt">{ref.summary}</p>}
       {ref.visual&&ref.visual!==ref.summary&&<p className="feed-card-note">{ref.visual}</p>}
       {expandedText&&<details className="feed-card-more"><summary>Full description</summary>
        {ref.summary&&<p>{ref.summary}</p>}
        {ref.visual&&ref.visual!==ref.summary&&<p>{ref.visual}</p>}
       </details>}
       <div className="feed-card-tags">{[...ref.domains.slice(0,2),...ref.topics.slice(0,2),...ref.tags.slice(0,3)].map((x,i)=><span key={x+':'+i}>{x}</span>)}</div>
       <div className="feed-card-actions">
        {ref.assets[0]&&(()=>{const a=asItem(ref.assets[0],ref.title),checked=selected.has('private:'+a.key);return <button aria-label={(checked?'Deselect ':'Select ')+ref.title} onClick={()=>onSelect(a)}>{checked?<CheckSquare size={15}/>:<Square size={15}/>} {checked?'Selected':'Select image'}</button>})()}
        {ref.sourceUrl&&<a href={ref.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> Original source</a>}
        <span>{ref.assets.length} archived {ref.assets.length===1?'asset':'assets'}</span>
       </div>
      </div>
     </div>
    </article>
   </div>;
  })}</div>
  {hasMore&&!error&&<div className="feed-page-next"><button disabled={busy} onClick={()=>void load(cursor)}>{busy?'Loading…':'Load more references'}</button></div>}
  {busy&&<p role="status" className="feed-loading">Loading references…</p>}
  {total!==null&&items.length>0&&<p className="feed-paging">Showing {items.length} of {total} references · read-only MongoDB snapshot</p>}
 </section>;
}
