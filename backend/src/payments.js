'use strict';
const crypto=require('node:crypto');
const {openDB,router,r,requestTo,transaction,integer,str,HttpError,secret,ports} = require('./common');
const db=openDB('payments');
db.exec(`CREATE TABLE IF NOT EXISTS payments (
 id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL UNIQUE,
 amount INTEGER NOT NULL CHECK(amount>0), provider_ref TEXT NOT NULL UNIQUE,
 state TEXT NOT NULL DEFAULT 'pendiente' CHECK(state IN('pendiente','aprobado','rechazado')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS webhook_events (event_id TEXT PRIMARY KEY, payment_id INTEGER NOT NULL, received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
const routes=[
 r('POST',/^\/internal\/start$/,ctx=>{
  const orderId=integer(ctx.body.orderId,'Pedido'),amount=integer(ctx.body.amount,'Monto',1,999999999);
  integer(ctx.body.ownerId,'Cliente');
  return transaction(db,()=>{
   const exists=db.prepare('SELECT * FROM payments WHERE order_id=?').get(orderId);
   if(exists){if(exists.amount!==amount)throw new HttpError(409,'Monto no coincide.');return {pagoId:exists.id,referencia:exists.provider_ref,estado:exists.state,modo:'prueba'};}
   const ref='TEST-'+crypto.randomUUID();const result=db.prepare('INSERT INTO payments(order_id,amount,provider_ref) VALUES(?,?,?)').run(orderId,amount,ref);
   return {status:201,body:{pagoId:Number(result.lastInsertRowid),referencia:ref,estado:'pendiente',modo:'prueba'}};
  });
 }),
 r('POST',/^\/internal\/demo\/confirm$/,async ctx=>{
  // SOLO desarrollo local y activación explícita. No es un cobro real.
  const local=['127.0.0.1','localhost','::1'].includes(process.env.PUBLIC_HOST||'127.0.0.1');
  if(process.env.PAYMENTS_DEMO!=='1'||process.env.NODE_ENV==='production'||!local)
    throw new HttpError(404,'Pago de prueba deshabilitado.');
  const orderId=integer(ctx.body.orderId,'Pedido');
  const estado=str(ctx.body.estado,'Estado');
  if(!['aprobado','rechazado'].includes(estado))throw new HttpError(400,'Estado de prueba inválido.');
  const payment=db.prepare('SELECT * FROM payments WHERE order_id=?').get(orderId);
  if(!payment)throw new HttpError(404,'Pago no iniciado.');
  if(!payment.provider_ref.startsWith('TEST-'))throw new HttpError(409,'Proveedor no compatible con el adaptador de prueba.');
  if(payment.state==='aprobado'){
    if(estado!=='aprobado')throw new HttpError(409,'Pago aprobado no puede revertirse.');
    return {estado:'aprobado',duplicado:true,modo:'prueba'};
  }
  // Orders conserva autoridad sobre el estado oficial del pedido.
  await requestTo('orders','/internal/payment-event',{method:'POST',body:{orderId,estado}});
  db.prepare('UPDATE payments SET state=? WHERE id=?').run(estado,payment.id);
  return {estado,duplicado:false,modo:'prueba'};
 }),
 r('GET',/^\/internal\/order\/(?<id>\d+)$/,ctx=>{
  const o=db.prepare('SELECT id,order_id AS orderId,amount,state AS estado,provider_ref AS referencia FROM payments WHERE order_id=?').get(integer(ctx.params.id,'Pedido'));
  if(!o)throw new HttpError(404,'Pago no encontrado.');return o;
 }),
 r('POST',/^\/internal\/webhook$/,async ctx=>{
  // La firma se verifica usando los bytes JSON exactos recibidos del proveedor.
  const sig=String(ctx.req.headers['x-provider-signature']||'');
  const want=crypto.createHmac('sha256',secret('PAYMENT_WEBHOOK_SECRET')).update(ctx.raw).digest('hex');
  if(sig.length!==want.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(want)))throw new HttpError(401,'Firma inválida.');
  const eventId=str(ctx.body.eventId,'Evento',8,120),ref=str(ctx.body.referencia,'Referencia',8,120);
  const estado=str(ctx.body.estado,'Estado');if(!['aprobado','rechazado'].includes(estado))throw new HttpError(400,'Estado inválido.');
  const payment=db.prepare('SELECT * FROM payments WHERE provider_ref=?').get(ref);
  if(!payment)throw new HttpError(404,'Referencia desconocida.');
  if(db.prepare('SELECT event_id FROM webhook_events WHERE event_id=?').get(eventId))return {status:200,body:{procesado:true,duplicado:true}};
  if(payment.state==='aprobado'&&estado!=='aprobado')throw new HttpError(409,'No se puede revertir un pago aprobado.');
  // Solo orders tiene autoridad para modificar el estado del pedido.
  await requestTo('orders','/internal/payment-event',{method:'POST',body:{orderId:payment.order_id,estado}});
  transaction(db,()=>{
    db.prepare('UPDATE payments SET state=? WHERE id=?').run(estado,payment.id);
    db.prepare('INSERT OR IGNORE INTO webhook_events(event_id,payment_id) VALUES(?,?)').run(eventId,payment.id);
  });
  return {procesado:true,duplicado:false,estado};
 })
];
function start(){return router('PAYMENTS_SERVICE_KEY',routes).listen(ports().payments,'127.0.0.1',()=>console.log('payments ready'));}
module.exports={start};
