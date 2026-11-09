// Historial del cliente mediante GraphQL -> API Gateway -> orders e inventory.
(() => {
 const $ = id => document.getElementById(id);
 const lista=$('lista-historial'),detalle=$('detalle-historial'),estado=$('estado-historial');
 if(!lista||!detalle||!estado)return;
 const moneda=n=>'$'+Number(n).toLocaleString('es-CL');
 function mensaje(texto,tipo='info'){estado.textContent=texto;estado.className='alert alert-'+tipo;}
 function item(tag,text,clase=''){const el=document.createElement(tag);el.textContent=text;el.className=clase;return el;}
 async function cargar(){
  lista.replaceChildren();detalle.replaceChildren();
  if(!window.Auth.token()){mensaje('Inicia sesión para ver tus pedidos.','warning');return;}
  mensaje('Consultando pedidos...');
  try{
   const resp=await window.Auth.api('/graphql',{method:'POST',body:JSON.stringify({query:'query { misPedidos { id total estado pagoEstado } }'})});
   if(resp.errors?.length)throw Error(resp.errors[0].message);
   const pedidos=resp.data?.misPedidos||[];
   if(!pedidos.length){mensaje('Aún no has realizado pedidos.');return;}
   mensaje(`Se encontraron ${pedidos.length} pedidos.`,'success');
   for(const p of pedidos){
    const b=item('button',`Pedido N° ${p.id} · ${moneda(p.total)} · ${p.estado} · pago ${p.pagoEstado}`,'btn btn-outline-danger text-start mb-2 w-100');
    b.type='button';b.addEventListener('click',()=>verDetalle(p.id));lista.append(b);
   }
  }catch(e){mensaje(e.message,'danger');}
 }
 async function verDetalle(id){
  detalle.replaceChildren(item('p','Consultando productos y descripción...'));
  try{
   const query='query Resumen($id: ID!) { resumenPedido(id: $id) { id total estado pagoEstado items { nombre cantidad precioUnitario descripcion } } }';
   const resp=await window.Auth.api('/graphql',{method:'POST',body:JSON.stringify({query,variables:{id}})});
   if(resp.errors?.length)throw Error(resp.errors[0].message);
   const o=resp.data.resumenPedido;
   detalle.replaceChildren(item('h2',`Pedido N° ${o.id}`));
   detalle.append(item('p',`Estado: ${o.estado} · Pago: ${o.pagoEstado} · Total: ${moneda(o.total)}`));
   const ul=document.createElement('ul');
   for(const x of o.items){const li=item('li',`${x.cantidad} × ${x.nombre} (${moneda(x.precioUnitario)} c/u). ${x.descripcion||''}`);ul.append(li);}
   detalle.append(ul);
   if(o.pagoEstado!=='aprobado' && o.estado!=='cancelado'){
    const pay=item('a','Pagar pedido','btn btn-danger mt-2');
    pay.href='pedido.html?pendiente='+encodeURIComponent(o.id);
    detalle.append(pay);
   }
  }catch(e){detalle.replaceChildren(item('p',e.message,'text-danger'));}
 }
 $('btn-actualizar-historial')?.addEventListener('click',cargar);
 document.addEventListener('auth:cambio',cargar);
 cargar();
})();
