export type Source = 'private' | 'public';
export interface MediaItem { id:string; source:Source; key:string; title:string; size:number; uploaded?:string; mime:string; url:string; }
export interface MediaPage { items:MediaItem[]; cursor?:string; hasMore:boolean; sources:{private:boolean;public:boolean}; }
export interface ApiError { error:string; code?:string }
export function fileLabel(key:string) { try { return decodeURIComponent(key.split('/').pop() || key) } catch {return key.split('/').pop() || key} }
export function mediaType(key:string) { return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(key) ? 'image' : /\.(mp4|webm|mov)$/i.test(key) ? 'video' : 'other' }
export function stableKey(item:Pick<MediaItem,'source'|'key'>){ return item.source+':'+item.key; }
