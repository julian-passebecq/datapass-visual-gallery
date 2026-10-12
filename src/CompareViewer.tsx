import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Minus, Plus, RotateCcw, X } from 'lucide-react';
import type { MediaItem } from './types';

interface Props {
 images:[MediaItem, MediaItem];
 onClose:()=>void;
 onRemove:(image:MediaItem)=>void;
}
/** The two images remain in their R2 buckets; comparison performs no writes. */
export default function CompareViewer({images,onClose,onRemove}:Props){
 const [zoom,setZoom]=useState(100);
 useEffect(()=>{
  const esc=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};
  window.addEventListener('keydown',esc);
  return()=>window.removeEventListener('keydown',esc);
 },[onClose]);
 return <div className="overlay compare-overlay" onClick={onClose}>
  <section role="dialog" aria-modal="true" aria-label="Compare two images" className="compare-dialog" onClick={e=>e.stopPropagation()}>
   <header className="compare-header">
    <div><h2>Compare images</h2><p>Private, side-by-side inspection. Neither image is modified or published.</p></div>
    <div className="compare-header-actions">
     <button aria-label="Zoom out" disabled={zoom<=60} onClick={()=>setZoom(n=>Math.max(60,n-20))}><Minus size={17}/></button>
     <span aria-live="polite">{zoom}%</span>
     <button aria-label="Zoom in" disabled={zoom>=240} onClick={()=>setZoom(n=>Math.min(240,n+20))}><Plus size={17}/></button>
     <button aria-label="Reset zoom" onClick={()=>setZoom(100)}><RotateCcw size={16}/></button>
     <button aria-label="Close comparison" className="compare-close" onClick={onClose}><X size={21}/></button>
    </div>
   </header>
   <div className="compare-panes">
    {images.map((image,index)=><figure className="compare-pane" key={image.source+':'+image.key}>
     <div className="compare-image-scroll">
      <img alt={'Comparison '+(index+1)+': '+image.title} src={image.url}
       style={{width:zoom===100?'auto':zoom+'%',maxWidth:zoom===100?'100%':'none',maxHeight:zoom===100?'100%':'none'}}
       decoding="async"/>
     </div>
     <figcaption>
      <div><span className="compare-index">{index===0?'A':'B'}</span>
       <strong title={image.title}>{image.title}</strong>
       <small>{image.source} · {image.mime} · {image.size?Math.round(image.size/1024)+' KB':'Size unavailable'}</small>
      </div>
      <div className="compare-actions">
       <button title="Copy R2 key" aria-label={'Copy R2 key for '+image.title} onClick={()=>void navigator.clipboard?.writeText(image.key)}><Copy size={15}/></button>
       <a href={image.url} target="_blank" rel="noopener noreferrer" title="Open authenticated original"><ExternalLink size={15}/></a>
       <button title="Remove from comparison" aria-label={'Remove '+image.title+' from comparison'} onClick={()=>onRemove(image)}><X size={16}/></button>
      </div>
     </figcaption>
    </figure>)}
   </div>
   <footer className="compare-footer"><Check size={15}/> Comparison is read-only. Originals remain in their current R2 buckets.</footer>
  </section>
 </div>
}
