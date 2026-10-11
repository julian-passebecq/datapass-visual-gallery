export type Source = 'private' | 'public' | 'generated';
export interface MediaItem { id:string; source:Source; key:string; title:string; size:number; uploaded?:string; mime:string; url:string; }
export interface MediaPage { items:MediaItem[]; cursor?:string; hasMore:boolean; sources:{private:boolean;public:boolean}; }
export interface ApiError { error:string; code?:string }
export function fileLabel(key:string) { try { return decodeURIComponent(key.split('/').pop() || key) } catch {return key.split('/').pop() || key} }
export function mediaType(key:string) { return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(key) ? 'image' : /\.(mp4|webm|mov)$/i.test(key) ? 'video' : 'other' }
export function stableKey(item:Pick<MediaItem,'source'|'key'>){ return item.source+':'+item.key; }

export interface StoredImage {source:Source; key:string; title:string; mime?:string}
export interface ReferenceMatch {
 id:string; title:string; summary:string; visual:string; tags:string[]; topics:string[]; score:number;
 assets:Array<{source:'private';key:string;url:string;title:string;mime:string;assetId?:string|null}>
}
export interface ReferenceResult {
 schema:string; query:string; mode:string; source:string; snapshotAt:string; totalReferences:number;
 matched:ReferenceMatch[];
}
export interface Collection {id:string;name:string;items:StoredImage[];createdAt:string;updatedAt:string}
export interface CollectionState {schema:string;revision:string;collections:Collection[];favorites:string[];updatedAt:string}
export function fromStored(i:StoredImage):MediaItem {
 const source=i.source==='generated'?'private':i.source;
 return {id:i.source+':'+i.key,source:i.source,key:i.key,title:i.title,size:0,mime:i.mime||'image/png',url:'/api/file/'+source+'/'+i.key.split('/').map(encodeURIComponent).join('/')};
}
