'use strict';
// Carga reproducible del catálogo público; no altera información.
const fs=require('node:fs'),path=require('node:path');const {performance}=require('node:perf_hooks');
const endpoint=process.env.LOAD_URL||'http://127.0.0.1:3000/api/productos';
const total=Number(process.env.LOAD_REQUESTS||240),concurrency=Number(process.env.LOAD_CONCURRENCY||12);
if(!Number.isInteger(total)||total<1||total>20000||!Number.isInteger(concurrency)||concurrency<1||concurrency>100)throw Error('Parámetros de carga inválidos');
const elapsed=[],errors=[];let next=0;
const start=performance.now(),cpuStart=process.cpuUsage(),memStart=process.memoryUsage().rss;
async function worker(){while(next<total){next++;const started=performance.now();try{const r=await fetch(endpoint,{signal:AbortSignal.timeout(6000)});if(!r.ok)throw Error('HTTP '+r.status);await r.arrayBuffer();}catch(e){errors.push(String(e.message));}elapsed.push(performance.now()-started);}}
(async()=>{await Promise.all(Array.from({length:Math.min(concurrency,total)},worker));const duration=(performance.now()-start)/1000;elapsed.sort((a,b)=>a-b);
const p95=elapsed[Math.max(0,Math.ceil(.95*elapsed.length)-1)],cpu=process.cpuUsage(cpuStart),rss=process.memoryUsage().rss;
const report={fecha:new Date().toISOString(),objetivo:'consulta catálogo',ambiente:process.version,endpoint,solicitudes:total,concurrencia:concurrency,duracionSegundos:Number(duration.toFixed(3)),p95Ms:Number(p95.toFixed(1)),throughputRps:Number((total/duration).toFixed(1)),errores:errors.length,cpuClienteMs:Number(((cpu.user+cpu.system)/1000).toFixed(1)),rssClienteInicioMB:Number((memStart/1048576).toFixed(1)),rssClienteFinMB:Number((rss/1048576).toFixed(1)),advertencia:'CPU y memoria corresponden al generador de carga, NO al proceso servidor.'};
fs.writeFileSync(path.join(__dirname,'..','tests','carga-resultados.json'),JSON.stringify(report,null,2)+'\n');console.log(report);if(errors.length)process.exitCode=1;})().catch(e=>{console.error(e);process.exitCode=1;});
