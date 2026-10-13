import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CheckSquare, ExternalLink, Image as ImageIcon, RefreshCw, Rss, Square, Tags, X } from 'lucide-react';
import type { MediaItem } from './types';
import {human,type FacetField,type FacetPath} from './FeedCategoryTree';

interface Asset {source:'private';key:string;url:string;title:string;mime:string}
interface ReferenceEntry {id:string;title:string;summary:string;visual:string;date:string;kind:string;sourceUrl?:string;domains:string[];routes:string[];purposes:string[];topics:string[];tags:string[];assets:Asset[]}
interface FeedPage {schema:string;snapshotAt:string;total:number;entries:ReferenceEntry[];cursor?:string;hasMore:boolean}
interface TaxonomyEntry {id:string;domains:string[];routes:string[];purposes:string[];scopes:string[];topics:string[];tags:string[]}
interface TaxonomyResult {schema:string;entries:TaxonomyEntry[];snapshotAt:string}
interface CategoryOption {value:string;count:number}
const ROOT_LABELS:Partial<Record<FacetField,string>>={domains:'Domains',routes:'Projects',purposes:'Purposes',scopes:'Scopes'};
function asItem(x:Asset,title:string):MediaItem{return {id:'private:'+x.key,source:'private',key:x.key,title,mime:x.mime,url:x.url,size:0}}
function dateLabel(value:string){const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('en',{dateStyle:'medium'}).format(d):'Date unknown'}
function categoryOptions(rows:TaxonomyEntry[],field:FacetField):CategoryOption[]{
 const counts=new Map<string,number>();
 for(const row of rows){
  const values=Array.isArray(row[field])?row[field]:[];
  for(const value of new Set(values.filter(x=>typeof x==='string'&&x.length))){
   counts.set(value,(counts.get(value)||0)+1);
  }
 }
 return [...counts].map(([value,count])=>({value,count}))
  .sort((a,b)=>b.count-a.count||a.value.localeCompare(b.value));
}
function readColumnChoice():2|3|4{
 const current=localStorage.getItem('dvl:feed-columns:v2');
 if(current==='2'||current==='3'||current==='4')return Number(current) as 2|3|4;
 // v1 wrote 3 even when it was only the former default. Preserve explicit 2 or 4.
 const previous=localStorage.getItem('dvl:feed-columns:v1');
 return previous==='2'?2:4;
}
export default function ReferenceFeed({path,axis,query,selected,onOpen,onSelect,onChooseAxisValue,onToggleTag,onClearFilters}:{
 path:FacetPath;axis:FacetField|null;query:string;selected:Set<string>;
 onOpen:(item:MediaItem)=>void;onSelect:(item:MediaItem)=>void;
 onChooseAxisValue:(field:FacetField,value:string)=>void;onToggleTag:(tag:string)=>void;
 onClearFilters:()=>void;
}){
 const [items,setItems]=useState<ReferenceEntry[]>([]),[cursor,setCursor]=useState<string|undefined>(),[hasMore,setHasMore]=useState(false);
 const [total,setTotal]=useState<number|null>(null),[snapshot,setSnapshot]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [media,setMedia]=useState<'all'|'images'>('all'),[order,setOrder]=useState<'newest'|'oldest'>('newest');
 const [columns,setColumns]=useState<2|3|4>(readColumnChoice);
 const [axisCategories,setAxisCategories]=useState<CategoryOption[]>([]),[axisError,setAxisError]=useState('');
 const [showAllCategories,setShowAllCategories]=useState(false);
 const pending=useRef<AbortController|null>(null),serial=useRef(0);
 const pathKey=JSON.stringify(path);

 const load=useCallback(async(next?:string,reset=false)=>{
  pending.current?.abort();const controller=new AbortController();pending.current=controller;
  const ticket=++serial.current;setBusy(true);setError('');
  try{
   const p=new URLSearchParams({limit:'24',media,order});
   if(axis)p.set('axis',axis);
   if(path.length)p.set('path',btoa(pathKey));
   if(query.trim())p.set('q',query.trim());
   if(next)p.set('cursor',next);
   const response=await fetch('/api/feed?'+p,{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   if(!response.ok){let msg='Feed request failed: '+response.status;try{const j=await response.json();msg=j.error||msg}catch{}throw new Error(msg)}
   const data=await response.json() as FeedPage;
   if(data.schema!=='datapass.visual-gallery.feed/1')throw new Error('Unexpected feed format');
   if(serial.current!==ticket)return;
   setItems(old=>reset?data.entries:[...old,...data.entries.filter(x=>!old.some(y=>y.id===x.id))]);
   setTotal(data.total);setSnapshot(data.snapshotAt);setCursor(data.cursor);setHasMore(data.hasMore);
  }catch(e){
   if(serial.current===ticket&&!controller.signal.aborted){
    setError(e instanceof Error?e.message:String(e));
    if(reset){setItems([]);setCursor(undefined);setHasMore(false);setTotal(null)}
   }
  }finally{if(serial.current===ticket)setBusy(false)}
 },[media,order,query,pathKey,axis]);
 useEffect(()=>{void load(undefined,true);return()=>{pending.current?.abort();serial.current++}},[load]);
 useEffect(()=>{localStorage.setItem('dvl:feed-columns:v2',String(columns))},[columns]);
 useEffect(()=>{
  setShowAllCategories(false);
  if(!axis){setAxisCategories([]);setAxisError('');return}
  const abort=new AbortController();
  void (async()=>{try{
   const response=await fetch('/api/taxonomy',{credentials:'same-origin',cache:'no-store',signal:abort.signal});
   if(!response.ok)throw new Error('Category index unavailable: '+response.status);
   const data=await response.json() as TaxonomyResult;
   if(data.schema!=='datapass.visual-gallery.taxonomy/1'||!Array.isArray(data.entries))throw new Error('Unexpected category index format');
   if(!abort.signal.aborted){setAxisCategories(categoryOptions(data.entries,axis));setAxisError('')}
  }catch(e){if(!abort.signal.aborted){setAxisCategories([]);setAxisError(e instanceof Error?e.message:String(e))}}
  })();
  return()=>abort.abort();
 },[axis]);

 const breadcrumb=path.length?path.map(x=>x.field==='tags'?'#'+x.value:human(x.value)).join(' / '):axis?(ROOT_LABELS[axis]||human(axis)):'All references';
 const hasTagFilter=path.some(x=>x.field==='tags');
 const shownAxisCategories=useMemo(()=>showAllCategories?axisCategories:axisCategories.slice(0,12),[axisCategories,showAllCategories]);

 return <section className="reference-feed" aria-label="MongoDB visual reference feed">
  <div className="reference-feed-head"><div><p className="reference-feed-kicker"><Rss size={15}/> MONGODB VISUAL FEED</p>
   <h2>{breadcrumb}</h2>
   <p>{axis&&!path.length?'Choose a category below to filter this '+(ROOT_LABELS[axis]||axis)+' view.':'Browse archived visuals, articles and ideas — not chat messages.'}</p></div>
   <div className="reference-feed-count">{total===null?'Loading':total+' matching references'}<small>Snapshot {snapshot?snapshot.slice(0,10):'pending'}</small></div>
  </div>
  {axis&&!path.length&&<section className="feed-axis-overview" aria-label={(ROOT_LABELS[axis]||axis)+' categories'}>
   <div className="feed-axis-heading"><strong>{ROOT_LABELS[axis]||human(axis)} categories</strong><span>Select one to filter the reference cards</span></div>
   {axisError?<div className="feed-axis-error" role="alert">{axisError}</div>:axisCategories.length===0?<p className="feed-axis-loading">Loading classified categories…</p>:
    <div className="feed-axis-options">{shownAxisCategories.map(entry=><button type="button" key={entry.value}
     onClick={()=>onChooseAxisValue(axis,entry.value)} aria-label={'Filter '+(ROOT_LABELS[axis]||axis)+' by '+human(entry.value)}>
     {human(entry.value)} <span>{entry.count}</span></button>)}
     {!showAllCategories&&axisCategories.length>12&&<button className="feed-axis-showall" onClick={()=>setShowAllCategories(true)}>+{axisCategories.length-12} more categories</button>}
    </div>}
  </section>}
  {path.length>0&&<div className="feed-active-filter" role="status"><Tags size={14}/>
   <span>Filtered by {path.map(x=>x.field==='tags'?'#'+x.value:human(x.value)).join(' / ')}</span>
   <button type="button" onClick={onClearFilters} aria-label="Clear all category and tag filters"><X size={14}/> Clear filters</button>
  </div>}
  <div className="reference-feed-toolbar">
   <label>View <select aria-label="Feed media filter" value={media} onChange={e=>setMedia(e.target.value as 'all'|'images')}><option value="all">All references</option><option value="images">With archived media</option></select></label>
   <label>Sort <select aria-label="Feed order" value={order} onChange={e=>setOrder(e.target.value as 'newest'|'oldest')}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
   <label>Cards per row <select aria-label="Feed columns" value={columns} onChange={e=>setColumns(Number(e.target.value) as 2|3|4)}><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>
   <button onClick={()=>void load(undefined,true)}><RefreshCw size={14}/> Refresh</button>
  </div>
  {error&&<div className="error" role="alert">{error} <button onClick={()=>void load(undefined,true)}>Retry</button></div>}
  {!busy&&!error&&items.length===0&&<div className="empty"><Rss size={26}/><h3>No references found</h3><p>Choose another category, tag, or clear the current filter.</p></div>}
  <div className={'reference-feed-list feed-cols-'+columns}>{items.map(ref=>{
   const longDescription=ref.summary.length>90||Boolean(ref.visual&&ref.visual!==ref.summary);
   const tags=[...new Set(ref.tags)];
   const selectedTag=path.find(x=>x.field==='tags')?.value;
   const tagButton=(value:string)=><button key={value} type="button"
     className={'feed-card-tag '+(selectedTag===value?'active':'')}
     aria-label={(selectedTag===value?'Remove filter for tag ':'Filter by tag ')+value}
     aria-pressed={selectedTag===value}
     title={'Filter references by #'+value}
     onClick={()=>onToggleTag(value)}>#{value}</button>;
   return <div className="feed-grid-item" key={ref.id}>
    <article className="reference-feed-card">
     <div className="feed-card-meta"><span className="feed-card-kind">{human(ref.kind)}</span><time dateTime={ref.date||undefined} title={dateLabel(ref.date)}><CalendarDays size={12}/>{dateLabel(ref.date)}</time></div>
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
       {longDescription&&<details className="feed-card-more"><summary>Read full description</summary>
        {ref.summary&&<p>{ref.summary}</p>}
        {ref.visual&&ref.visual!==ref.summary&&<p>{ref.visual}</p>}
       </details>}
       {(ref.domains.length>0||ref.topics.length>0)&&<div className="feed-card-context" title={[...ref.domains,...ref.topics].join(' · ')}>{[...ref.domains.slice(0,1),...ref.topics.slice(0,1)].join(' / ')}</div>}
       {tags.length>0&&<div className="feed-card-tags" aria-label={'Tags for '+ref.title}>
        {tags.slice(0,2).map(tagButton)}
        {tags.length>2&&<details className="feed-card-tag-details"><summary aria-label={'Show '+(tags.length-2)+' additional tags'}>+{tags.length-2} tags</summary>
         <div className="feed-card-extra-tags">{tags.slice(2).map(tagButton)}</div></details>}
       </div>}
       {hasTagFilter&&selectedTag&&!tags.includes(selectedTag)&&<span className="feed-card-filter-warning">Tag does not match current filter</span>}
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
