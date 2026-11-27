// Run from any directory. All simulation and selection happen offline.
const fs=require('node:fs'),path=require('node:path');
const {F,modes}=require('./random-dodgeball.cjs');
const order=F.gear.map((_,i)=>i).sort((a,b)=>F.impulse(a,F.fullRack)-F.impulse(b,F.fullRack));
function candidate(rng){
  const sign=rng()<.5?-1:1,p=[(rng()-.5)*54,sign*(12+rng()*18),(rng()-.5)*40];
  const [az,el]=F.angles(p),angle=rng()*2*Math.PI;
  const tangent=F.add(F.scale(F.direction(az+90,0),Math.cos(angle)),F.scale(F.direction(az,el+90),Math.sin(angle)));
  const sideways=.012+.115*rng(),outward=(rng()-.43)*.081;
  const v=F.add(F.scale(F.unit(p),outward),F.scale(tangent,sideways)),base={p,v};
  const manual=F.manualOpening(base);
  const demand=Math.max(...modes.map(m=>F.norm(F.transfer(manual,[0,0,0],500,m))));
  const bend=F.norm(F.sub(F.motion(manual,300,'Orbital').p,F.motion(manual,300,'Straight-Line').p));
  return {base,manual,demand,sideways,bend};
}
// Midcourse corrections use fresh measured state. The pilot uses integer aim
// and power settings, legal release times and the actual inventory after each throw.
const usualTimes=[12,42,155,330,455,508],extraTrimTimes=[12,42,155,195,330,455,508];
function rescue(initial,mode,story,trial,times=usualTimes){
  const rng=F.seedStream(trial+0x741921),error=amplitude=>trial<0?0:(2*rng()-1)*amplitude;
  const arrival=520;
  let state=initial,time=0,mask=F.fullRack,throws=0;
  for(const at of times){
    const t=at+error(5);
    state=F.motion(state,t-time,mode);time=t;
    const dv=at===508?F.scale(F.unit(state.v),-Math.max(0,F.norm(state.v)-.061)):
      F.transfer(state,[0,0,0],arrival-t,mode);
    const magnitude=F.norm(dv);
    if(magnitude<.0015 || (at!==508 && magnitude*(arrival-t)<.50))continue;
    const available=order.filter(i=>mask&(1<<i));
    if(!available.length)break;
    const tool=available.find(i=>F.impulse(i,mask)>=magnitude)??available.at(-1);
    const cmd=F.command(dv,tool,mask);
    const dir=F.direction(cmd.az+error(3),F.clamp(cmd.el+error(3),-90,90));
    state=F.release(state,tool,F.snapPower(cmd.power+error(3)),dir,mask);
    mask=F.rackAfterThrow(mask,tool,story);throws++;
  }
  const end=F.motion(state,arrival-time,mode);
  return {win:F.norm(end.p)<1.59 && F.norm(end.v)<.079,throws};
}
function qualify(c,schedules=[]){
  let mask=0xffff;
  for(const story of [false,true])for(const mode of modes){
    const s=story?c.base:c.manual;
    if(F.entries(s,600,mode).length)return 0;
    const schedule=[usualTimes,extraTrimTimes].find(times=>{
      if(!rescue(s,mode,story,-1,times).win)return false;
      let failures=0;
      for(let trial=0;trial<16;trial++)if(!rescue(s,mode,story,trial,times).win && ++failures>1)return false;
      return true;
    });
    if(!schedule)return 0;
    schedules.push(schedule);
    for(const pose of F.poses.slice(1)){
      const bit=1<<(pose.id-1);
      if((mask&bit) && F.entries(s,600,mode,false,false,pose).length)mask&=~bit;
    }
  }
  return mask;
}
function split(rows,field,n){
  const sorted=rows.slice().sort((a,b)=>a[field]-b[field]);
  return Array.from({length:n},(_,i)=>sorted.slice(i*rows.length/n,(i+1)*rows.length/n));
}
function generate(){
  const rng=F.seedStream(0xf1d2026);
  const pool=Array.from({length:16384},()=>candidate(rng));
  const strata=split(pool,'demand',4).flatMap(q=>split(q,'sideways',2).flatMap(s=>split(s,'bend',2)));
  const selected=[],wins=[0,0,0,0],totals=[0,0,0,0],tools=[Infinity,0];
  let screened=0;
  for(const group of strata){
    for(let i=group.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[group[i],group[j]]=[group[j],group[i]];}
    let n=0;
    for(const c of group){
      screened++;
      const schedules=[],mask=qualify(c,schedules);
      if(!mask)continue;
      selected.push({...c,mask});
      for(const story of [false,true])for(const [j,mode] of modes.entries()){
        const s=story?c.base:c.manual,k=2*Number(story)+j;
        const nominal=rescue(s,mode,story,-1,schedules[k]);
        tools[0]=Math.min(tools[0],nominal.throws);tools[1]=Math.max(tools[1],nominal.throws);
        for(let trial=2000;trial<2016;trial++){
          wins[k]+=Number(rescue(s,mode,story,trial,schedules[k]).win);totals[k]++;
        }
      }
      if(++n===256)break;
    }
    if(n!==256)throw Error('Only '+n+' qualified openings in a drift stratum');
  }
  const bytes=Buffer.alloc(selected.length*50);
  selected.forEach(({base,mask},row)=>{
    [...base.p,...base.v].forEach((v,i)=>bytes.writeDoubleLE(v,row*50+i*8));
    bytes.writeUInt16LE(mask,row*50+48);
  });
  fs.writeFileSync(path.join(__dirname,'../assets/drift-v1.bin'),bytes);
  const range=k=>[Math.min(...selected.map(r=>r[k])),Math.max(...selected.map(r=>r[k]))];
  console.log(JSON.stringify({screened,selected:selected.length,wins,totals,tools,demand:range('demand'),sideways:range('sideways'),bend:range('bend'),
    tilted:selected.reduce((n,c)=>n+c.mask.toString(2).replaceAll('0','').length,0)}));
}
function verifyFrozen(){
  const catalog=require('./catalog-data.cjs'),wins=[0,0,0,0],extraTrim=[];
  for(let row=0;row<catalog.count;row++){
    const base=catalog.drift(row),manual=F.manualOpening(base),schedules=[];
    if(qualify({base,manual},schedules)!==catalog.mask(3,row))throw Error('Drift qualification or tilt mask mismatch on row '+row);
    for(const story of [false,true])for(const [m,mode] of modes.entries()){
      const k=2*Number(story)+m,times=schedules[k];
      if(times===extraTrimTimes)extraTrim.push({row,mode,story});
      for(let trial=2000;trial<2016;trial++)wins[k]+=Number(rescue(story?base:manual,mode,story,trial,times).win);
    }
  }
  console.log(JSON.stringify({rows:catalog.count,extraTrim,n:catalog.count*16,wins}));
}
if(require.main===module){
  const action=process.argv[2]??'--verify';
  if(action==='--verify')verifyFrozen();
  else if(action==='--generate')generate();
  else throw Error('Use --verify for the frozen catalog or --generate to replace it.');
}
module.exports={rescue,qualify};
