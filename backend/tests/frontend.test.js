'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const front=path.resolve(__dirname,'../../frontend');
function storage(){const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)}}
function element(){return {disabled:false,className:'',textContent:'',innerHTML:'',remove(){},setAttribute(){},addEventListener(){},appendChild(){},querySelector(){return null}}}
function harness(file,fetcher=async()=>({ok:true,json:async()=>({})})){
 const alerts=[],events=[];
 const document={body:{insertAdjacentHTML(){}},addEventListener(){},dispatchEvent:e=>events.push(e.type),getElementById:()=>element(),querySelector:()=>null};
 const ctx={document,window:{},localStorage:storage(),sessionStorage:storage(),CustomEvent:class{constructor(type){this.type=type}},fetch:fetcher,AbortController,setTimeout,clearTimeout,console,crypto:require('node:crypto').webcrypto};
 document.querySelector=selector=>selector==='.acciones-header'?{querySelector:()=>null,appendChild:node=>alerts.push(node)}:null;
 // El encabezado no se renderiza en este harness; la interfaz se prueba en navegador.
 const original=document.querySelector;document.querySelector=selector=>file==='auth.js'&&selector==='.acciones-header'&&!ctx.window.Auth?null:original(selector);
 document.createElement=()=>element();
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(front,'assets/js',file),'utf8'),ctx);
 return {ctx,alerts,events};
}
test('Carrito: almacenamiento malformado no interrumpe la página',()=>{const {ctx}=harness('pedido.js');for(const raw of ['{','null','{}','[null,{},1]']){ctx.localStorage.setItem('pedido',raw);assert.equal(ctx.obtenerPedido().length,0)}});
test('Carrito: cantidades inválidas no se usan como compra',()=>{const {ctx}=harness('pedido.js');for(const cantidad of [0,-1,1.5,51,true]){ctx.localStorage.setItem('pedido',JSON.stringify([{nombre:'Filete',precio:20000,cantidad}]));assert.equal(ctx.obtenerPedido().length,0)}});
test('Carrito: texto HTML se escapa también en atributos',()=>{const {ctx}=harness('pedido.js');const escaped=ctx.escaparPedido('<img src=x onerror="alert(1)">');assert(!escaped.includes('<'));assert(!escaped.includes('"'));assert(escaped.includes('&lt;img'))});
test('Sesión: logout revoca antes de limpiar el almacenamiento',async()=>{
 let calls=0;const {ctx}=harness('auth.js',async(url)=>{calls++;assert.equal(url,'/api/auth/logout');assert.equal(ctx.localStorage.getItem('asador_token'),'token-ficticio');return {ok:true,json:async()=>({})}});
 ctx.localStorage.setItem('asador_token','token-ficticio');await ctx.window.Auth.cerrarSesion();assert.equal(calls,1);assert.equal(ctx.localStorage.getItem('asador_token'),null);
});
test('Sesión: un 401 limpia el estado sin solicitar otro logout',async()=>{
 let calls=0;const {ctx}=harness('auth.js',async()=>{calls++;return {ok:false,status:401,json:async()=>({error:'Sesión revocada'})}});
 ctx.localStorage.setItem('asador_token','token-ficticio');await assert.rejects(ctx.window.Auth.api('/auth/me'));assert.equal(calls,1);assert.equal(ctx.localStorage.getItem('asador_token'),null);
});
test('Sesión: fallo del servidor conserva sesión y comunica recuperación',async()=>{
 const {ctx,alerts}=harness('auth.js',async()=>({ok:false,status:503,json:async()=>({error:'Servicio no disponible'})}));ctx.localStorage.setItem('asador_token','token-ficticio');await ctx.window.Auth.cerrarSesion();assert.equal(ctx.localStorage.getItem('asador_token'),'token-ficticio');assert.match(alerts[0].textContent,/Inténtalo nuevamente/);
});
test('Sesión: dos clics simultáneos generan una sola revocación',async()=>{
 let finish,calls=0;const {ctx}=harness('auth.js',()=>{calls++;return new Promise(resolve=>{finish=()=>resolve({ok:true,json:async()=>({})})})});ctx.localStorage.setItem('asador_token','token-ficticio');const first=ctx.window.Auth.cerrarSesion(),second=ctx.window.Auth.cerrarSesion();finish();await Promise.all([first,second]);assert.equal(calls,1);
});
