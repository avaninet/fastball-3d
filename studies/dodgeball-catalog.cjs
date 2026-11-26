// Usage: node studies/dodgeball-catalog.cjs <report.json> [count] [game-seeds.json]
const fs=require('node:fs');
const {D,modes,propose,fly,screen}=require('./random-dodgeball.cjs');

function build(count){
  const entries=[],rejections={},heldOutWins=[0,0],lowestHeldOut=[32,32];
  let tried=0;
  while(entries.length<count && tried<count*100){
    const seed=(0x7c3393+tried*7919)>>>0;
    tried++;
    const bodies=propose(seed,true);
    let status=screen(bodies);
    if(status==='accepted'){
      const wins=modes.map(mode=>Array.from({length:16},(_,i)=>fly(bodies,mode,i).win).filter(Boolean).length);
      if(Math.min(...wins)<14)status='imperfect throws';
      else{
        // These 32 trials are held out of selection. Reuse the same draws
        // across seeds so harder starting positions can be compared directly.
        const holdout=modes.map(mode=>Array.from({length:32},(_,i)=>fly(bodies,mode,2000+i).win).filter(Boolean).length);
        holdout.forEach((n,i)=>{heldOutWins[i]+=n;lowestHeldOut[i]=Math.min(lowestHeldOut[i],n);});
        const code='DB1-'+seed.toString(16).toUpperCase().padStart(8,'0');
        entries.push({code,cover:{p:bodies[0].p,v:bodies[0].v},frame:{p:bodies[1].p,v:bodies[1].v},wins,holdout});
        if(entries.length%250===0)console.log(entries.length,'accepted from',tried);
      }
    }
    if(status!=='accepted')rejections[status]=(rejections[status]??0)+1;
  }
  if(entries.length!==count)throw Error('Search budget exhausted at '+entries.length+' accepted');
  const summary={tried,accepted:entries.length,rejections,heldOutWins,heldOutTrialsPerMode:32*count,lowestHeldOut};
  return {format:'Fastball Dodgeball study v1',boxPaddingMetres:D.padding,suitRadiusMetres:D.suitRadius,
    modes:[...modes],selectionTrialsPerMode:16,holdoutTrialsPerMode:32,summary,entries};
}
if(require.main===module){
  const [output,requested='1000',gameFile]=process.argv.slice(2),count=Number(requested);
  if(!output||!Number.isSafeInteger(count)||count<1||count>10000)throw Error('Supply an output file and a count from 1 to 10000');
  const catalog=build(count);
  fs.writeFileSync(output,JSON.stringify(catalog)+'\n');
  if(gameFile)writeGameSeeds(catalog,gameFile);
  console.log(JSON.stringify(catalog.summary));
}
function writeGameSeeds(catalog,file){
  const seeds=catalog.entries.map(e=>parseInt(e.code.slice(4),16));
  if(new Set(seeds).size!==seeds.length)throw Error('Duplicate seed ID');
  const lines=[];
  for(let i=0;i<seeds.length;i+=16)lines.push('  '+seeds.slice(i,i+16).join(', '));
  fs.writeFileSync(file,'[\n'+lines.join(',\n')+'\n]\n');
}
module.exports={writeGameSeeds};
