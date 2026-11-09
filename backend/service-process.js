'use strict';
const {verifySecrets}=require('./src/common');
verifySecrets();
const name=process.argv[2];
if(!['inventory','clients','orders','payments','graphql','gateway'].includes(name))throw Error('Servicio desconocido');
const server=require('./src/'+name).start();
server.on('listening',()=>process.send?.({ready:name}));
function stop(){server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),1200).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
