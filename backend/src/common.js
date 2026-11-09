'use strict';
const http = require('node:http');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const KEY_NAMES = ['JWT_SECRET', 'INVENTORY_SERVICE_KEY', 'ORDERS_SERVICE_KEY', 'CLIENTS_SERVICE_KEY', 'PAYMENTS_SERVICE_KEY', 'GRAPHQL_SERVICE_KEY', 'PAYMENT_WEBHOOK_SECRET'];
const ports = () => {
  const base = Number(process.env.PORT || 3000);
  if (!Number.isInteger(base) || base < 1024 || base > 65000) throw Error('PORT inválido');
  return { gateway: base, inventory: base+1, orders: base+2, clients: base+3, payments: base+4, graphql: base+5 };
};
function secret(name) {
  if (!KEY_NAMES.includes(name)) throw Error('Secreto no permitido');
  const value = process.env[name] || '';
  if (value.length < (name === 'JWT_SECRET' ? 48 : 32) || value.includes('***')) throw Error('Falta configurar el secreto ' + name);
  return value;
}
function verifySecrets() { for (const key of KEY_NAMES) secret(key); }
function openDB(name) {
  const folder = path.resolve(process.env.DB_DIR || path.join(__dirname, '..', 'data'));
  fs.mkdirSync(folder, {recursive: true, mode: 0o700});
  const db = new DatabaseSync(path.join(folder, name + '.sqlite'));
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  return db;
}
function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (err) { db.exec('ROLLBACK'); throw err; }
}
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function respond(res, status, obj, headers={}) {
  if (res.writableEnded) return;
  const payload = JSON.stringify(obj);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff', ...headers});
  res.end(payload);
}
async function readBody(req, limit = 65536) {
  const parts=[]; let n=0;
  for await (const part of req) {
    n+=part.length; if(n>limit) throw new HttpError(413, 'Solicitud demasiado grande.');
    parts.push(part);
  }
  const raw=Buffer.concat(parts);
  if (!raw.length) return {body:{},raw};
  let body;
  try { body=JSON.parse(raw.toString('utf8')); } catch {throw new HttpError(400,'JSON inválido.');}
  if(!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400,'Se requiere un objeto JSON.');
  return {body,raw};
}
function integer(value, label, min=1, max=Number.MAX_SAFE_INTEGER) {
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<min||n>max) throw new HttpError(400,label+' inválido.');
  return n;
}
function str(value, label, min=1, max=200) {
  if(typeof value!=='string') throw new HttpError(400, label+' debe ser texto.');
  const result=value.trim();
  if(result.length<min||result.length>max) throw new HttpError(400,label+' fuera de rango.');
  return result;
}
function fail(res, err, cid) {
  const status = err instanceof HttpError ? err.status : 500;
  if(status===500) console.error('Fallo interno',cid,err?.stack||err);
  respond(res,status,{error:status===500?'Error interno del servidor.':err.message,codigo:cid});
}
function router(key, routes) {
  const secretValue=secret(key);
  return http.createServer(async(req,res)=>{
    const cid=crypto.randomUUID();
    res.setHeader('X-Request-ID',cid);
    try {
      // Para todo servicio privado se valida la identidad técnica enviada por el gateway.
      const auth=req.headers['x-service-key'] || '';
      if(Buffer.byteLength(auth)!==Buffer.byteLength(secretValue)||!crypto.timingSafeEqual(Buffer.from(auth),Buffer.from(secretValue))) throw new HttpError(401,'Servicio interno no autorizado.');
      const u=new URL(req.url,'http://localhost');
      const route=routes.find(r=>r.method===req.method&&r.pattern.test(u.pathname));
      if(!route) throw new HttpError(404,'Ruta no encontrada.');
      const match=u.pathname.match(route.pattern);
      const {body,raw}=['POST','PUT','PATCH'].includes(req.method)?await readBody(req):{body:{},raw:Buffer.alloc(0)};
      const userId = /^\d+$/.test(req.headers['x-verified-user-id']||'') ? Number(req.headers['x-verified-user-id']) : null;
      const role = String(req.headers['x-verified-role']||'');
      const data=await route.handler({req,res,u,params:match?.groups||{},body,raw,userId,role,cid});
      if(data!==undefined && !res.writableEnded) respond(res,data.status||200,data.body??data);
    } catch(err) { fail(res,err,cid); }
  });
}
function r(method, pattern, handler) {return {method,pattern,handler};}
function mustUser(ctx) { if (!ctx.userId) throw new HttpError(401,'Debes iniciar sesión.'); return ctx.userId; }
function mustRole(ctx,roles) { mustUser(ctx); if(!roles.includes(ctx.role)) throw new HttpError(403,'No tienes permisos para esta operación.'); }
async function requestTo(service, uri, {method='GET', body=null, rawBody=null, userId=null, role='', headers={}, timeout=2500}={}) {
  const controller = new AbortController(); const t=setTimeout(()=>controller.abort(),timeout);
  try {
    const result=await fetch(`http://127.0.0.1:${ports()[service]}${uri}`,{
      method, signal:controller.signal,
      headers:{'Content-Type':'application/json','X-Service-Key':secret(service.toUpperCase()+'_SERVICE_KEY'),...(userId?{'X-Verified-User-Id':String(userId),'X-Verified-Role':role}:{}),...headers},
      ...(rawBody!==null?{body:rawBody}:(body===null?{}:{body:JSON.stringify(body)}))
    });
    const obj=await result.json().catch(()=>({}));
    if(!result.ok) throw new HttpError(result.status,obj.error || 'Error en servicio '+service);
    return obj;
  } catch (err) { if(err.name==='AbortError'||err instanceof TypeError) throw new HttpError(503,'Servicio '+service+' no disponible.'); throw err; }
  finally {clearTimeout(t);}
}
function positiveMoney(n,label='Precio') {return integer(n,label,1,100000000);}
function sign(value,key) {return crypto.createHmac('sha256',key).update(value).digest('hex');}
function hashPassword(password) {
  const salt=crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(password,salt,64).toString('hex')}`;
}
function checkPassword(password,hash) {
  try { const [alg,salt,actual]=hash.split('$'); if(alg!=='scrypt') return false;
    const candidate=crypto.scryptSync(password,salt,64); const want=Buffer.from(actual,'hex');
    return want.length===candidate.length && crypto.timingSafeEqual(candidate,want);
  } catch {return false;}
}
module.exports={ports,secret,verifySecrets,openDB,transaction,HttpError,respond,readBody,integer,str,fail,router,r,mustUser,mustRole,requestTo,positiveMoney,sign,hashPassword,checkPassword};
