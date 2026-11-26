'use strict';
// Pruebas reales y aisladas: nunca usan las bases ni las claves del desarrollo local.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const backend=path.resolve(__dirname,'..');
const names=['inventory','clients','orders','payments','graphql','gateway'];

test('Validación ampliada de El Asador',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'asador-validacion-'));
 const port=Number(process.env.TEST_PORT||35000+crypto.randomInt(3000)*6);
 const env={...process.env,DB_DIR:dir,PORT:String(port),PUBLIC_HOST:'127.0.0.1',PAYMENTS_DEMO:'1',NODE_ENV:'test'};
 for(const k of ['JWT_SECRET','INVENTORY_SERVICE_KEY','ORDERS_SERVICE_KEY','CLIENTS_SERVICE_KEY','PAYMENTS_SERVICE_KEY','GRAPHQL_SERVICE_KEY','PAYMENT_WEBHOOK_SECRET'])env[k]=crypto.randomBytes(48).toString('hex');
 const children=new Map(),logs=[],traces=[],auditRecords=[],runs=[],requests=[];
 async function start(name){
  const child=spawn(process.execPath,['service-process.js',name],{cwd:backend,env,stdio:['ignore','pipe','pipe','ipc']});children.set(name,child);
  let buffered='';
  child.stdout.on('data',d=>{buffered+=d.toString();let end;while((end=buffered.indexOf('\n'))>=0){const line=buffered.slice(0,end);buffered=buffered.slice(end+1);logs.push(line+'\n');const event=/^\[(GATEWAY|AUTH|BACKEND|PERSISTENCIA)\] (.+)$/.exec(line);try{if(event)auditRecords.push({componente:event[1],...JSON.parse(event[2])});else traces.push(JSON.parse(line))}catch{}}});
  child.stderr.on('data',d=>logs.push(d.toString()));
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Inicio agotado: '+name)),8000);child.once('message',m=>{clearTimeout(timer);resolve(m)});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);if(code)reject(Error(name+' terminó: '+code))})});
 }
 async function stop(name){const child=children.get(name);if(child&&child.exitCode===null){const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done;}}
 async function req(method,route,body,token,headers={}){
  const response=await fetch('http://127.0.0.1:'+port+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
  const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=text}
  requests.push({method,route,status:response.status,cid:response.headers.get('x-request-id')});
  return {status:response.status,data,headers:response.headers};
 }
 const delivery={nombre:'Cliente de Prueba',direccion:'Calle Ficticia 123',comuna:'Santiago',telefono:'912345678'};
 const payload=(nombre='Filete',cantidad=1)=>({despacho:delivery,items:[{nombre,cantidad}]});
 let token,other,admin,inventoryAdmin,ordersAdmin,order,demoCid;
 async function check(id,title,fn){await t.test(id+' '+title,async()=>{const started=new Date().toISOString();try{await fn();runs.push({id,title,started,result:'APROBADA'})}catch(e){runs.push({id,title,started,result:'FALLIDA',error:e.message});throw e}})}
 async function waitAudit(predicate){for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10))}assert.fail('No llegó la evidencia esperada de auditoría')}
 async function create(body=payload(),headers={}){return req('POST','/api/pedidos',body,token,headers)}
 async function product(name='Filete'){return (await req('GET','/api/productos')).data.find(x=>x.nombre===name)}
 async function mintRole(role){
  const email=role+'@example.test',password='PruebaLocal-8264!';
  const child=spawn(process.execPath,['scripts/create-admin.js'],{cwd:backend,env:{...env,ADMIN_EMAIL:email,ADMIN_PASSWORD:password,ADMIN_ROLE:role},stdio:'ignore'});
  assert.equal(await new Promise(resolve=>child.once('exit',resolve)),0);
  return (await req('POST','/api/auth/login',{email,password})).data.token;
 }
 t.after(async()=>{
  for(const name of [...names].reverse())await stop(name);
  const report={fecha:new Date().toISOString(),node:process.version,entorno:'servicios reales con SQLite temporal; pago local de prueba',pruebas:runs,solicitudes:requests,demostracion:auditRecords.filter(e=>e.solicitud===demoCid)};
  if(process.env.EVIDENCE_DIR){fs.mkdirSync(process.env.EVIDENCE_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.EVIDENCE_DIR,'validacion.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(process.env.EVIDENCE_DIR,'trazas.jsonl'),logs.join(''));}
  // Solo se elimina el directorio temporal generado por esta prueba.
  if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('asador-validacion-'))fs.rmSync(dir,{recursive:true,force:true});
 });
 for(const name of names)await start(name);
 await check('P01','catálogo real, filtros y esquema',async()=>{const r=await req('GET','/api/productos');assert.equal(r.status,200);assert.equal(r.data.length,15);assert(r.data.every(x=>Number.isInteger(x.precio)));assert((await req('GET','/api/productos?categoria=pollo')).data.every(x=>x.categoria==='pollo'));assert.equal((await req('GET','/api/productos?categoria=???')).status,400)});
 await check('P02','registro y login; rol de registro no escalable',async()=>{const r=await req('POST','/api/auth/registro',{nombre:'Cliente Uno',email:'uno@example.test',password:'PruebaLocal-8264!',role:'admin'});assert.equal(r.status,201);token=r.data.token;assert.equal(r.data.usuario.role,'cliente');other=(await req('POST','/api/auth/registro',{nombre:'Cliente Dos',email:'dos@example.test',password:'PruebaLocal-8264!'})).data.token;assert.equal((await req('POST','/api/auth/login',{email:'uno@example.test',password:'incorrecta'})).status,401);assert.equal((await req('POST','/api/auth/registro',{nombre:'Duplicado',email:'uno@example.test',password:'PruebaLocal-8264!'})).status,409)});
 await check('P03','operaciones protegidas y cabeceras de identidad falsificadas',async()=>{assert.equal((await req('POST','/api/pedidos',payload(),null,{'x-verified-user-id':'1','x-verified-role':'admin'})).status,401);assert.equal((await req('GET','/api/admin/productos',undefined,token,{'x-verified-role':'admin'})).status,403)});
 await check('P04','los cinco servicios privados rechazan llamadas directas',async()=>{for(const [offset,route]of [[1,'/products'],[2,'/orders/mine'],[3,'/me'],[4,'/internal/order/1'],[5,'/query']])assert.equal((await fetch('http://127.0.0.1:'+(port+offset)+route)).status,401)});
 await check('P05','precios oficiales y persistencia verificable',async()=>{const before=await product();const r=await create({...payload(),total:1,items:[{nombre:'Filete',cantidad:1,precio:1}]});assert.equal(r.status,201);order=r.data.id;assert.equal(r.data.total,20000);assert.equal((await product()).stock,before.stock-1);assert.equal((await req('GET','/api/pedidos/'+order,undefined,token)).data.total,20000)});
 await check('P06','propiedad por REST y GraphQL',async()=>{assert.equal((await req('GET','/api/pedidos/'+order,undefined,other)).status,404);assert.equal((await req('POST','/api/graphql',{query:`{ resumenPedido(id:${order}) { id } }`},other)).status,404)});
 await check('P07','stock insuficiente no deja reservas parciales',async()=>{const preparation=await create(payload('Lomo Vetado',1));assert.equal(preparation.status,201);const before=await product();try{const r=await create({despacho:delivery,items:[{nombre:'Filete',cantidad:1},{nombre:'Lomo Vetado',cantidad:50}]});assert.equal(r.status,409);assert.equal((await product()).stock,before.stock)}finally{await req('POST','/api/pedidos/'+preparation.data.id+'/anular',{},token)}});
 await check('P08','entrada malformada devuelve 400, no 500',async()=>{for(const items of [[null],[1],[{}]])assert.equal((await create({despacho:delivery,items})).status,400)});
 await check('P09','cantidad booleana se rechaza',async()=>{assert.equal((await create(payload('Filete',true))).status,400)});
 await check('P10','productos repetidos y cantidad cero se rechazan',async()=>{assert.equal((await create({...payload(),items:[{nombre:'Filete',cantidad:1},{nombre:'Filete',cantidad:1}]})).status,400);assert.equal((await create(payload('Filete',0))).status,400)});
 await check('P11','reintento de creación no duplica pedido ni reserva',async()=>{const key=crypto.randomUUID(),before=await product();const results=await Promise.all([create(payload(),{'Idempotency-Key':key}),create(payload(),{'Idempotency-Key':key})]);assert(results.every(r=>r.status===201));assert.equal(results[0].data.id,results[1].data.id);assert.equal((await product()).stock,before.stock-1)});
 await check('P12','clave de reintento no permite cambiar la compra',async()=>{const key=crypto.randomUUID();assert.equal((await create(payload(),{'Idempotency-Key':key})).status,201);assert.equal((await create(payload('Filete',2),{'Idempotency-Key':key})).status,409)});
 await check('P13','GraphQL agrega descripción de Inventory',async()=>{const r=await req('POST','/api/graphql',{query:'query Resumen($id: ID!) { resumenPedido(id: $id) { id total items { nombre descripcion } } }',variables:{id:order}},token);assert.equal(r.status,200);assert.equal(r.data.data.resumenPedido.items[0].descripcion,'Corte tierno y magro.')});
 await check('P14','GraphQL limita campos, costo, profundidad y variables',async()=>{for(const body of [{query:'{ __schema { types { name } } }'},{query:`{ resumenPedido(id:${order}) { password_hash } }`},{query:'{ misPedidos { '+Array(30).fill('id').join(' ')+' } }'},{query:'{ misPedidos { id { id { id { id } } } } }'},{query:'query Q($id: ID!) { resumenPedido(id:$id) { id } }',variables:null}])assert.equal((await req('POST','/api/graphql',body,token)).status,400)});
 await check('P15','pago sin identidad, ajeno y firma alterada',async()=>{assert.equal((await req('POST',`/api/pagos/demo/${order}/confirmar`,{estado:'aprobado'})).status,401);assert.equal((await req('POST',`/api/pagos/demo/${order}/confirmar`,{estado:'aprobado'},other)).status,404);assert.equal((await req('POST','/api/pagos/webhook',{eventId:'invalido'})).status,401)});
 await check('P16','pago rechazado se puede reintentar sin nuevo pedido',async()=>{assert.equal((await req('POST',`/api/pagos/demo/${order}/confirmar`,{estado:'rechazado'},token)).data.pagoEstado,'rechazado');assert.equal((await req('POST',`/api/pagos/demo/${order}/confirmar`,{estado:'aprobado'},token)).data.pagoEstado,'aprobado');assert.equal((await req('POST',`/api/pagos/demo/${order}/confirmar`,{estado:'aprobado'},token)).data.duplicado,true)});
 await check('P17','webhook firmado duplicado no duplica efectos',async()=>{const o=(await create()).data;const payment=(await req('POST',`/api/pagos/iniciar/${o.id}`,{},token)).data;const raw=JSON.stringify({eventId:'evt-'+crypto.randomUUID(),referencia:payment.referencia,estado:'aprobado'});const sig=crypto.createHmac('sha256',env.PAYMENT_WEBHOOK_SECRET).update(raw).digest('hex');const r=await req('POST','/api/pagos/webhook',raw,null,{'x-provider-signature':sig});assert.equal(r.status,200);assert.equal((await req('POST','/api/pagos/webhook',raw,null,{'x-provider-signature':sig})).data.duplicado,true)});
 await check('P18','anular dos veces restaura stock una sola vez',async()=>{const before=await product();const o=(await create()).data;assert.equal((await req('POST',`/api/pedidos/${o.id}/anular`,{},token)).status,200);assert.equal((await req('POST',`/api/pedidos/${o.id}/anular`,{},token)).data.duplicado,true);assert.equal((await product()).stock,before.stock);assert.equal((await req('POST',`/api/pagos/demo/${o.id}/confirmar`,{estado:'aprobado'},token)).status,409)});
 await check('P19','pedido pagado no se puede anular',async()=>{assert.equal((await req('POST',`/api/pedidos/${order}/anular`,{},token)).status,409)});
 await check('P20','roles administrativos y transiciones',async()=>{admin=await mintRole('admin');inventoryAdmin=await mintRole('admin_inventario');ordersAdmin=await mintRole('operador_pedidos');assert.equal((await req('GET','/api/admin/productos',undefined,inventoryAdmin)).status,200);assert.equal((await req('GET','/api/admin/pedidos',undefined,inventoryAdmin)).status,403);assert.equal((await req('GET','/api/admin/productos',undefined,ordersAdmin)).status,403);assert.equal((await req('GET','/api/admin/pedidos',undefined,ordersAdmin)).status,200);assert.equal((await req('PATCH',`/api/admin/pedidos/${order}/estado`,{estado:'en_camino'},admin)).status,409);for(const estado of ['en_preparacion','en_camino','entregado'])assert.equal((await req('PATCH',`/api/admin/pedidos/${order}/estado`,{estado},admin)).status,200)});
 await check('P21','CRUD administrativo y catálogo sin productos desactivados',async()=>{const r=await req('POST','/api/admin/productos',{nombre:'Prueba aislada',categoria:'vacuno',precio:100,stock:2},inventoryAdmin);assert.equal(r.status,201);const id=r.data.id;assert.equal((await req('PATCH','/api/admin/productos/'+id,{precio:200},inventoryAdmin)).data.precio,200);assert.equal((await req('DELETE','/api/admin/productos/'+id,undefined,inventoryAdmin)).status,200);assert(!(await req('GET','/api/productos')).data.some(p=>p.id===id))});
 await check('P22','token vencido y alterado se rechazan',async()=>{const [header,payload]=token.split('.');const data=JSON.parse(Buffer.from(payload,'base64url'));data.exp=1;const raw=header+'.'+Buffer.from(JSON.stringify(data)).toString('base64url');const expired=raw+'.'+crypto.createHmac('sha256',env.JWT_SECRET).update(raw).digest('base64url');assert.equal((await req('GET','/api/auth/me',undefined,expired)).status,401);assert.equal((await req('GET','/api/auth/me',undefined,token+'x')).status,401)});
 await check('P23','caída de Inventory: 503 y recuperación',async()=>{await stop('inventory');try{assert.equal((await req('GET','/api/productos')).status,503)}finally{await start('inventory')}assert.equal((await req('GET','/api/productos')).status,200)});
 await check('P24','GraphQL informa error parcial si Inventory falla',async()=>{await stop('inventory');try{const r=await req('POST','/api/graphql',{query:`{ resumenPedido(id:${order}) { id items { nombre descripcion } } }`},token);assert.equal(r.status,200);assert(r.data.errors?.length);assert.equal(r.data.data.resumenPedido.items[0].descripcion,null)}finally{await start('inventory')}});
 await check('P25','caída de Payments conserva pedido y permite reintentar',async()=>{const o=(await create()).data;await stop('payments');try{assert.equal((await req('POST',`/api/pagos/iniciar/${o.id}`,{},token)).status,503);assert.equal((await req('GET','/api/pedidos/'+o.id,undefined,token)).data.pagoEstado,'pendiente')}finally{await start('payments')}assert.equal((await req('POST',`/api/pagos/demo/${o.id}/confirmar`,{estado:'aprobado'},token)).data.pagoEstado,'aprobado')});
 await check('P26','persistencia tras reiniciar Orders',async()=>{await stop('orders');await start('orders');const r=await req('GET','/api/pedidos/'+order,undefined,token);assert.equal(r.status,200);assert.equal(r.data.total,20000);assert.equal(r.data.pagoEstado,'aprobado')});
 await check('P27','errores JSON y tamaño máximo',async()=>{assert.equal((await req('POST','/api/auth/login','{')).status,400);assert.equal((await req('POST','/api/pedidos',{texto:'x'.repeat(70000)},token)).status,413)});
 await check('P28','HTML, JS y CSS se revalidan para evitar versiones antiguas',async()=>{for(const route of ['/','/cortes.html','/parrillas.html','/pedido.html','/mis-pedidos.html','/assets/js/auth.js','/assets/css/estilos.css']){const r=await req('GET',route);assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-cache|no-store/)}});
 await check('P29','traza correlacionada entre Gateway, Clients y Orders',async()=>{const r=await req('GET','/api/pedidos/'+order,undefined,token);const cid=r.headers.get('x-request-id');assert(cid);const expected=['gateway','clients','orders'];for(let attempt=0;attempt<100;attempt++){if(expected.every(service=>traces.some(row=>row.cid===cid&&row.service===service)))break;await new Promise(resolve=>setTimeout(resolve,10))}for(const service of expected)assert(traces.some(row=>row.cid===cid&&row.service===service),'Falta correlación en '+service)});
 await check('P30','logout revoca el token en el backend',async()=>{assert.equal((await req('POST','/api/auth/logout',{},other)).status,200);assert.equal((await req('GET','/api/auth/me',undefined,other)).status,401)});
 await check('P31','readiness informa dependencia caída',async()=>{assert.equal((await req('GET','/health/ready')).status,200);await stop('clients');try{const r=await req('GET','/health/ready');assert.equal(r.status,503);assert.equal(r.data.servicios.clients,false)}finally{await start('clients')}});
 await check('P32','clave de creación sobrevive al reinicio de Orders',async()=>{const key=crypto.randomUUID(),before=await product();const first=await create(payload(),{'Idempotency-Key':key});await stop('orders');await start('orders');const retry=await create(payload(),{'Idempotency-Key':key});assert.equal(retry.data.id,first.data.id);assert.equal((await product()).stock,before.stock-1)});
 await check('P33','dos compras concurrentes no venden la misma última unidad',async()=>{const p=(await req('POST','/api/admin/productos',{nombre:'Última Unidad',categoria:'vacuno',precio:100,stock:1},admin)).data;const results=await Promise.all([create(payload(p.nombre)),create(payload(p.nombre))]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);assert.equal((await product(p.nombre)).stock,0)});
 await check('P34','pago y anulación concurrentes no aprueban un pedido cancelado',async()=>{for(let i=0;i<4;i++){const before=(await product()).stock,o=(await create()).data;await Promise.all([req('POST',`/api/pagos/demo/${o.id}/confirmar`,{estado:'aprobado'},token),req('POST',`/api/pedidos/${o.id}/anular`,{},token)]);const stored=(await req('GET','/api/pedidos/'+o.id,undefined,token)).data;assert(!(stored.estado==='cancelado'&&stored.pagoEstado==='aprobado'));assert.equal((await product()).stock,stored.estado==='cancelado'?before:before-1)}});
 await check('P35','el gateway descarta ID de correlación aportado por navegador',async()=>{const fake=crypto.randomUUID(),r=await req('GET','/api/productos',undefined,undefined,{'X-Request-ID':fake});assert.notEqual(r.headers.get('x-request-id'),fake)});
 await check('P36','anular con Inventory caído no pierde la reserva',async()=>{const before=await product(),o=(await create()).data;await stop('inventory');try{assert.equal((await req('POST',`/api/pedidos/${o.id}/anular`,{},token)).status,503);assert.equal((await req('GET','/api/pedidos/'+o.id,undefined,token)).data.estado,'recibido')}finally{await start('inventory')}assert.equal((await req('POST',`/api/pedidos/${o.id}/anular`,{},token)).status,200);assert.equal((await product()).stock,before.stock)});
 await check('P37','firmas con caracteres no ASCII se rechazan sin error interno',async()=>{const malformed=token.split('.').slice(0,2).join('.')+'.'+'é'.repeat(43);assert.equal((await req('GET','/api/auth/me',undefined,malformed)).status,401);assert.equal((await req('POST','/api/pagos/webhook',{},undefined,{'x-provider-signature':'é'.repeat(64)})).status,401)});
 await check('P38','registro conserva exactamente la contraseña introducida',async()=>{const credentials={email:'espacios@example.test',password:'  ClaveConEspacios-8264!  '};assert.equal((await req('POST','/api/auth/registro',{nombre:'Cliente Espacios',...credentials})).status,201);assert.equal((await req('POST','/api/auth/login',credentials)).status,200);assert.equal((await req('POST','/api/auth/login',{...credentials,password:credentials.password.trim()})).status,401)});
 // Estos escenarios comprueban registros generados por operaciones reales.
 await check('P40','recorrido completo: Gateway, Auth, backend y SQLite con el mismo ID',async()=>{
  const r=await req('POST','/api/graphql',{query:'query Resumen($id: ID!) { resumenPedido(id:$id) { id total estado pagoEstado items { nombre cantidad descripcion } } }',variables:{id:order}},token);
  assert.equal(r.status,200);const cid=r.headers.get('x-request-id');demoCid=cid;
  await waitAudit(()=>auditRecords.some(e=>e.solicitud===cid&&e.componente==='GATEWAY'&&e.evento==='respuesta_enviada')&&auditRecords.some(e=>e.solicitud===cid&&e.tabla==='products'));
  const events=auditRecords.filter(e=>e.solicitud===cid);
  const gateway=events.filter(e=>e.componente==='GATEWAY');
  assert.deepEqual(gateway.map(e=>e.evento),['solicitud_recibida','validacion_solicitada','validacion_aprobada','enrutamiento','respuesta_enviada']);
  assert.equal(gateway[1].destino,'clients');assert.equal(gateway[3].destino,'graphql');
  const auth=events.filter(e=>e.componente==='AUTH');
  assert.deepEqual(auth.map(e=>e.evento),['validacion_recibida','firma_verificada','vigencia_verificada','sesion_verificada','autenticacion_aprobada']);
  assert(Date.parse(auth.at(-1).fecha)<=Date.parse(gateway[3].fecha));
  for(const service of ['graphql','orders','inventory'])assert.deepEqual(events.filter(e=>e.componente==='BACKEND'&&e.servicio===service).map(e=>e.evento),['secreto_verificado','operacion_iniciada','llamada_permitida']);
  const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(path.join(dir,'orders.sqlite'),{readOnly:true});
  try{
   const row=db.prepare('SELECT id,total,estado,pago_estado FROM orders WHERE id=?').get(order);
   const items=db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order);
   const header=events.find(e=>e.componente==='PERSISTENCIA'&&e.tabla==='orders');
   const lines=events.find(e=>e.componente==='PERSISTENCIA'&&e.tabla==='order_items');
   assert.equal(header.base,'orders.sqlite');assert.equal(header.pedidoId,row.id);assert.equal(header.total,row.total);assert.equal(header.total,r.data.data.resumenPedido.total);assert.equal(header.filas,1);assert.equal(header.pagoEstado,row.pago_estado);assert.equal(lines.filas,items.length);
   assert(events.filter(e=>e.componente==='PERSISTENCIA').every(e=>e.evento==='consulta_ejecutada'&&e.sql.includes('?')));
  }finally{db.close()}
 });
 await check('P41','credencial interna ausente: sin consulta ni confianza en el ID aportado',async()=>{
  const fake=crypto.randomUUID();const r=await fetch('http://127.0.0.1:'+(port+2)+'/internal/orders/'+order,{headers:{'X-Request-ID':fake}});
  assert.equal(r.status,401);await r.text();const cid=r.headers.get('x-request-id');assert.notEqual(cid,fake);
  await waitAudit(()=>auditRecords.some(e=>e.solicitud===cid&&e.evento==='llamada_rechazada'));
  const events=auditRecords.filter(e=>e.solicitud===cid);assert.deepEqual(events.map(e=>e.evento),['secreto_rechazado','llamada_rechazada']);
 });
 await check('P42','Auth registra expiración y Gateway no enruta una sesión expirada',async()=>{
  const [header,payload]=token.split('.');const data=JSON.parse(Buffer.from(payload,'base64url'));data.exp=1;
  const raw=header+'.'+Buffer.from(JSON.stringify(data)).toString('base64url');const expired=raw+'.'+crypto.createHmac('sha256',env.JWT_SECRET).update(raw).digest('base64url');
  const r=await req('POST','/api/graphql',{query:'{ misPedidos { id } }'},expired);assert.equal(r.status,401);const cid=r.headers.get('x-request-id');
  await waitAudit(()=>auditRecords.some(e=>e.solicitud===cid&&e.componente==='GATEWAY'&&e.evento==='respuesta_enviada'));
  const events=auditRecords.filter(e=>e.solicitud===cid);assert(events.some(e=>e.componente==='AUTH'&&e.evento==='firma_verificada'));assert(events.some(e=>e.componente==='AUTH'&&e.evento==='autenticacion_rechazada'));assert(!events.some(e=>e.evento==='vigencia_verificada'||e.evento==='enrutamiento'));
 });
 await check('P43','Auth registra revocación sin llegar al backend de negocio',async()=>{
  // P30 revocó esta sesión; la firma y la vigencia todavía son correctas.
  const r=await req('POST','/api/graphql',{query:'{ misPedidos { id } }'},other);assert.equal(r.status,401);const cid=r.headers.get('x-request-id');
  await waitAudit(()=>auditRecords.some(e=>e.solicitud===cid&&e.componente==='GATEWAY'&&e.evento==='respuesta_enviada'));
  const events=auditRecords.filter(e=>e.solicitud===cid);assert(events.some(e=>e.componente==='AUTH'&&e.evento==='vigencia_verificada'));assert(events.some(e=>e.componente==='AUTH'&&e.evento==='autenticacion_rechazada'));assert(!events.some(e=>e.evento==='sesion_verificada'||e.evento==='enrutamiento'));
 });
 await check('P44','logs sin claves, tokens, contraseñas ni datos personales del ensayo',async()=>{
  const text=logs.join('');for(const value of [env.JWT_SECRET,env.INVENTORY_SERVICE_KEY,env.ORDERS_SERVICE_KEY,env.CLIENTS_SERVICE_KEY,env.PAYMENTS_SERVICE_KEY,env.GRAPHQL_SERVICE_KEY,env.PAYMENT_WEBHOOK_SECRET,token,other,admin,inventoryAdmin,ordersAdmin,delivery.direccion,delivery.telefono,'uno@example.test','PruebaLocal-8264!'])assert(!text.includes(value));
 });
 await check('P39','límite de intentos de login devuelve 429',async()=>{let last;for(let i=0;i<16;i++)last=await req('POST','/api/auth/login',{email:'nadie@example.test',password:'Incorrecta-8264!'});assert.equal(last.status,429)});
});
