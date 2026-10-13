import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, RefreshCw, Search } from 'lucide-react';

export type FacetField='domains'|'routes'|'purposes'|'scopes'|'topics'|'tags';
export type FacetPath=Array<{field:FacetField;value:string}>;
interface RecordFacet {id:string;domains:string[];routes:string[];purposes:string[];scopes:string[];topics:string[];tags:string[];hasMedia:boolean}
interface Taxonomy {schema:string;snapshotAt:string;count:number;entries:RecordFacet[]}
const NONE='__unclassified__';
const AXES:{label:string;fields:FacetField[]}[]=[
 {label:'Domains',fields:['domains','topics','tags']},
 {label:'Projects',fields:['routes','domains','topics']},
 {label:'Purposes',fields:['purposes','domains','tags']},
 {label:'Scopes',fields:['scopes','domains','topics']}
];
export function human(v:string){return v===NONE?'Unclassified':v.replaceAll('_',' ').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase())}
function getValues(r:RecordFacet,field:FacetField){const v=r[field];return Array.isArray(v)&&v.length?v:[NONE]}
function groups(rows:RecordFacet[],field:FacetField){
 const map=new Map<string,RecordFacet[]>();
 for(const r of rows)for(const v of new Set(getValues(r,field)))map.set(v,[...(map.get(v)||[]),r]);
 return [...map].map(([name,refs])=>({name,refs,count:refs.length})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
}
export default function FeedCategoryTree({path,activeAxis,onSelect,onSelectAxis}:{path:FacetPath;activeAxis:FacetField|null;onSelect:(path:FacetPath)=>void;onSelectAxis:(axis:FacetField)=>void}){
 const [index,setIndex]=useState<Taxonomy|null>(null),[error,setError]=useState(''),[term,setTerm]=useState('');
 const [open,setOpen]=useState<Set<string>>(()=>{try{
  const v=JSON.parse(localStorage.getItem('dvl:feed-tree-open:v1')||'["axis:Domains"]');
  return new Set(Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[]);
 }catch{return new Set(['axis:Domains'])}});
 const [revision,setRevision]=useState(0);
 useEffect(()=>{const abort=new AbortController();void (async()=>{try{
  const res=await fetch('/api/taxonomy',{credentials:'same-origin',cache:'no-store',signal:abort.signal});
  if(!res.ok)throw new Error('Category service '+res.status);
  const data=await res.json() as Taxonomy;
  if(data.schema!=='datapass.visual-gallery.taxonomy/1'||!Array.isArray(data.entries))throw new Error('Unexpected category format');
  setIndex(data);setError('');
 }catch(e){if(!abort.signal.aborted)setError(String(e))}})();return()=>abort.abort()},[revision]);
 useEffect(()=>{localStorage.setItem('dvl:feed-tree-open:v1',JSON.stringify([...open].slice(0,300)))},[open]);
 const visible=useMemo(()=>{if(!index)return [];const q=term.trim().toLowerCase();
  return q?index.entries.filter(r=>(['domains','routes','purposes','scopes','topics','tags'] as FacetField[])
    .some(f=>getValues(r,f).some(v=>v.toLowerCase().includes(q)))||r.id.toLowerCase().includes(q)):index.entries
 },[index,term]);
 function toggle(k:string){setOpen(old=>{const n=new Set(old);n.has(k)?n.delete(k):n.add(k);return n})}
 function branch(axis:string,fields:FacetField[],rows:RecordFacet[],level:number,previous:FacetPath):React.ReactNode{
  if(level>=fields.length)return null;
  return groups(rows,fields[level]).map(node=>{
   const next=[...previous,{field:fields[level],value:node.name}],key=axis+'/'+next.map(x=>x.field+'='+x.value).join('/');
   const expanded=open.has(key),selected=path.length===next.length&&path.every((x,i)=>x.field===next[i].field&&x.value===next[i].value);
   const expandable=level<fields.length-1;
   return <div role="treeitem" aria-level={level+2} aria-selected={selected} aria-expanded={expandable?expanded:undefined} key={key}>
    <button type="button" className={'feed-tree-row '+(selected?'selected':'')} style={{paddingLeft:level*12+5}}
     aria-label={human(node.name)} aria-expanded={expandable?expanded:undefined} title={human(node.name)}
     onClick={()=>{onSelect(next);if(expandable)toggle(key)}}>
     <span className="tree-chevron" aria-hidden="true">{expandable?(expanded?<ChevronDown size={14}/>:<ChevronRight size={14}/>):null}</span>
     <span className="tree-name">{human(node.name)}</span>
     <span className="tree-counter" aria-hidden="true">{node.count}</span>
    </button>
    {expandable&&expanded&&<div role="group">{branch(axis,fields,node.refs,level+1,next)}</div>}
   </div>;
  });
 }
 return <section className="feed-tree" aria-label="MongoDB category navigation">
  <div className="feed-tree-header"><strong>MONGO CATEGORIES</strong><button onClick={()=>setRevision(x=>x+1)} aria-label="Refresh categories"><RefreshCw size={13}/></button></div>
  <label className="feed-tree-filter"><Search size={14}/><input aria-label="Find a Mongo category" placeholder="Filter categories" value={term} onChange={e=>setTerm(e.target.value)}/></label>
  <button className={'feed-tree-all '+(!path.length?'selected':'')} onClick={()=>onSelect([])}><FolderOpen size={15}/> All references <span>{index?.count??'—'}</span></button>
  {error&&<p className="feed-tree-error" role="alert">{error}<button onClick={()=>setRevision(v=>v+1)}>Retry</button></p>}
  {!index&&!error&&<p className="feed-tree-note">Loading classifications…</p>}
  {index&&<div className="feed-tree-scroll" role="tree" aria-label="Reference categories">{AXES.map(a=>{
   const key='axis:'+a.label,expanded=open.has(key),axis=a.fields[0];
   const selected=activeAxis===axis&&path.length===0;
   return <div role="treeitem" aria-level={1} aria-expanded={expanded} aria-selected={selected} key={key}>
    <button type="button" className={'feed-tree-axis '+(selected?'selected':'')} aria-label={a.label} aria-expanded={expanded}
     aria-current={selected?'true':undefined}
     title={'Show '+a.label+' in feed, '+(expanded?'collapse':'expand')+' categories'}
     onClick={()=>{toggle(key);onSelectAxis(axis)}}>
     <span className="tree-chevron" aria-hidden="true">{expanded?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</span>
     <span className="tree-name">{a.label}</span>
     <span className="tree-counter" aria-hidden="true">{visible.length}</span>
    </button>
    {expanded&&<div role="group">{branch(a.label,a.fields,visible,0,[])}</div>}
   </div>;
  })}</div>}
  <p className="feed-tree-note">Virtual folders from existing Mongo classifications; references can appear in several branches.</p>
  {index&&<p className="feed-tree-sync">{index.count} references · {index.snapshotAt.slice(0,10)} snapshot</p>}
 </section>
}
