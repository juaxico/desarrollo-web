'use strict';
const crypto=require('node:crypto');const fs=require('node:fs');const path=require('node:path');
const target=path.join(__dirname,'..','.env');
if(fs.existsSync(target)){console.log('Ya existe .env; no se sobrescribe.');process.exit(0);}
const keys=['JWT_SECRET','INVENTORY_SERVICE_KEY','ORDERS_SERVICE_KEY','CLIENTS_SERVICE_KEY','PAYMENTS_SERVICE_KEY','GRAPHQL_SERVICE_KEY','PAYMENT_WEBHOOK_SECRET'];
const content=['# Generado localmente. Nunca subir a GitHub.','PORT=3000','PUBLIC_HOST=127.0.0.1','# SOLO local: simula pagos, nunca cobra dinero.','PAYMENTS_DEMO=1',...keys.map(x=>`${x}=${crypto.randomBytes(48).toString('hex')}`)].join('\n')+'\n';
fs.writeFileSync(target,content,{mode:0o600,flag:'wx'});
console.log('Configuración local .env generada; guardarla privada.');
