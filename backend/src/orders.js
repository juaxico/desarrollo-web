'use strict';
const {openDB,router,r,requestTo,transaction,integer,str,HttpError,mustUser,mustRole,ports,persistenceLog} = require('./common');
const crypto=require('node:crypto');
const {withLock}=require('./locks');
const db=openDB('orders');
db.exec(`CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
 nombre TEXT NOT NULL, direccion TEXT NOT NULL, comuna TEXT NOT NULL DEFAULT '',
 telefono TEXT NOT NULL, notas TEXT NOT NULL DEFAULT '',
 total INTEGER NOT NULL CHECK(total>0),
 estado TEXT NOT NULL DEFAULT 'recibido' CHECK(estado IN ('recibido','en_preparacion','en_camino','entregado','cancelado')),
 pago_estado TEXT NOT NULL DEFAULT 'pendiente' CHECK(pago_estado IN ('pendiente','aprobado','rechazado')),
 reservation_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items (
 order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL,
 nombre TEXT NOT NULL, precio_unitario INTEGER NOT NULL, cantidad INTEGER NOT NULL,
 PRIMARY KEY(order_id,product_id)
);`);
db.exec(`CREATE TABLE IF NOT EXISTS order_requests (
 user_id INTEGER NOT NULL, request_key TEXT NOT NULL, fingerprint TEXT NOT NULL,
 reservation_key TEXT NOT NULL UNIQUE, order_id INTEGER REFERENCES orders(id),
 PRIMARY KEY(user_id,request_key)
);`);
const itemSQL='SELECT product_id AS productoId,nombre,precio_unitario AS precioUnitario,cantidad FROM order_items WHERE order_id=?';
const itemStmt=db.prepare(itemSQL);
const orderSQL='SELECT * FROM orders WHERE id=?';
const orderStmt=db.prepare(orderSQL);
function getOrderItems(id){
 const rows=itemStmt.all(id);
 persistenceLog('order_items',itemSQL,rows.length,{pedidoId:id});
 return rows;
}
const owned=(id,userId,role)=>{
 const row=orderStmt.get(id);
 if(!row || (row.user_id!==userId && !['admin','operador_pedidos'].includes(role)))throw new HttpError(404,'Pedido no encontrado.');
 persistenceLog('orders',orderSQL,1,{pedidoId:row.id,total:row.total,estado:row.estado,pagoEstado:row.pago_estado});
 return row;
};
const expose=(o,admin=false)=>({id:o.id,total:o.total,estado:o.estado,pagoEstado:o.pago_estado,creado_en:o.created_at,despacho:{nombre:o.nombre,direccion:o.direccion,comuna:o.comuna,telefono:o.telefono,notas:o.notas},items:getOrderItems(o.id).map(x=>({nombre:x.nombre,precio_unitario:x.precioUnitario,cantidad:x.cantidad,...(admin?{productoId:x.productoId}:{})}))});
function validateDelivery(d){
 if(!d || typeof d!=='object'||Array.isArray(d))throw new HttpError(400,'Datos de despacho inválidos.');
 const nombre=str(d.nombre,'Nombre',3,120),direccion=str(d.direccion,'Dirección',5,200);
 const comuna=d.comuna===undefined?'':str(d.comuna,'Comuna',0,100);
 const telefono=str(d.telefono,'Teléfono',8,30);
 if(telefono.replace(/\D/g,'').length<8)throw new HttpError(400,'Teléfono inválido.');
 const notas=d.notas===undefined?'':str(d.notas,'Notas',0,300);
 return {nombre,direccion,comuna,telefono,notas};
}
const routes=[
 r('POST',/^\/orders$/,async ctx=>{
   const userId=mustUser(ctx);
   const d=validateDelivery(ctx.body.despacho);
   const items=ctx.body.items;
   if(!Array.isArray(items)||items.length<1||items.length>40)throw new HttpError(400,'El pedido debe contener entre 1 y 40 productos.');
   const cleaned=items.map(x=>{
    if(!x||typeof x!=='object'||Array.isArray(x))throw new HttpError(400,'Producto inválido.');
    return {nombre:str(x.nombre,'Producto',1,120),cantidad:integer(x.cantidad,'Cantidad',1,50)};
   });
   if(new Set(cleaned.map(x=>x.nombre)).size!==cleaned.length)throw new HttpError(400,'Productos repetidos en pedido.');
   // El precio enviado por el navegador se ignora: inventory define los valores oficiales.
   const supplied=ctx.req.headers['idempotency-key'];
   if(supplied!==undefined && (typeof supplied!=='string'||!/^[A-Za-z0-9_-]{8,120}$/.test(supplied)))throw new HttpError(400,'Clave de reintento inválida.');
   const requestKey=supplied||crypto.randomUUID();
   return withLock('create:'+userId+':'+requestKey,async()=>{
   const fingerprint=crypto.createHash('sha256').update(JSON.stringify({despacho:d,items:cleaned})).digest('hex');
   let attempt=db.prepare('SELECT * FROM order_requests WHERE user_id=? AND request_key=?').get(userId,requestKey);
   if(attempt&&attempt.fingerprint!==fingerprint)throw new HttpError(409,'La clave de reintento pertenece a otra compra.');
   if(attempt?.order_id){const o=owned(attempt.order_id,userId,ctx.role);return {status:201,body:{id:o.id,total:o.total,estado:o.estado,pagoEstado:o.pago_estado,duplicado:true}};}
   if(!attempt){db.prepare('INSERT INTO order_requests(user_id,request_key,fingerprint,reservation_key) VALUES(?,?,?,?)').run(userId,requestKey,fingerprint,crypto.randomUUID());attempt=db.prepare('SELECT * FROM order_requests WHERE user_id=? AND request_key=?').get(userId,requestKey);}
   const key=attempt.reservation_key;
   const stock=await requestTo('inventory','/internal/reserve',{method:'POST',body:{key,items:cleaned}});
   const total=stock.items.reduce((acc,x)=>acc+x.cantidad*x.precioUnitario,0);
   try{
    const id=transaction(db,()=>{
     const inserted=db.prepare('INSERT INTO orders(user_id,nombre,direccion,comuna,telefono,notas,total,reservation_key) VALUES(?,?,?,?,?,?,?,?)')
       .run(userId,d.nombre,d.direccion,d.comuna,d.telefono,d.notas,total,key);
     const id=Number(inserted.lastInsertRowid);
     for(const it of stock.items)db.prepare('INSERT INTO order_items(order_id,product_id,nombre,precio_unitario,cantidad) VALUES(?,?,?,?,?)')
       .run(id,it.productoId,it.nombre,it.precioUnitario,it.cantidad);
     db.prepare('UPDATE order_requests SET order_id=? WHERE user_id=? AND request_key=?').run(id,userId,requestKey);
     return id;
    });
    return {status:201,body:{id,total,estado:'recibido',pagoEstado:'pendiente'}};
   } catch(err){try{await requestTo('inventory','/internal/restore',{method:'POST',body:{key}});db.prepare('UPDATE order_requests SET reservation_key=? WHERE user_id=? AND request_key=? AND order_id IS NULL').run(crypto.randomUUID(),userId,requestKey);}catch(e){console.error('Compensación de stock pendiente',ctx.cid,e.message);}throw err;}
   });
 }),
 r('GET',/^\/orders\/mine$/,ctx=>{
  const userId=mustUser(ctx);const sql='SELECT id,total,estado,pago_estado AS pagoEstado,created_at AS creado_en FROM orders WHERE user_id=? ORDER BY id DESC';
  const rows=db.prepare(sql).all(userId);persistenceLog('orders',sql,rows.length);return rows;
 }),
 r('GET',/^\/orders\/(?<id>\d+)$/,ctx=>{
  const userId=mustUser(ctx);const order=owned(integer(ctx.params.id,'Id'),userId,ctx.role);return expose(order);
 }),
 r('GET',/^\/admin\/orders$/,ctx=>{
  mustRole(ctx,['admin','operador_pedidos']);return db.prepare('SELECT id,user_id AS userId,total,estado,pago_estado AS pagoEstado,created_at AS creado_en FROM orders ORDER BY id DESC LIMIT 200').all();
 }),
 r('PATCH',/^\/admin\/orders\/(?<id>\d+)\/status$/,ctx=>{
  mustRole(ctx,['admin','operador_pedidos']);const id=integer(ctx.params.id,'Id');
  const order=owned(id,ctx.userId,ctx.role);const next=str(ctx.body.estado,'Estado');
  const allowed={recibido:['en_preparacion'],en_preparacion:['en_camino'],en_camino:['entregado'],entregado:[],cancelado:[]};
  if(!allowed[order.estado].includes(next))throw new HttpError(409,'Transición de estado no permitida.');
  if(order.pago_estado!=='aprobado')throw new HttpError(409,'Un pedido sin pago aprobado no puede ser despachado.');
  db.prepare('UPDATE orders SET estado=? WHERE id=?').run(next,id);return {id,estado:next};
 }),
 r('POST',/^\/orders\/(?<id>\d+)\/cancel$/,async ctx=>{
  const userId=mustUser(ctx),id=integer(ctx.params.id,'Id');
  return withLock('state:'+id,async()=>{
  const order=owned(id,userId,ctx.role);
  if(order.estado==='cancelado')return {id,estado:'cancelado',duplicado:true};
  if(order.estado!=='recibido'||order.pago_estado==='aprobado')throw new HttpError(409,'El pedido ya no puede anularse automáticamente.');
  // Si inventory falla, no se anula el pedido: se evita perder el ajuste de stock.
  await requestTo('inventory','/internal/restore',{method:'POST',body:{key:order.reservation_key}});
  db.prepare("UPDATE orders SET estado='cancelado' WHERE id=? AND estado='recibido'").run(id);
  return {id,estado:'cancelado'};
  });
 }),
 r('POST',/^\/orders\/(?<id>\d+)\/payment$/,async ctx=>{
  const uid=mustUser(ctx),id=integer(ctx.params.id,'Id');const o=owned(id,uid,ctx.role);
  if(o.estado==='cancelado')throw new HttpError(409,'Pedido cancelado.');
  if(o.pago_estado==='aprobado')throw new HttpError(409,'Pedido ya pagado.');
  return requestTo('payments','/internal/start',{method:'POST',body:{orderId:o.id,amount:o.total,ownerId:o.user_id}});
 }),
 r('POST',/^\/orders\/(?<id>\d+)\/payment\/demo$/,async ctx=>{
  // Adaptador local de prueba: un cliente solo puede finalizar su propio pedido.
  const uid=mustUser(ctx),id=integer(ctx.params.id,'Id');
  const o=owned(id,uid,ctx.role);
  if(o.user_id!==uid)throw new HttpError(404,'Pedido no encontrado.');
  if(o.estado==='cancelado')throw new HttpError(409,'Pedido cancelado.');
  if(o.pago_estado==='aprobado')return {id,pagoEstado:'aprobado',duplicado:true,modo:'prueba'};
  const estado=str(ctx.body.estado,'Estado');
  if(!['aprobado','rechazado'].includes(estado))throw new HttpError(400,'Resultado de prueba inválido.');
  // El frontend nunca actualiza por sí mismo orders.pago_estado.
  await requestTo('payments','/internal/start',{method:'POST',body:{orderId:o.id,amount:o.total,ownerId:o.user_id}});
  const result=await requestTo('payments','/internal/demo/confirm',{method:'POST',body:{orderId:o.id,estado}});
  return {id,pagoEstado:result.estado,duplicado:result.duplicado||false,modo:'prueba'};
 }),
 r('POST',/^\/internal\/payment-event$/,ctx=>withLock('state:'+integer(ctx.body.orderId,'Pedido'),()=>{
  const id=integer(ctx.body.orderId,'Pedido');const estado=str(ctx.body.estado,'Estado');
  if(!['aprobado','rechazado'].includes(estado))throw new HttpError(400,'Resultado de pago inválido.');
  const o=db.prepare('SELECT * FROM orders WHERE id=?').get(id);
  if(!o)throw new HttpError(404,'Pedido inexistente.');
  if(o.estado==='cancelado')throw new HttpError(409,'Pedido cancelado.');
  if(o.pago_estado==='aprobado'&&estado!=='aprobado')throw new HttpError(409,'Pago aprobado no puede revertirse por esta vía.');
  if(o.pago_estado===estado)return {id,estado,duplicado:true};
  db.prepare('UPDATE orders SET pago_estado=? WHERE id=?').run(estado,id);return {id,estado};
 })),
 r('GET',/^\/internal\/orders\/(?<id>\d+)$/,ctx=>{
   mustUser(ctx);const o=owned(integer(ctx.params.id,'Id'),ctx.userId,ctx.role);return {id:o.id,estado:o.estado,pagoEstado:o.pago_estado,total:o.total,items:getOrderItems(o.id)};
 })
];
function start(){return router('ORDERS_SERVICE_KEY',routes).listen(ports().orders,'127.0.0.1',()=>console.log('orders ready'));}
module.exports={start};
