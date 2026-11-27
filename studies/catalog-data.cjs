const fs=require('node:fs'),path=require('node:path');
function bytes(name){
  const b=fs.readFileSync(path.join(__dirname,'../assets',name));
  return new DataView(b.buffer,b.byteOffset,b.byteLength);
}
const create=Function(fs.readFileSync(path.join(__dirname,'../src/catalog.js'),'utf8')+';return createCatalog;')();
module.exports=create(bytes('drift-v1.bin'),bytes('dodgeball-v1.bin'),require('../assets/challenge-mask.json'));
