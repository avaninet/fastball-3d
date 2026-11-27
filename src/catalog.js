// Rows are immutable within a challenge version. DataViews specify byte order
// explicitly and decode only the single opening the player has selected.
function createCatalog(drift,dodge,challengeMask){
  const count=4096;
  if(drift.byteLength!==count*50 || dodge.byteLength!==count*6)throw Error('Incomplete flight catalog');
  function driftState(row){
    const n=row*50,vector=offset=>[0,1,2].map(i=>drift.getFloat64(n+offset+8*i,true));
    return {name:'Random drift',p:vector(0),v:vector(24),brief:'An unfamiliar separation. Read your drift and choose an opening pitch.'};
  }
  function mask(index,row){
    if(index===3)return drift.getUint16(row*50+48,true);
    if(index===5)return dodge.getUint16(row*6+4,true);
    return index===4?challengeMask:0xffff;
  }
  return {count,drift:driftState,debrisKey:row=>dodge.getUint32(row*6,true),mask};
}
