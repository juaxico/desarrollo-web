'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const os=require('node:os'),path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'asador-eval2-'));
const env={...process.env,DB_DIR:folder,PORT:String(40000+(process.pid%1500)*6),PUBLIC_HOST:'127.0.0.1',PAYMENTS_DEMO:'1',NODE_ENV:'test'};
for(const k of ['JWT_SECRET','INVENTORY_SERVICE_KEY','ORDERS_SERVICE_KEY','CLIENTS_SERVICE_KEY','PAYMENTS_SERVICE_KEY','GRAPHQL_SERVICE_KEY','PAYMENT_WEBHOOK_SECRET'])env[k]=crypto.randomBytes(48).toString('hex');
const base='http://127.0.0.1:'+env.PORT;let child;
const results=[];
async function req(method,route,body=null,token=null,headers={}){
 const res=await fetch(base+route,{method,headers:{...(body!==null?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body===null?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
 const data=await res.json().catch(()=>({}));return {status:res.status,data};
}
async function ready(){for(let i=0;i<45;i++){if(child.exitCode!==null)throw Error('El backend terminó antes de iniciar.');try{const r=await req('GET','/health');if(r.status===200)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('El backend no inició.');}
async function check(label,fn){try{await fn();results.push({prueba:label,resultado:'APROBADA'});}catch(e){results.push({prueba:label,resultado:'FALLÓ',detalle:String(e)});throw e;}}
test('Integración del backend completo',async t=>{
 child=spawn(process.execPath,['start.js'],{cwd:path.join(__dirname,'..'),env,stdio:['ignore','pipe','pipe']});
 let logs='';child.stdout.on('data',d=>logs+=d.toString());child.stderr.on('data',d=>logs+=d.toString());
 t.after(()=>{child.kill('SIGTERM');setTimeout(()=>{try{fs.rmSync(folder,{recursive:true,force:true});}catch{}},300).unref();});
 await ready();
 try {
 let token1,token2,adminToken,orderId,pago;
 await check('Catálogo público y datos iniciales',async()=>{
  const r=await req('GET','/api/productos');assert.equal(r.status,200);assert(r.data.length>=10);assert(r.data.some(p=>p.nombre==='Filete'));
 });
 await check('Servicio privado no accesible directamente',async()=>{
  const r=await fetch('http://127.0.0.1:'+(Number(env.PORT)+1)+'/products');assert.equal(r.status,401);
 });
 await check('Pedido requiere autenticación',async()=>{
  const r=await req('POST','/api/pedidos',{});assert.equal(r.status,401);
 });
 await check('Registro, login, consulta del propio perfil',async()=>{
  let r=await req('POST','/api/auth/registro',{nombre:'Cliente Uno',email:'uno@example.test',password:'ContraseñaFuerte123!'});
  assert.equal(r.status,201);token1=r.data.token;
  r=await req('POST','/api/auth/login',{email:'uno@example.test',password:'ContraseñaFuerte123!'});assert.equal(r.status,200);
  r=await req('GET','/api/auth/me',null,token1);assert.equal(r.data.usuario.email,'uno@example.test');
 });
 await check('Prevención de precio manipulado y reserva de stock',async()=>{
  const r=await req('POST','/api/pedidos',{despacho:{nombre:'Cliente Uno',direccion:'Calle Falsa 1234',comuna:'La Reina',telefono:'+56912345678'},items:[{nombre:'Filete',cantidad:2,precio:1}]},token1);
  assert.equal(r.status,201);assert.equal(r.data.total,40000);orderId=r.data.id;
  const product=(await req('GET','/api/productos')).data.find(x=>x.nombre==='Filete');assert.equal(product.stock,48);
 });
 await check('Propiedad: no permite consultar pedido ajeno',async()=>{
  const r2=await req('POST','/api/auth/registro',{nombre:'Cliente Dos',email:'dos@example.test',password:'ContraseñaFuerte123!'});token2=r2.data.token;
  assert.equal((await req('GET',`/api/pedidos/${orderId}`,null,token2)).status,404);
  assert.equal((await req('GET',`/api/pedidos/${orderId}`,null,token1)).status,200);
 });
 await check('GraphQL combina orders e inventory y protege los campos',async()=>{
  let r=await req('POST','/api/graphql',{query:`query Resumen($id: ID!) { resumenPedido(id: $id) { id total items { nombre cantidad descripcion } } }`,variables:{id:orderId}},token1);
  assert.equal(r.status,200);assert.equal(r.data.data.resumenPedido.items[0].descripcion,'Corte tierno y magro.');
  assert.equal((await req('POST','/api/graphql',{query:`{ resumenPedido(id:${orderId}) { id } }`},token2)).status,404);
  assert.equal((await req('POST','/api/graphql',{query:'{ __schema { types { name } } }'},token1)).status,400);
 });
 await check('Permisos de administración denegados al cliente',async()=>{
  assert.equal((await req('POST','/api/admin/productos',{nombre:'X'},token1)).status,403);
  assert.equal((await req('GET','/api/admin/pedidos',null,token1)).status,403);
 });
 await check('Crear usuario administrador y administrar stock',async()=>{
  const script=spawn(process.execPath,['scripts/create-admin.js'],{cwd:path.join(__dirname,'..'),env:{...env,ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD:'AdminPasswordFuerte123!',ADMIN_ROLE:'admin',ADMIN_NAME:'Administrador'},stdio:'pipe'});
  const code=await new Promise(resolve=>script.on('close',resolve));assert.equal(code,0);
  let r=await req('POST','/api/auth/login',{email:'admin@example.test',password:'AdminPasswordFuerte123!'});assert.equal(r.status,200);adminToken=r.data.token;
  r=await req('GET','/api/admin/productos',null,adminToken);assert.equal(r.status,200);
  r=await req('PATCH','/api/admin/productos/1/stock',{stock:25,motivo:'Auditoría'},adminToken);assert.equal(r.status,200);
 });
 await check('Administración: crear, editar y desactivar producto',async()=>{
  let r=await req('POST','/api/admin/productos',{nombre:'Corte Prueba',categoria:'vacuno',precio:11000,stock:12,descripcion:'Descripción de prueba'},adminToken);
  assert.equal(r.status,201);const id=r.data.id;
  r=await req('PATCH',`/api/admin/productos/${id}`,{precio:12000},adminToken);assert.equal(r.status,200);assert.equal(r.data.precio,12000);
  r=await req('DELETE',`/api/admin/productos/${id}`,null,adminToken);assert.equal(r.status,200);
  const products=(await req('GET','/api/productos')).data;assert(!products.some(x=>x.id===id));
 });
 await check('GraphQL lista únicamente los pedidos del cliente',async()=>{
  const r=await req('POST','/api/graphql',{query:'query { misPedidos { id total estado pagoEstado } }'},token2);
  assert.equal(r.status,200);assert.deepEqual(r.data.data.misPedidos,[]);
 });
 await check('Actualización de perfil protegida',async()=>{
  let r=await req('PATCH','/api/auth/me',{nombre:'Cliente Uno Editado'},token1);assert.equal(r.status,200);assert.equal(r.data.usuario.nombre,'Cliente Uno Editado');
  r=await req('PATCH','/api/auth/me',{nombre:'Intruso'});assert.equal(r.status,401);
 });
 await check('Iniciar pago de prueba sin confirmación por cliente',async()=>{
  const r=await req('POST',`/api/pagos/iniciar/${orderId}`,{},token1);assert.equal(r.status,200);assert.equal(r.data.estado,'pendiente');pago=r.data;
  assert.equal((await req('POST','/api/pagos/webhook',{eventId:'evento-invalido',referencia:pago.referencia,estado:'aprobado'})).status,401);
 });
 await check('Webhook firmado y eventos duplicados idempotentes',async()=>{
  const raw=JSON.stringify({eventId:'evt-'+crypto.randomUUID(),referencia:pago.referencia,estado:'aprobado'});
  const sig=crypto.createHmac('sha256',env.PAYMENT_WEBHOOK_SECRET).update(raw).digest('hex');
  let r=await req('POST','/api/pagos/webhook',raw,null,{'x-provider-signature':sig});assert.equal(r.status,200);assert.equal(r.data.procesado,true);
  r=await req('POST','/api/pagos/webhook',raw,null,{'x-provider-signature':sig});assert.equal(r.data.duplicado,true);
  r=await req('GET',`/api/pedidos/${orderId}`,null,token1);assert.equal(r.data.pagoEstado,'aprobado');
 });
 await check('Pedido pagado no anulable, transiciones administrativas',async()=>{
  assert.equal((await req('POST',`/api/pedidos/${orderId}/anular`,{},token1)).status,409);
  assert.equal((await req('PATCH',`/api/admin/pedidos/${orderId}/estado`,{estado:'en_camino'},adminToken)).status,409);
  assert.equal((await req('PATCH',`/api/admin/pedidos/${orderId}/estado`,{estado:'en_preparacion'},adminToken)).status,200);
 });
 await check('Anulación sin pago restaura existencias',async()=>{
  let r=await req('POST','/api/pedidos',{despacho:{nombre:'Cliente Dos',direccion:'Dirección válida 3333',telefono:'987654321'},items:[{nombre:'Filete',cantidad:3}]},token2);
  assert.equal(r.status,201);let pid=r.data.id;
  r=await req('POST',`/api/pedidos/${pid}/anular`,{},token2);assert.equal(r.status,200);
  const p=(await req('GET','/api/productos')).data.find(x=>x.nombre==='Filete');assert.equal(p.stock,48);
 });
 await check('Pago simulado autorizado, rechazo de intrusos y estado persistido',async()=>{
  let r=await req('POST','/api/pedidos',{despacho:{nombre:'Cliente Dos',direccion:'Dirección válida 3333',telefono:'987654321'},items:[{nombre:'Filete',cantidad:1}]},token2);
  assert.equal(r.status,201);const id=r.data.id;
  r=await req('POST',`/api/pagos/demo/${id}/confirmar`,{estado:'aprobado'});assert.equal(r.status,401);
  r=await req('POST',`/api/pagos/demo/${id}/confirmar`,{estado:'aprobado'},token1);assert.equal(r.status,404);
  r=await req('POST',`/api/pagos/iniciar/${id}`,{},token2);assert.equal(r.status,200);
  r=await req('POST',`/api/pagos/demo/${id}/confirmar`,{estado:'otro'},token2);assert.equal(r.status,400);
  r=await req('POST',`/api/pagos/demo/${id}/confirmar`,{estado:'aprobado'},token2);assert.equal(r.status,200);
  assert.equal(r.data.pagoEstado,'aprobado');assert.equal(r.data.modo,'prueba');
  r=await req('GET',`/api/pedidos/${id}`,null,token2);assert.equal(r.data.pagoEstado,'aprobado');
  r=await req('POST',`/api/pagos/demo/${id}/confirmar`,{estado:'aprobado'},token2);assert.equal(r.status,200);assert.equal(r.data.duplicado,true);
 });
 await check('Cierre de sesión revoca token',async()=>{
  assert.equal((await req('POST','/api/auth/logout',{},token2)).status,200);
  assert.equal((await req('GET','/api/auth/me',null,token2)).status,401);
 });
 } finally {
  const outfile=path.join(__dirname,'resultados.json');fs.writeFileSync(outfile,JSON.stringify({fecha:new Date().toISOString(),ambiente:'Node '+process.version,pruebas:results},null,2)+'\n');
 }
});
