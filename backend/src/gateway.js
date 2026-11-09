'use strict';
const http=require('node:http');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const {ports,requestTo,respond,readBody,HttpError,fail}=require('./common');
const front=path.resolve(__dirname,'../../frontend');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.jfif':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};
const routes=[
 ['GET',/^\/api\/productos$/,'inventory','/products','public'],
 ['POST',/^\/api\/auth\/registro$/,'clients','/register','public'],
 ['POST',/^\/api\/auth\/login$/,'clients','/login','public'],
 ['GET',/^\/api\/auth\/me$/,'clients','/me','client'],
 ['PATCH',/^\/api\/auth\/me$/,'clients','/me','client'],
 ['POST',/^\/api\/auth\/logout$/,'clients','/logout','client'],
 ['POST',/^\/api\/pedidos$/,'orders','/orders','client'],
 ['GET',/^\/api\/pedidos\/mios$/,'orders','/orders/mine','client'],
 ['GET',/^\/api\/pedidos\/(?<id>\d+)$/,'orders',p=>`/orders/${p.id}`,'client'],
 ['POST',/^\/api\/pedidos\/(?<id>\d+)\/anular$/,'orders',p=>`/orders/${p.id}/cancel`,'client'],
 ['POST',/^\/api\/pagos\/iniciar\/(?<id>\d+)$/,'orders',p=>`/orders/${p.id}/payment`,'client'],
 ['POST',/^\/api\/pagos\/demo\/(?<id>\d+)\/confirmar$/,'orders',p=>`/orders/${p.id}/payment/demo`,'client'],
 ['GET',/^\/api\/admin\/productos$/,'inventory','/admin/products','inventoryAdmin'],
 ['POST',/^\/api\/admin\/productos$/,'inventory','/admin/products','inventoryAdmin'],
 ['PATCH',/^\/api\/admin\/productos\/(?<id>\d+)$/,'inventory',p=>`/admin/products/${p.id}`,'inventoryAdmin'],
 ['DELETE',/^\/api\/admin\/productos\/(?<id>\d+)$/,'inventory',p=>`/admin/products/${p.id}`,'inventoryAdmin'],
 ['PATCH',/^\/api\/admin\/productos\/(?<id>\d+)\/stock$/,'inventory',p=>`/admin/products/${p.id}/stock`,'inventoryAdmin'],
 ['GET',/^\/api\/admin\/pedidos$/,'orders','/admin/orders','ordersAdmin'],
 ['PATCH',/^\/api\/admin\/pedidos\/(?<id>\d+)\/estado$/,'orders',p=>`/admin/orders/${p.id}/status`,'ordersAdmin'],
 ['POST',/^\/api\/graphql$/,'graphql','/query','client'],
 ['POST',/^\/api\/pagos\/webhook$/,'payments','/internal/webhook','webhook']
];
const counters=new Map();
function limited(ip,special){
 const now=Date.now(),key=(special?'auth:':'all:')+ip;let data=counters.get(key);if(!data||data.until<now){data={n:0,until:now+60000};counters.set(key,data);}
 if(++data.n>(special?15:250))throw new HttpError(429,'Demasiadas solicitudes.');
 if(counters.size>10000)for(const [k,v] of counters)if(v.until<now)counters.delete(k);
}
function readAuth(req){const a=req.headers.authorization||'';return a.startsWith('Bearer ')?a:null;}
async function jsonApi(req,res,u){
 const route=routes.find(x=>x[0]===req.method&&x[1].test(u.pathname));if(!route)throw new HttpError(404,'Ruta no encontrada.');
 const [,pattern,service,dest,policy]=route;const match=u.pathname.match(pattern);const parts=match.groups||{};
 limited(req.socket.remoteAddress||'desconocido',u.pathname.includes('/auth/login'));
 let user=null;
 if(!['public','webhook'].includes(policy)){
  const auth=readAuth(req);if(!auth)throw new HttpError(401,'Debes iniciar sesión.');
  const check=await requestTo('clients','/internal/validate',{headers:{Authorization:auth}});
  user=check.usuario;
  if(policy==='inventoryAdmin'&&!['admin','admin_inventario'].includes(user.role))throw new HttpError(403,'Acceso denegado.');
  if(policy==='ordersAdmin'&&!['admin','operador_pedidos'].includes(user.role))throw new HttpError(403,'Acceso denegado.');
 }
 const input=['POST','PATCH','PUT'].includes(req.method)?await readBody(req):{body:null,raw:null};
 const body=input.body;
 const internal=typeof dest==='function'?dest(parts):dest;
 const qs=u.searchParams.toString();const url=internal+(qs?'?'+qs:'');
 const forwardedHeaders=policy==='webhook'?{'x-provider-signature':req.headers['x-provider-signature']||''}:{};
 const out=await requestTo(service,url,{method:req.method,body,rawBody:policy==='webhook'?input.raw:null,userId:user?.id,role:user?.role||'',headers:forwardedHeaders});
 const status=(req.method==='POST' && (u.pathname==='/api/pedidos'||u.pathname==='/api/auth/registro'||u.pathname==='/api/admin/productos'))?201:200;
 respond(res,status,out);
}
function serveStatic(req,res,u){
 if(req.method!=='GET' && req.method!=='HEAD')throw new HttpError(405,'Método no permitido.');
 let decoded;try{decoded=decodeURIComponent(u.pathname);}catch{throw new HttpError(400,'Ruta malformada.');}
 if(decoded.includes('\0')||decoded.includes('\\')||decoded.split('/').includes('..'))throw new HttpError(403,'Ruta no permitida.');
 const normalized=path.resolve(front,'.'+(decoded==='/'?'/index.html':decoded));
 if(!normalized.startsWith(front+path.sep))throw new HttpError(403,'Fuera de la carpeta pública.');
 const ext=path.extname(normalized).toLowerCase();if(!MIME[ext])throw new HttpError(404,'Archivo no encontrado.');
 let stats;try{stats=fs.statSync(normalized);}catch{throw new HttpError(404,'Archivo no encontrado.');}
 if(!stats.isFile())throw new HttpError(404,'Archivo no encontrado.');
 res.writeHead(200,{'Content-Type':MIME[ext],'X-Content-Type-Options':'nosniff','Cache-Control':ext==='.html'?'no-cache':'public, max-age=300'});
 if(req.method==='HEAD')res.end();else fs.createReadStream(normalized).pipe(res);
}
function start(){return http.createServer(async(req,res)=>{
  const cid=crypto.randomUUID();res.setHeader('X-Request-ID',cid);
  res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
  try{
   const u=new URL(req.url,'http://localhost');
   if(u.pathname==='/health'&&req.method==='GET')return respond(res,200,{ok:true,servicio:'gateway'});
   if(u.pathname.startsWith('/api/'))await jsonApi(req,res,u);else serveStatic(req,res,u);
  }catch(e){fail(res,e,cid);}
 }).listen(ports().gateway,process.env.PUBLIC_HOST||'127.0.0.1',()=>console.log('Gateway: http://127.0.0.1:'+ports().gateway));}
module.exports={start,routes};
