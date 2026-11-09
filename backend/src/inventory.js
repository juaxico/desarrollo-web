'use strict';
const {openDB,router,r,transaction,integer,str,HttpError,mustRole,positiveMoney,ports} = require('./common');
const db=openDB('inventory');
db.exec(`CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, categoria TEXT NOT NULL,
 precio INTEGER NOT NULL CHECK(precio>0), imagen TEXT, descripcion TEXT,
 stock INTEGER NOT NULL DEFAULT 50 CHECK(stock>=0), activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN(0,1))
);
CREATE TABLE IF NOT EXISTS reservations (
 clave TEXT PRIMARY KEY, contenido TEXT NOT NULL,
 restaurado INTEGER NOT NULL DEFAULT 0
);`);
const seed=[
 ['Costillas de Vacuno','vacuno',15000,'costillas de vacuno.png','Costillas ideales para una cocción lenta.'],
 ['Entraña','vacuno',16000,'entra#U00f1a.png','Corte delgado de intenso sabor.'],
 ['Asado de Tira','vacuno',17000,'asado de tiras.jpg','Tradicional corte con hueso.'],
 ['Lomo Vetado','vacuno',18000,'lomo vetado.png','Corte jugoso y sabroso.'],
 ['Filete','vacuno',20000,'filete.jpg','Corte tierno y magro.'],
 ['Parrillada','parrillada',45000,'parrillada.jpg','Selección de cortes para compartir.'],
 ['Alitas de Pollo','pollo',6990,'alitas de pollo.png','Alitas para marinar.'],
 ['Trutro de Pollo','pollo',7990,'truto de pollo.jpg','Corte jugoso.'],
 ['Pechuga de Pollo','pollo',8990,'PECHUGA.jpg','Pechuga magra.'],
 ['Filete de Pollo','pollo',9990,'filete de pollo.png','Filetes tiernos.'],
 ['Brochetas de Pollo','pollo',10990,'brochetas de pollo.png','Brochetas preparadas.'],
 ['Pechuga de Pavo','pavo',11990,'pechuga de pavo.jpg','Carne de sabor suave.'],
 ['Parrilla Clásica','parrilla',79990,'parrilla clasica.jfif','Parrilla tradicional.'],
 ['Parrilla Tambor','parrilla',99990,'parrilla tambor.jfif','Parrilla de gran capacidad.'],
 ['Parrilla Premium','parrilla',129990,'parrilla premium.jfif','Parrilla robusta.']
];
if(db.prepare('SELECT COUNT(*) AS n FROM products').get().n===0) {
 const insert=db.prepare('INSERT INTO products(nombre,categoria,precio,imagen,descripcion,stock) VALUES(?,?,?,?,?,50)');
 transaction(db,()=>seed.forEach(p=>insert.run(...p)));
}
const publicProduct=p=>({id:p.id,nombre:p.nombre,categoria:p.categoria,precio:p.precio,imagen:p.imagen,descripcion:p.descripcion,activo:p.activo,stock:p.stock});
function validarProducto(b,{partial=false}={}){
 const out={};const fields=['nombre','categoria','precio','stock','imagen','descripcion','activo'];
 for(const key of Object.keys(b))if(!fields.includes(key))throw new HttpError(400,'Campo desconocido: '+key);
 if(!partial||b.nombre!==undefined)out.nombre=str(b.nombre,'Nombre',2,120);
 if(!partial||b.categoria!==undefined)out.categoria=str(b.categoria,'Categoría',2,40);
 if(!partial||b.precio!==undefined)out.precio=positiveMoney(b.precio);
 if(!partial||b.stock!==undefined)out.stock=integer(b.stock,'Stock',0,100000);
 if(b.descripcion!==undefined)out.descripcion=str(b.descripcion,'Descripción',0,500);
 if(b.imagen!==undefined)out.imagen=str(b.imagen,'Imagen',0,150);
 if(b.activo!==undefined){if(b.activo!==0&&b.activo!==1&&b.activo!==true&&b.activo!==false)throw new HttpError(400,'Activo inválido.');out.activo=b.activo?1:0;}
 if(partial&&!Object.keys(out).length)throw new HttpError(400,'No hay campos para modificar.');
 return out;
}
const routes=[
 r('GET',/^\/products$/,({u})=>{
   const c=u.searchParams.get('categoria');
   if(c!==null&&(c.length>40||!/^[a-z\d_-]+$/i.test(c)))throw new HttpError(400,'Categoría inválida.');
   const rows=c?db.prepare('SELECT * FROM products WHERE activo=1 AND categoria=? ORDER BY precio').all(c):db.prepare('SELECT * FROM products WHERE activo=1 ORDER BY categoria,precio').all();
   return rows.map(publicProduct);
 }),
 r('GET',/^\/internal\/products\/(?<id>\d+)$/,({params})=>{
   const row=db.prepare('SELECT * FROM products WHERE id=?').get(Number(params.id));
   if(!row)throw new HttpError(404,'Producto no encontrado.');return publicProduct(row);
 }),
 r('POST',/^\/internal\/batch$/,({body})=>{
  const ids=body.ids;
  if(!Array.isArray(ids)||ids.length>50)throw new HttpError(400,'Identificadores inválidos.');
  return [...new Set(ids.map(x=>integer(x,'Id',1,10000000)))].map(id=>{
    const p=db.prepare('SELECT * FROM products WHERE id=?').get(id);
    return p?{id:p.id,nombre:p.nombre,categoria:p.categoria,descripcion:p.descripcion,imagen:p.imagen}:null;
  }).filter(Boolean);
 }),
 r('POST',/^\/internal\/reserve$/,({body})=>{
  const key=str(body.key,'Clave de reserva',8,120),items=body.items;
  if(!Array.isArray(items)||items.length<1||items.length>50)throw new HttpError(400,'Items inválidos.');
  const normalized=items.map(it=>({nombre:str(it.nombre,'Producto',1,120),cantidad:integer(it.cantidad,'Cantidad',1,50)}));
  if(new Set(normalized.map(it=>it.nombre)).size!==normalized.length)throw new HttpError(400,'Productos duplicados.');
  return transaction(db,()=>{
   const prev=db.prepare('SELECT * FROM reservations WHERE clave=?').get(key);
   if(prev){ if(prev.restaurado)throw new HttpError(409,'Reserva restaurada.');return {items:JSON.parse(prev.contenido),duplicado:true}; }
   const lines=[];
   for(const item of normalized){
    const p=db.prepare('SELECT * FROM products WHERE nombre=? AND activo=1').get(item.nombre);
    if(!p)throw new HttpError(404,'Producto no disponible: '+item.nombre);
    const result=db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=? AND activo=1').run(item.cantidad,p.id,item.cantidad);
    if(!result.changes)throw new HttpError(409,'Stock insuficiente: '+p.nombre);
    lines.push({productoId:p.id,nombre:p.nombre,cantidad:item.cantidad,precioUnitario:p.precio});
   }
   db.prepare('INSERT INTO reservations(clave,contenido) VALUES(?,?)').run(key,JSON.stringify(lines));
   return {items:lines,duplicado:false};
  });
 }),
 r('POST',/^\/internal\/restore$/,({body})=>{
  const key=str(body.key,'Clave de reserva',8,120);
  return transaction(db,()=>{
   const prev=db.prepare('SELECT * FROM reservations WHERE clave=?').get(key);
   if(!prev)throw new HttpError(404,'Reserva no encontrada.');
   if(prev.restaurado)return {restaurado:true,duplicado:true};
   const lines=JSON.parse(prev.contenido);
   for(const it of lines)db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(it.cantidad,it.productoId);
   db.prepare('UPDATE reservations SET restaurado=1 WHERE clave=?').run(key);
   return {restaurado:true};
  });
 }),
 r('GET',/^\/admin\/products$/,ctx=>{
   mustRole(ctx,['admin','admin_inventario']);return db.prepare('SELECT * FROM products ORDER BY id').all().map(publicProduct);
 }),
 r('POST',/^\/admin\/products$/,ctx=>{
   mustRole(ctx,['admin','admin_inventario']);const b=validarProducto(ctx.body);
   try {const result=db.prepare('INSERT INTO products(nombre,categoria,precio,imagen,descripcion,stock,activo) VALUES(?,?,?,?,?,?,?)')
     .run(b.nombre,b.categoria,b.precio,b.imagen||'',b.descripcion||'',b.stock,b.activo??1);
     return {status:201,body:publicProduct(db.prepare('SELECT * FROM products WHERE id=?').get(Number(result.lastInsertRowid)))};
   } catch(e){if(e.message.includes('UNIQUE'))throw new HttpError(409,'Ya existe un producto con ese nombre.');throw e;}
 }),
 r('PATCH',/^\/admin\/products\/(?<id>\d+)$/,ctx=>{
   mustRole(ctx,['admin','admin_inventario']);const id=integer(ctx.params.id,'Id');const b=validarProducto(ctx.body,{partial:true});
   if(!db.prepare('SELECT id FROM products WHERE id=?').get(id))throw new HttpError(404,'Producto no encontrado.');
   const cols=Object.keys(b);try {db.prepare(`UPDATE products SET ${cols.map(k=>k+'=?').join(',')} WHERE id=?`).run(...cols.map(k=>b[k]),id);}
   catch(e){if(e.message.includes('UNIQUE'))throw new HttpError(409,'Ya existe un producto con ese nombre.');throw e;}
   return publicProduct(db.prepare('SELECT * FROM products WHERE id=?').get(id));
 }),
 r('DELETE',/^\/admin\/products\/(?<id>\d+)$/,ctx=>{
   mustRole(ctx,['admin','admin_inventario']);const id=integer(ctx.params.id,'Id');
   if(!db.prepare('UPDATE products SET activo=0 WHERE id=?').run(id).changes)throw new HttpError(404,'Producto no encontrado.');
   return {id,activo:false};
 }),
 r('PATCH',/^\/admin\/products\/(?<id>\d+)\/stock$/,ctx=>{
   mustRole(ctx,['admin','admin_inventario']);const id=integer(ctx.params.id,'Id');const stock=integer(ctx.body.stock,'Stock',0,100000);
   const motivo=str(ctx.body.motivo,'Motivo',3,200);
   if(!db.prepare('UPDATE products SET stock=? WHERE id=?').run(stock,id).changes)throw new HttpError(404,'Producto no encontrado.');
   return {id,stock,motivo};
 })
];
function start(){return router('INVENTORY_SERVICE_KEY',routes).listen(ports().inventory,'127.0.0.1',()=>console.log('inventory ready'));}
module.exports={start};
