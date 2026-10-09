import { createRemoteJWKSet, jwtVerify } from 'jose';

interface Env {
 PRIVATE_MEDIA:R2Bucket;WEB_ASSETS:R2Bucket;ASSETS:Fetcher;
 ACCESS_TEAM_DOMAIN:string;ACCESS_AUD:string;PUBLIC_ORIGIN?:string;
}
type Source='private'|'public';
interface Item { id:string;source:Source;key:string;title:string;size:number;uploaded?:string;mime:string;url:string }
const MIME:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime'};
const allowedExtensions=new Set(Object.keys(MIME));
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})}
function extension(key:string){return key.split('.').pop()?.toLowerCase()||''}
function validMedia(key:string){return allowedExtensions.has(extension(key))}
function safeTitle(key:string){return key.split('/').filter(Boolean).at(-1)||key}
function exactOrigin(url:string,configured?:string){if(!configured)return true;try{return new URL(url).origin===new URL(configured).origin}catch{return false}}
function bucketOf(env:Env,source:Source){return source==='private'?env.PRIVATE_MEDIA:env.WEB_ASSETS}
function parseSource(s:string|null):Source|'all'|null{return s===null||s==='all'?'all':s==='private'||s==='public'?s:null}
function sourceFromEncoded(s:string):Source|null {return s==='private'||s==='public'?s:null}
function itemOf(o:R2Object,source:Source):Item{
 const key=o.key;
 return {id:source+':'+key,source,key,title:safeTitle(key),size:o.size,uploaded:o.uploaded?.toISOString(),mime:MIME[extension(key)]||'application/octet-stream',url:'/api/file/'+source+'/'+key.split('/').map(encodeURIComponent).join('/')};
}
async function authenticated(request:Request,env:Env):Promise<boolean>{
 if(!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)return false;
 const jwt=request.headers.get('Cf-Access-Jwt-Assertion');
 if(!jwt)return false;
 try{
  const team=new URL(env.ACCESS_TEAM_DOMAIN);
  if(team.protocol!=='https:'||!team.hostname.endsWith('.cloudflareaccess.com'))return false;
  const jwks=createRemoteJWKSet(new URL('/cdn-cgi/access/certs',team));
  const {payload}=await jwtVerify(jwt,jwks,{issuer:team.origin,audience:env.ACCESS_AUD,algorithms:['RS256','ES256']});
  return Boolean(payload.sub);
 }catch{return false}
}
async function list(request:Request,env:Env){
 const p=new URL(request.url).searchParams;
 const source=parseSource(p.get('source'));if(!source)return json({error:'Invalid source'},400);
 const limit=Math.max(1,Math.min(100,Number(p.get('limit')||60)||60));
 const q=(p.get('q')||'').toLowerCase().slice(0,200);
 const cursor=p.get('cursor')||'';
 let state:{s:Source;c?:string}|undefined;
 if(cursor){try{const parsed=JSON.parse(atob(cursor));if(!['private','public'].includes(parsed.s)||typeof parsed.c!=='string')throw 0;state=parsed}catch{return json({error:'Invalid cursor'},400)}}
 const sources:Source[]=source==='all'?['private','public']:[source];
 if(state&&!sources.includes(state.s))return json({error:'Cursor/source mismatch'},400);
 let offset=state?Math.max(0,sources.indexOf(state.s)):0;
 const items:Item[]=[];
 let nextCursor:string|undefined;
 for(;offset<sources.length;offset++){
  const s=sources[offset],bucket=bucketOf(env,s);
  let c=state?.s===s?state.c:undefined;
  for(let pages=0;pages<10&&items.length<limit;pages++){
   const page=await bucket.list({limit:Math.min(1000,Math.max(100,limit*3)),cursor:c});
   for(const o of page.objects){if(validMedia(o.key)&&(!q||o.key.toLowerCase().includes(q)))items.push(itemOf(o,s));if(items.length>=limit)break}
   // Advance at page boundaries to avoid silently skipping items.
   if(items.length>=limit){
    // R2 returns a cursor for next page, but not for the position inside this page.
    // Return all matching objects from this page to avoid omissions.
    for(const o of page.objects){const id=s+':'+o.key;if(!items.some(x=>x.id===id)&&validMedia(o.key)&&(!q||o.key.toLowerCase().includes(q)))items.push(itemOf(o,s))}
    if(page.truncated&&page.cursor)nextCursor=btoa(JSON.stringify({s,c:page.cursor}));
    else if(offset<sources.length-1)nextCursor=btoa(JSON.stringify({s:sources[offset+1],c:''}));
    break;
   }
   if(!page.truncated){if(offset<sources.length-1)nextCursor=btoa(JSON.stringify({s:sources[offset+1],c:''}));break}
   c=page.cursor;
   if(pages===9&&c)nextCursor=btoa(JSON.stringify({s,c}));
  }
  if(nextCursor&&items.length>=limit)break;
  if(nextCursor&&offset<sources.length-1)continue;
 }
 return json({items,cursor:nextCursor,hasMore:Boolean(nextCursor),sources:{private:true,public:true}});
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
  if(!await authenticated(request,env))return json({error:'Access authentication required; worker is closed until configured'},401);
  if(request.method!=='GET'&&request.method!=='HEAD')return json({error:'Method not allowed'},405);
  if(url.pathname==='/api/health')return json({ok:true,authenticated:true,storage:['private','public']});
  if(url.pathname==='/api/media')return list(request,env);
  if(url.pathname.startsWith('/api/file/'))return file(request,env,url.pathname.slice('/api/file/'.length));
  if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
  return env.ASSETS.fetch(request);
 }catch{return json({error:'Internal request failure'},500)}
}};
