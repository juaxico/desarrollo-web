'use strict';
const crypto = require('node:crypto');
const {openDB, router,r,secret,sign,hashPassword,checkPassword, HttpError,integer,str,mustUser,auditLog} = require('./common');
const db=openDB('clients');
db.exec(`CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 nombre TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'cliente' CHECK(role IN ('cliente','admin','admin_inventario','operador_pedidos')),
 token_version INTEGER NOT NULL DEFAULT 0,
 creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);`);
const SAFE=u=>({id:u.id,nombre:u.nombre,email:u.email,role:u.role});
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeEmail(v){const e=str(v,'Correo',5,254).toLowerCase();if(!EMAIL_RE.test(e))throw new HttpError(400,'Correo inválido.');return e;}
function token(user) {
 const now=Math.floor(Date.now()/1000);
 const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
 const payload=Buffer.from(JSON.stringify({sub:String(user.id),iat:now,exp:now+7200,v:user.token_version})).toString('base64url');
 const input=`${header}.${payload}`;const sig=crypto.createHmac('sha256',secret('JWT_SECRET')).update(input).digest('base64url');
 return `${input}.${sig}`;
}
function verify(tokenValue,checked=()=>{}){
 if(typeof tokenValue!=='string'||tokenValue.length>3000) throw new HttpError(401,'Sesión inválida.');
 const parts=tokenValue.split('.');if(parts.length!==3)throw new HttpError(401,'Sesión inválida.');
 const raw=`${parts[0]}.${parts[1]}`;
 const expected=crypto.createHmac('sha256',secret('JWT_SECRET')).update(raw).digest('base64url');
 if(!/^[A-Za-z0-9_-]+$/.test(parts[2])||Buffer.byteLength(parts[2])!==Buffer.byteLength(expected)||!crypto.timingSafeEqual(Buffer.from(parts[2]),Buffer.from(expected)))throw new HttpError(401,'Sesión inválida.');
 checked('firma_verificada');
 let payload,header;
 try{header=JSON.parse(Buffer.from(parts[0],'base64url'));payload=JSON.parse(Buffer.from(parts[1],'base64url'));}catch{throw new HttpError(401,'Sesión inválida.');}
 if(!header||typeof header!=='object'||!payload||typeof payload!=='object'||header.alg!=='HS256'||header.typ!=='JWT'||!Number.isInteger(payload.exp)||payload.exp<=Math.floor(Date.now()/1000))throw new HttpError(401,'Sesión expirada.');
 checked('vigencia_verificada');
 const user=db.prepare('SELECT * FROM users WHERE id=?').get(Number(payload.sub));
 if(!user||payload.v!==user.token_version)throw new HttpError(401,'Sesión revocada.');
 checked('sesion_verificada');
 return SAFE(user);
}
const routes=[
 r('POST',/^\/register$/,({body})=>{
  const nombre=str(body.nombre,'Nombre',2,120);const email=normalizeEmail(body.email);
  if(typeof body.password!=='string'||body.password.length<8||body.password.length>128)throw new HttpError(400,'Contraseña fuera de rango.');
  const password=body.password;
  if(db.prepare('SELECT id FROM users WHERE email=?').get(email))throw new HttpError(409,'Ese correo ya está registrado.');
  const ret=db.prepare('INSERT INTO users(nombre,email,password_hash,role) VALUES(?,?,?,?)').run(nombre,email,hashPassword(password),'cliente');
  const user=db.prepare('SELECT * FROM users WHERE id=?').get(Number(ret.lastInsertRowid));
  return {status:201,body:{token:token(user),usuario:SAFE(user)}};
 }),
 r('POST',/^\/login$/,({body})=>{
  let email;try{email=normalizeEmail(body.email);}catch{throw new HttpError(401,'Correo o contraseña incorrectos.');}
  const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  const password=typeof body.password==='string'?body.password:'';
  // La misma respuesta para un usuario inexistente o contraseña errónea.
  if(!u||!checkPassword(password,u.password_hash))throw new HttpError(401,'Correo o contraseña incorrectos.');
  return {token:token(u),usuario:SAFE(u)};
 }),
 r('GET',/^\/internal\/validate$/,({req})=>{
  auditLog('AUTH','validacion_recibida',{ruta:'/internal/validate'});
  try {
   const auth=req.headers.authorization||'';
   if(!auth.startsWith('Bearer '))throw new HttpError(401,'Debes iniciar sesión.');
   const usuario=verify(auth.slice(7),evento=>auditLog('AUTH',evento));
   auditLog('AUTH','autenticacion_aprobada',{estado:200});
   return {usuario};
  } catch(error) {
   auditLog('AUTH','autenticacion_rechazada',{estado:error instanceof HttpError?error.status:500,motivo:error instanceof HttpError?'sesion_no_valida':'fallo_interno'});
   throw error;
  }
 }),
 r('GET',/^\/me$/,ctx=>{
  mustUser(ctx);const u=db.prepare('SELECT * FROM users WHERE id=?').get(ctx.userId);
  if(!u)throw new HttpError(401,'Usuario no encontrado.');return {usuario:SAFE(u)};
 }),
 r('PATCH',/^\/me$/,ctx=>{
  mustUser(ctx);const u=db.prepare('SELECT * FROM users WHERE id=?').get(ctx.userId);
  if(!u)throw new HttpError(404,'Usuario no encontrado.');
  const nombre=ctx.body.nombre===undefined?u.nombre:str(ctx.body.nombre,'Nombre',2,120);
  const email=ctx.body.email===undefined?u.email:normalizeEmail(ctx.body.email);
  try{db.prepare('UPDATE users SET nombre=?,email=? WHERE id=?').run(nombre,email,u.id);}
  catch(e){if(e.message.includes('UNIQUE'))throw new HttpError(409,'Ese correo ya está registrado.');throw e;}
  return {usuario:SAFE(db.prepare('SELECT * FROM users WHERE id=?').get(u.id))};
 }),
 r('POST',/^\/logout$/,ctx=>{
  mustUser(ctx); db.prepare('UPDATE users SET token_version=token_version+1 WHERE id=?').run(ctx.userId);
  return {mensaje:'Sesión cerrada.'};
 })
];
function start() {return router('CLIENTS_SERVICE_KEY',routes).listen(require('./common').ports().clients,'127.0.0.1',()=>console.log('clients ready'));}
module.exports={start};
