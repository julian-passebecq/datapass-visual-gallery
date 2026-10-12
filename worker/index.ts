import { createRemoteJWKSet, jwtVerify } from 'jose';
import { queryCatalog, getCollections, putCollections, importImage } from './library';
import type { GalleryEnv } from './library';

interface Env extends GalleryEnv {
 PRIVATE_MEDIA:R2Bucket;WEB_ASSETS:R2Bucket;ASSETS:Fetcher;
 ACCESS_TEAM_DOMAIN:string;ACCESS_AUD:string;PUBLIC_ORIGIN?:string;
}
type Source='private'|'public'|'generated';
interface Item { id:string;source:Source;key:string;title:string;size:number;uploaded?:string;mime:string;url:string }
const MIME:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime'};
const allowedExtensions=new Set(Object.keys(MIME));
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function extension(key:string){return key.split('.').pop()?.toLowerCase()||''}
function validMedia(key:string){return allowedExtensions.has(extension(key))}
function safeTitle(key:string){return key.split('/').filter(Boolean).at(-1)||key}
function exactOrigin(url:string,configured?:string){if(!configured)return true;try{return new URL(url).origin===new URL(configured).origin}catch{return false}}
function bucketOf(env:Env,source:Source){return source==='public'?env.WEB_ASSETS:env.PRIVATE_MEDIA}
function parseSource(s:string|null):Source|'all'|null{return s===null||s==='all'?'all':s==='private'||s==='public'||s==='generated'?s:null}
function sourceFromEncoded(s:string):Source|null {return s==='private'||s==='public'?s:null}
function itemOf(o:R2Object,source:Source):Item{
 const key=o.key;const actual:Source=source==='private'&&key.startsWith('originals/gallery-import/')?'generated':source;
 return {id:actual+':'+key,source:actual,key,title:safeTitle(key),size:o.size,uploaded:o.uploaded?.toISOString(),mime:MIME[extension(key)]||'application/octet-stream',url:'/api/file/'+(actual==='generated'?'private':actual)+'/'+key.split('/').map(encodeURIComponent).join('/')};
}
async function authenticated(request:Request,env:Env):Promise<string|false>{
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return false;
 const jwt=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!jwt)return false;
 try{
  const team=new URL(env.ACCESS_TEAM_DOMAIN);
  if(team.protocol!=='https:'||!team.hostname.endsWith('.cloudflareaccess.com'))return false;
  const jwks=createRemoteJWKSet(new URL('/cdn-cgi/access/certs',team));
  const {payload}=await jwtVerify(jwt,jwks,{issuer:team.origin,audience:env.ACCESS_AUD,algorithms:['RS256','ES256']});
  return typeof payload.sub==='string'&&payload.sub?payload.sub:false;
 }catch{return false}
}
type ListingCursor={s:Source;c:string;o:number;q:string};
function asCursor(s:Source,c:string,o:number,q:string):string{
 return btoa(JSON.stringify({s,c,o,q} satisfies ListingCursor));
}
export async function list(request:Request,env:Env){
 const p=new URL(request.url).searchParams;
 const source=parseSource(p.get('source'));if(!source)return json({error:'Invalid source'},400);
 const limit=Math.max(1,Math.min(100,Number(p.get('limit')||60)||60));
 const q=(p.get('q')||'').trim().toLowerCase().slice(0,200);
 const rawCursor=p.get('cursor')||'';
 const sources:Source[]=source==='all'?['private','public']:[source];
 let state:ListingCursor|undefined;
 if(rawCursor){
  if(rawCursor.length>2048)return json({error:'Invalid cursor'},400);
  try{
   const v=JSON.parse(atob(rawCursor)) as ListingCursor;
   if(!v||!sources.includes(v.s)||typeof v.c!=='string'||v.c.length>1024||
      !Number.isInteger(v.o)||v.o<0||v.o>1000||v.q!==q)throw new Error('Invalid listing cursor');
   state=v;
  }catch{return json({error:'Invalid cursor or query mismatch'},400)}
 }
 const items:Item[]=[];
 const pageSize=Math.max(100,Math.min(400,limit*2));
 for(let si=state?sources.indexOf(state.s):0;si<sources.length;si++){
  const s=sources[si];
  const bucket=bucketOf(env,s);
  let cursor=state?.s===s?state.c:'';
  let offset=state?.s===s?state.o:0;
  let exhausted=false;
  for(let scanned=0;scanned<8;scanned++){
   const page=await bucket.list({limit:pageSize,...(cursor?{cursor}:{}),
    ...(s==='generated'?{prefix:'originals/gallery-import/'}:{})});
   if(offset>page.objects.length)return json({error:'Expired listing cursor; reload results'},409);
   for(let j=offset;j<page.objects.length;j++){
    const obj=page.objects[j];
    if(!validMedia(obj.key)||q&&!obj.key.toLowerCase().includes(q))continue;
    items.push(itemOf(obj,s));
    if(items.length===limit){
     const next=j+1<page.objects.length?asCursor(s,cursor,j+1,q):
      page.truncated&&page.cursor?asCursor(s,page.cursor,0,q):
      si<sources.length-1?asCursor(sources[si+1],'',0,q):undefined;
     return json({items,cursor:next,hasMore:Boolean(next),sources:{private:true,public:true}});
    }
   }
   if(!page.truncated){exhausted=true;break}
   if(!page.cursor)return json({error:'R2 listing cursor missing'},502);
   cursor=page.cursor;offset=0;
  }
  if(!exhausted){
   const next=asCursor(s,cursor,offset,q);
   return json({items,cursor:next,hasMore:true,sources:{private:true,public:true}});
  }
  state=undefined;
 }
 return json({items,hasMore:false,sources:{private:true,public:true}});
}

async function file(request:Request,env:Env,path:string){
 const segments=path.split('/');const source=sourceFromEncoded(segments.shift()||'');if(!source)return json({error:'Invalid source'},400);
 let key:string;try{key=segments.map(decodeURIComponent).join('/')}catch{return json({error:'Malformed key'},400)}
 if(!key||key.includes('\0')||!validMedia(key))return json({error:'Unsupported media'},400);
 const object=await bucketOf(env,source).get(key);
 if(!object)return json({error:'Not found'},404);
 const headers=new Headers({'content-type':MIME[extension(key)],'x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox",'cross-origin-resource-policy':'same-origin','cache-control':'private, max-age=120'});
 if(request.method==='HEAD')return new Response(null,{headers,status:200});
 return new Response(object.body,{headers});
}
export default {async fetch(request:Request,env:Env):Promise<Response>{
 try{
  const url=new URL(request.url);
  if(!exactOrigin(request.url,env.PUBLIC_ORIGIN))return json({error:'Unknown origin'},403);
  const subject=await authenticated(request,env);
  if(!subject)return json({error:'Access authentication required; worker is closed until configured'},401);
  if(url.pathname==='/api/import'&&request.method==='POST')return importImage(request,env);
  if(url.pathname==='/api/collections'&&request.method==='GET')return getCollections(env,subject);
  if(url.pathname==='/api/collections'&&request.method==='PUT')return putCollections(request,env,subject);
  if(request.method!=='GET'&&request.method!=='HEAD')return json({error:'Method not allowed'},405);
  if(url.pathname==='/api/health')return json({ok:true,authenticated:true,storage:['private','public'],catalog:Boolean(env.CATALOG)});
  if(url.pathname==='/api/references'&&request.method==='GET')return queryCatalog(request,env);
  if(url.pathname==='/api/media'&&request.method==='GET')return list(request,env);
  if(url.pathname.startsWith('/api/file/'))return file(request,env,url.pathname.slice('/api/file/'.length));
  if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
  return env.ASSETS.fetch(request);
 }catch{return json({error:'Internal request failure'},500)}
}};
