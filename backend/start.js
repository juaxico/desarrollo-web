'use strict';
// Supervisor local de procesos independientes. Cada microservicio usa su propia base de datos.
const {fork}=require('node:child_process');
require('./src/common').verifySecrets();
const names=['inventory','clients','orders','payments','graphql','gateway'];
const children=[];let stopping=false;
async function launch(name){
 return new Promise((resolve,reject)=>{
  const child=fork('./service-process.js',[name],{cwd:__dirname,env:process.env,stdio:['inherit','inherit','inherit','ipc']});
  children.push(child);let ready=false;
  child.on('message',m=>{if(m.ready===name){ready=true;resolve();}});
  child.on('exit',(code)=>{
   if(!ready)reject(Error(name+' no inició (exit '+code+')'));
   else if(!stopping){console.error(name+' se detuvo de forma inesperada.');stop(1);}
  });
  child.on('error',reject);
 });
}
function stop(code=0){if(stopping)return;stopping=true;for(const c of children)if(c.exitCode===null)c.kill('SIGTERM');setTimeout(()=>process.exit(code),1400).unref();}
process.on('SIGTERM',()=>stop());process.on('SIGINT',()=>stop());
(async()=>{try{for(const name of names)await launch(name);}catch(e){console.error(e.message);stop(1);}})();
