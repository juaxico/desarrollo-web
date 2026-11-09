'use strict';
// Diagnóstico no destructivo: no confirma, crea ni cambia pedidos.
const {ports} = require('../src/common');
const host = 'http://127.0.0.1:' + ports().gateway;
const active = process.env.PAYMENTS_DEMO === '1' && process.env.NODE_ENV !== 'production' &&
  ['127.0.0.1','localhost','::1'].includes(process.env.PUBLIC_HOST || '127.0.0.1');
console.log('\nDiagnóstico de El Asador / Payments');
console.log('Configuración local para procesar pagos:', active ? 'habilitada' : 'NO habilitada');
console.log('No se mostrarán claves ni datos de clientes.');
async function getStatus(url, opts={}) {
  try {
    const resp = await fetch(url,{...opts,signal:AbortSignal.timeout(3000)});
    const data = await resp.json().catch(()=>({}));
    return {status:resp.status,detail:data.error || ''};
  } catch(e) {return {status:0,detail:'Sin conexión al servicio'};}
}
(async()=>{
  const health=await getStatus(host+'/health');
  console.log('API Gateway:',health.status===200?'encendido':'NO disponible',`(HTTP ${health.status||'—'})`);
  const check=await getStatus(host+'/api/pagos/demo/1/confirmar',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  console.log('Ruta /api/pagos/demo/:id/confirmar:',check.status===401?'registrada':check.status===404?'NO registrada o desactualizada':`HTTP ${check.status||'—'}`);
  if (process.env.PAYMENTS_SERVICE_KEY) {
    const direct=await getStatus('http://127.0.0.1:'+ports().payments+'/internal/demo/confirm',{
      method:'POST',headers:{'Content-Type':'application/json','X-Service-Key':process.env.PAYMENTS_SERVICE_KEY},
      body:JSON.stringify({orderId:0,estado:'aprobado'})
    });
    console.log('Servicio Payments:',direct.status===400?'habilitado y respondiendo':direct.status===404?'DESHABILITADO en el proceso activo':`HTTP ${direct.status||'—'} ${direct.detail}`);
  } else console.log('Servicio Payments: falta configuración de claves.');
  if(!active) console.log('\nEn backend/.env configura PAYMENTS_DEMO=1 y reinicia npm start.');
  else if(check.status===404) console.log('\nActualiza backend/src/gateway.js y reinicia npm start.');
  else console.log('\nSi Payments figura deshabilitado, detén con Ctrl+C y vuelve a ejecutar npm start.');
})().catch(e=>{console.error('Diagnóstico interrumpido:',e.message);process.exitCode=1;});
