// node studies/dodgeball-layouts.cjs <study-report.json> [game-seeds.json]
const fs=require('node:fs');
const {D,modes,fly,screen}=require('./random-dodgeball.cjs');
const {writeGameSeeds}=require('./dodgeball-catalog.cjs');

function wins(bodies,mode,layout,first,count){
  let won=0;
  for(let i=0;i<count;i++)if(fly(bodies,mode,first+i,layout).win)won++;
  return won;
}

function qualify(layout,count=512){
  const family=D.layouts[layout];
  const central=family.bodies.map((state,i)=>({...D.pieces[i],...state}));
  const centerResult=screen(central,layout);
  if(centerResult!=='accepted')throw Error(family.name+' centre failed '+centerResult);
  const entries=[],rejections={},heldOutWins=[0,0],lowestHeldOut=[32,32];
  let tried=0;
  while(entries.length<count && tried<count*100){
    const seed=layout*D.layoutStride+tried++;
    const bodies=D.layoutPieces(seed);
    let result=screen(bodies,layout);
    if(result==='accepted'){
      const selection=modes.map(mode=>wins(bodies,mode,layout,0,16));
      if(Math.min(...selection)<14)result='imperfect throws';
      else{
        const holdout=modes.map(mode=>wins(bodies,mode,layout,2000,32));
        holdout.forEach((n,i)=>{heldOutWins[i]+=n;lowestHeldOut[i]=Math.min(lowestHeldOut[i],n);});
        const [cover,frame]=bodies.map(({p,v})=>({p,v}));
        entries.push({code:'DB2-'+seed.toString(16).toUpperCase().padStart(8,'0'),cover,frame,selection,holdout});
      }
    }
    if(result!=='accepted')rejections[result]=(rejections[result]??0)+1;
  }
  if(entries.length!==count)throw Error(family.name+' exhausted its search budget at '+entries.length);
  const summary={layout,name:family.name,tried,accepted:count,rejections,heldOutWins,lowestHeldOut};
  return {summary,entries};
}
if(require.main===module){
  const [output,seeds]=process.argv.slice(2);
  if(!output)throw Error('Supply a report filename and optionally the game catalog filename.');
  const report={format:'Fastball Dodgeball study v2',modes,selectionTrialsPerMode:16,holdoutTrialsPerMode:32,layouts:[],entries:[]};
  for(const layout of D.layouts.keys()){
    const {summary,entries}=qualify(layout);
    report.layouts.push(summary);report.entries.push(...entries);
    console.log(JSON.stringify(summary));
  }
  fs.writeFileSync(output,JSON.stringify(report)+'\n');
  if(seeds)writeGameSeeds(report,seeds);
}
module.exports={qualify};
