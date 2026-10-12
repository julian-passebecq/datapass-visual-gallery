/*
 * The reference catalog in CATALOG (Workers KV) is a derived READ-ONLY snapshot
 * of MongoDB Atlas reference_memory. MongoDB remains the source of truth.
 * User-owned collections are stored separately, scoped by verified Access sub.
 */
export interface GalleryEnv { CATALOG: KVNamespace; PRIVATE_MEDIA: R2Bucket; WEB_ASSETS: R2Bucket }
type Source='private'|'public'|'generated';
interface StoredImage { source:Source;key:string;title:string;mime?:string }
interface GalleryCollection {id:string;name:string;items:StoredImage[];createdAt:string;updatedAt:string}
interface GalleryState {schema:string;revision:string;collections:GalleryCollection[];favorites:string[];updatedAt:string}
interface CatalogAsset {key:string;mime?:string|null;asset_id?:string}
interface Reference {id:string;title:string;summary:string;visual:string;aliases:string[];search_text:string;tags:string[];topics:string[];domains:string[];routes:string[];scopes:string[];purposes:string[];visual_elements:string[];assets:CatalogAsset[]}
interface CatalogSnapshot {schema:string;refreshed_at:string;references:Reference[]}
const KEY='catalog-v1';
const PREFIX='collections-v1:';
const IMPORT_PREFIX='originals/gallery-import/';
const allowedSource=new Set(['private','public','generated']);
const knownPurposes=new Set(['GENERATED_IMAGE','DESIGN_INSPIRATION','REFERENCE','OTHER']);
function response(data:unknown,status=200):Response {return Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}})}
function err(message:string,status:number):Response{return response({error:message},status)}
function words(s:string):string[]{return (s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(x=>x.length>1)}
function norm(s:string):string{return words(s).join(' ')}
const common=new Set(['the','and','with','for','that','this','from','des','les','une','pour','dans','are','can','you','your','how','what','which']);
function rank(r:Reference,q:string,tokens:string[]):number{
 const bands:[string,number][]=[
 [r.id,12],[r.title,12],[r.aliases.join(' '),9],
 [r.tags.join(' '),9],[r.visual_elements.join(' '),7],[r.topics.join(' '),6],
 [r.domains.join(' '),5],[r.routes.join(' '),4],
 [r.visual,4],[r.summary,3],[r.search_text,3],
 [r.purposes.join(' '),2]];
 let result=0;const phrase=norm(q);
 for(const [text,weight] of bands){
  const value=norm(String(text||''));
  if(!value)continue;
  if(phrase.length>3&&value.includes(phrase))result+=weight*4;
  for(const term of tokens){if(value.split(' ').some(w=>w===term||w.startsWith(term)&&term.length>3))result+=weight}
 }
 return result;
}
function fileURL(source:Source,key:string){return '/api/file/'+(source==='generated'?'private':source)+'/'+key.split('/').map(encodeURIComponent).join('/')}
export async function queryCatalog(req:Request,env:GalleryEnv):Promise<Response>{
 if(!env.CATALOG)return err('Search index binding is not configured',503);
 const u=new URL(req.url),q=(u.searchParams.get('q')||'').trim().slice(0,180),limit=Math.min(50,Math.max(1,Number(u.searchParams.get('limit')||30)||30));
 const snapshot=await env.CATALOG.get(KEY,'json') as CatalogSnapshot|null;
 if(!snapshot||snapshot.schema!=='datapass.visual-gallery.catalog/1'||!Array.isArray(snapshot.references))return err('Reference index unavailable; MongoDB source is unchanged',503);
 const tokens=[...new Set(words(q).filter(x=>!common.has(x)))].slice(0,12);
 const ranked=q&&tokens.length?snapshot.references.map(r=>({r,score:rank(r,q,tokens)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.r.id.localeCompare(b.r.id)).slice(0,limit):[];
 return response({schema:'datapass.visual-gallery.search/1',query:q,mode:'metadata-relevance',vectorSearch:false,source:'MongoDB snapshot (read-only)',snapshotAt:snapshot.refreshed_at,totalReferences:snapshot.references.length,matched:ranked.map(({r,score})=>({
  id:r.id,title:r.title,summary:r.summary,visual:r.visual,tags:r.tags,topics:r.topics,score,
  assets:r.assets.filter(a=>a.key&&a.key.startsWith('originals/')&&a.key.length<800).slice(0,12).map(a=>({source:'private',key:a.key,url:fileURL('private',a.key),title:r.title,mime:a.mime||'image/png',assetId:a.asset_id||null}))
 }))});
}
function cleanImage(x:unknown):StoredImage|null{
 if(!x||typeof x!=='object')return null;
 const a=x as Partial<StoredImage>;
 if(!a.source||!allowedSource.has(a.source)||typeof a.key!=='string'||!a.key.startsWith('originals/')||a.key.length>800||typeof a.title!=='string')return null;
 if(a.source==='generated'&&!a.key.startsWith(IMPORT_PREFIX))return null;
 return {source:a.source,key:a.key,title:a.title.slice(0,160),mime:typeof a.mime==='string'?a.mime.slice(0,80):undefined}
}
async function userKey(subject:string):Promise<string>{
 const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(subject));
 return PREFIX+Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
}
const blank=():GalleryState=>({schema:'datapass.visual-gallery.collections/1',revision:'initial',collections:[],favorites:[],updatedAt:''});
async function readState(env:GalleryEnv,subject:string):Promise<GalleryState>{
 const obj=await env.CATALOG.get(await userKey(subject),'json') as GalleryState|null;
 return obj&&obj.schema==='datapass.visual-gallery.collections/1'&&Array.isArray(obj.collections)&&Array.isArray(obj.favorites)?obj:blank();
}
export async function getCollections(env:GalleryEnv,subject:string):Promise<Response>{
 if(!env.CATALOG)return err('Collection store unavailable',503);
 return response(await readState(env,subject));
}
function validateCollections(raw:unknown):{collections:GalleryCollection[];favorites:string[]}|null{
 if(!raw||typeof raw!=='object')return null;
 const v=raw as {collections?:unknown;favorites?:unknown};
 if(!Array.isArray(v.collections)||v.collections.length>40||!Array.isArray(v.favorites)||v.favorites.length>1000)return null;
 const collections:GalleryCollection[]=[];const ids=new Set<string>();
 for(const item of v.collections){
  if(!item||typeof item!=='object')return null;
  const c=item as GalleryCollection;
  if(typeof c.id!=='string'||!/^[-_a-zA-Z0-9]{3,80}$/.test(c.id)||ids.has(c.id)||typeof c.name!=='string'||!c.name.trim()||c.name.length>70||!Array.isArray(c.items)||c.items.length>200)return null;
  ids.add(c.id);const entries:StoredImage[]=[];const seen=new Set<string>();
  for(const rawImage of c.items){const image=cleanImage(rawImage);if(!image)return null;const k=image.source+':'+image.key;if(!seen.has(k)){seen.add(k);entries.push(image)}}
  collections.push({id:c.id,name:c.name.trim(),items:entries,createdAt:String(c.createdAt||'').slice(0,45),updatedAt:new Date().toISOString()});
 }
 if(!v.favorites.every(x=>typeof x==='string'&&x.length<=850&&/^(private|public|generated):originals\//.test(x)))return null;
 return {collections,favorites:[...new Set(v.favorites as string[])]};
}
export async function putCollections(req:Request,env:GalleryEnv,subject:string):Promise<Response>{
 if(!env.CATALOG)return err('Collection store unavailable',503);
 if(req.headers.get('origin')!==new URL(req.url).origin)return err('Origin validation required',403);
 const length=Number(req.headers.get('content-length')||0);if(length>120000)return err('Collection request too large',413);
 const text=await req.text();if(text.length>120000)return err('Collection request too large',413);
 let body:unknown;try{body=JSON.parse(text)}catch{return err('Invalid JSON',400)}
 const valid=validateCollections(body);if(!valid)return err('Invalid collection document',400);
 const previous=await readState(env,subject);
 // Best-effort stale write rejection. KV is eventually consistent; do not claim transactional CAS.
 if(req.headers.get('if-match')!==previous.revision)return err('Collections changed in another session; reload before saving',409);
 const state:GalleryState={schema:'datapass.visual-gallery.collections/1',revision:crypto.randomUUID(),collections:valid.collections,favorites:valid.favorites,updatedAt:new Date().toISOString()};
 await env.CATALOG.put(await userKey(subject),JSON.stringify(state));
 return response(state);
}
function detect(bytes:Uint8Array):{ext:string;mime:string}|null{
 if(bytes.length>8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10)return {ext:'png',mime:'image/png'};
 if(bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {ext:'jpg',mime:'image/jpeg'};
 if(bytes.length>12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return {ext:'webp',mime:'image/webp'};
 if(bytes.length>6&&['GIF87a','GIF89a'].includes(String.fromCharCode(...bytes.slice(0,6))))return {ext:'gif',mime:'image/gif'};
 return null;
}
export async function importImage(req:Request,env:GalleryEnv):Promise<Response>{
 if(req.headers.get('origin')!==new URL(req.url).origin)return err('Origin validation required',403);
 const size=Number(req.headers.get('content-length')||0);if(size>10*1024*1024)return err('Image request exceeds 10 MB',413);
 if(!req.headers.get('content-type')?.startsWith('multipart/form-data'))return err('Expected multipart image upload',415);
 const fields=await req.formData(),image=fields.get('file'),purpose=String(fields.get('purpose')||'REFERENCE');
 if(!(image instanceof File)||!image.size||image.size>8*1024*1024||!knownPurposes.has(purpose))return err('Invalid image, size or purpose',400);
 const body=new Uint8Array(await image.arrayBuffer()),type=detect(body);
 if(!type)return err('Only valid PNG, JPEG, WebP and GIF images are supported',415);
 const name=String(fields.get('title')||image.name||'Imported image').slice(0,160).trim();
 const tags=String(fields.get('tags')||'').slice(0,360).split(',').map(x=>x.trim()).filter(Boolean).slice(0,12);
 const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),x=>x.toString(16).padStart(2,'0')).join('');
 const date=new Date().toISOString().slice(0,10),key=IMPORT_PREFIX+date+'/'+crypto.randomUUID()+'.'+type.ext;
 await env.PRIVATE_MEDIA.put(key,body,{httpMetadata:{contentType:type.mime},customMetadata:{purpose,title:name,tags:JSON.stringify(tags),sha256:sha,intake_status:'PENDING_REFERENCE_INTAKE'}});
 return response({status:'archived_private',intake:'PENDING_REFERENCE_INTAKE',item:{id:'generated:'+key,source:'generated',key,title:name,mime:type.mime,size:body.length,url:fileURL('generated',key)},sha256:sha},201);
}
