'use strict';
// Laboratorio local desechable: servicios reales, datos ficticios y claves efímeras.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const readline=require('node:readline');
const backend=path.resolve(__dirname,'..');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'asador-ui-'));
const evidence=path.resolve(process.env.EVIDENCE_DIR||path.join(backend,'data','validacion-ui'));
fs.mkdirSync(evidence,{recursive:true});
const env={...process.env,DB_DIR:folder,PORT:process.env.PORT||'3400',PUBLIC_HOST:'127.0.0.1',PAYMENTS_DEMO:'1',NODE_ENV:'test'};
for(const key of ['JWT_SECRET','INVENTORY_SERVICE_KEY','ORDERS_SERVICE_KEY','CLIENTS_SERVICE_KEY','PAYMENTS_SERVICE_KEY','GRAPHQL_SERVICE_KEY','PAYMENT_WEBHOOK_SECRET'])env[key]=crypto.randomBytes(48).toString('hex');
const names=['inventory','clients','orders','payments','graphql','gateway'],children=new Map();
const log=fs.createWriteStream(path.join(evidence,'trazas-ui.jsonl'),{flags:'a'});
function metadata(){fs.writeFileSync(path.join(evidence,'entorno.json'),JSON.stringify({fecha:new Date().toISOString(),supervisorPid:process.pid,port:Number(env.PORT),dbDir:folder,node:process.version,servicios:Object.fromEntries([...children].map(([name,child])=>[name,{pid:child.pid,activo:child.exitCode===null&&child.signalCode===null}]))},null,2));}
async function start(name){
 if(children.get(name)&&children.get(name).exitCode===null&&children.get(name).signalCode===null)return;
 const child=spawn(process.execPath,['service-process.js',name],{cwd:backend,env,stdio:['ignore','pipe','pipe','ipc']});children.set(name,child);
 child.stdout.on('data',d=>log.write(d));child.stderr.on('data',d=>log.write(d));
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No inició '+name)),8000);child.once('message',()=>{clearTimeout(timer);resolve()});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);if(code)reject(Error(name+': '+code))})});metadata();
}
async function stop(name){const child=children.get(name);if(child&&child.exitCode===null&&child.signalCode===null){const closed=new Promise(resolve=>child.once('exit',resolve));child.kill();await closed;metadata()}}
let stopping=false;
async function shutdown(){if(stopping)return;stopping=true;for(const name of [...names].reverse())await stop(name);log.end();console.log('Laboratorio detenido. Datos temporales conservados: '+folder);process.exit(0)}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
(async()=>{
 for(const name of names)await start(name);
 console.log('Laboratorio: http://127.0.0.1:'+env.PORT);
 console.log('Comandos: stop inventory | start inventory | stop payments | start payments | exit');
 const input=readline.createInterface({input:process.stdin});
 for await(const line of input){const [command,name]=line.trim().split(/\s+/);try{if(command==='exit'){await shutdown();return}if(!names.includes(name)||!['start','stop'].includes(command)){console.log('Comando inválido');continue}await(command==='start'?start(name):stop(name));console.log(command+' '+name+': completado')}catch(e){console.error(e.message)}}
})().catch(async e=>{console.error(e.message);await shutdown()});
