'use strict';
// Serializa las transiciones de un recurso dentro de su proceso propietario.
const pending=new Map();
function withLock(key,fn){
 const previous=pending.get(key)||Promise.resolve();
 const current=previous.catch(()=>{}).then(fn);
 pending.set(key,current);
 return current.finally(()=>{if(pending.get(key)===current)pending.delete(key)});
}
module.exports={withLock};
