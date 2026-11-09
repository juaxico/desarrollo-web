'use strict';
// GraphQL privado con sintaxis restringida al schema documentado.
// Es un motor de consulta limitado, no una implementación completa del estándar GraphQL.
const {router,r,requestTo,integer,HttpError,mustUser,ports}=require('./common');
const SCHEMA=`type Query { resumenPedido(id: ID!): ResumenPedido, misPedidos: [PedidoBasico!]! }
type ResumenPedido { id: ID!, total: Int!, estado: String!, pagoEstado: String!, items: [ItemResumen!]! }
type PedidoBasico { id: ID!, total: Int!, estado: String!, pagoEstado: String! }
type ItemResumen { nombre: String!, cantidad: Int!, precioUnitario: Int!, descripcion: String }
`;
function parse(query,variables={}) {
 if(typeof query!=='string'||query.length>1500)throw new HttpError(400,'Consulta GraphQL inválida o demasiado larga.');
 if(/__\w+|mutation|subscription|fragment|\.\.\.|alias|@/.test(query))throw new HttpError(400,'Operación GraphQL no permitida.');
 // Solo Query: operacion documentada, con campos sin alias ni fragmentos.
 const pre=query.replace(/#[^\n]*/g,'').trim();
 const open=pre.indexOf('{');if(open<0)throw new HttpError(400,'Falta selección GraphQL.');
 const head=pre.slice(0,open).trim();
 if(head && !/^query(?:\s+[A-Za-z_]\w*)?(?:\s*\(\s*\$id\s*:\s*ID\s*!\s*\))?$/.test(head))throw new HttpError(400,'Encabezado GraphQL no permitido.');
 const raw=pre.slice(open);
 const tokens=raw.match(/[A-Za-z_]\w*|\$[A-Za-z_]\w*|\d+|[{}():,]/g)||[];
 const stripped=raw.replace(/\s+|#[^\n]*/g,'');if(tokens.join('')!==stripped)throw new HttpError(400,'Token GraphQL inválido.');
 let i=0,cost=0;
 const take=()=>tokens[i++];const expect=s=>{if(take()!==s)throw new HttpError(400,'Sintaxis GraphQL inválida.');};
 function fields(depth){
  if(depth>3)throw new HttpError(400,'Profundidad GraphQL excedida.');
  expect('{');const result=[];
  while(tokens[i]!=='}'){
   if(i>=tokens.length)throw new HttpError(400,'Selección sin cerrar.');
   const field=take();if(!/^[A-Za-z_]\w*$/.test(field))throw new HttpError(400,'Campo inválido.');
   cost++;if(cost>24)throw new HttpError(400,'Costo GraphQL excedido.');
   let arg=null;
   if(tokens[i]==='('){expect('(');expect('id');expect(':');arg=take();if(!/^\d+$|^\$id$/.test(arg))throw new HttpError(400,'Argumento id inválido.');expect(')');}
   let children=null;if(tokens[i]==='{')children=fields(depth+1);
   result.push({field,arg,children});
  }
  expect('}');return result;
 }
 const selection=fields(0);if(i!==tokens.length||selection.length!==1)throw new HttpError(400,'Una consulta por solicitud.');
 const root=selection[0];
 if(!['resumenPedido','misPedidos'].includes(root.field))throw new HttpError(400,'Campo de consulta no permitido.');
 if(root.field==='resumenPedido'&&root.arg===null)throw new HttpError(400,'Se requiere id.');
 if(root.field==='misPedidos'&&root.arg!==null)throw new HttpError(400,'No se permiten argumentos.');
 if(!root.children)throw new HttpError(400,'Se requieren subcampos.');
 if(root.field==='resumenPedido')root.id=integer(root.arg==='$id'?variables.id:root.arg,'Id');
 const allowed=new Set(root.field==='resumenPedido'?['id','total','estado','pagoEstado','items']:['id','total','estado','pagoEstado']);
 for(const f of root.children){
  if(!allowed.has(f.field))throw new HttpError(400,'Campo no autorizado: '+f.field);
  if(f.field==='items'){
   if(!f.children)throw new HttpError(400,'items requiere subcampos.');
   for(const k of f.children)if(!['nombre','cantidad','precioUnitario','descripcion'].includes(k.field)||k.children||k.arg)throw new HttpError(400,'Campo de item no permitido.');
  }else if(f.children||f.arg)throw new HttpError(400,'Selección inválida.');
 }
 return root;
}
function project(obj,fields){const result={};for(const f of fields)result[f.field]=f.children?(Array.isArray(obj[f.field])?obj[f.field].map(x=>project(x,f.children)):[]):obj[f.field]??null;return result;}
const routes=[r('POST',/^\/query$/,async ctx=>{
 mustUser(ctx);
 const root=parse(ctx.body.query,ctx.body.variables||{});
 if(root.field==='misPedidos'){
  const rows=await requestTo('orders','/orders/mine',{userId:ctx.userId,role:ctx.role});
  return {data:{misPedidos:rows.map(x=>project(x,root.children))}};
 }
 const order=await requestTo('orders','/internal/orders/'+root.id,{userId:ctx.userId,role:ctx.role});
 let err=[];
 let items=order.items.map(x=>({...x}));
 if(root.children.some(x=>x.field==='items'&&x.children.some(k=>k.field==='descripcion'))){
  try {
   const products=await requestTo('inventory','/internal/batch',{method:'POST',body:{ids:items.map(x=>x.productoId)}});
   const byId=new Map(products.map(p=>[p.id,p]));
   items=items.map(x=>({...x,descripcion:byId.get(x.productoId)?.descripcion??null}));
  }catch(e){items=items.map(x=>({...x,descripcion:null}));err.push({message:'Descripciones temporalmente no disponibles.'});}
 }
 const data={id:order.id,total:order.total,estado:order.estado,pagoEstado:order.pagoEstado,items};
 return {data:{resumenPedido:project(data,root.children)},...(err.length?{errors:err}:{})};
})];
function start(){return router('GRAPHQL_SERVICE_KEY',routes).listen(ports().graphql,'127.0.0.1',()=>console.log('graphql ready'));}
module.exports={start,SCHEMA,parse};
