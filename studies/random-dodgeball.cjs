// Offline qualification using the game's own DB1 generator and flight model.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'../src',name+'.js'),'utf8');
const {F,D}=vm.runInNewContext(read('physics')+read('debris')+';({F:Flight,D:Debris})',{Math});
const modes=['Straight-Line','Orbital'],start=F.opening(4,0,false);
const trials=16,sampleSize=256;
const fixedCommands=Object.fromEntries(modes.map(mode=>{
  const first=F.command(F.transfer(F.motion(start,12,mode),[3,0,3],420,mode),5,511);
  const last=mode==='Orbital'?{az:-31,el:81,power:99}:{az:104,el:88,power:98};
  return [mode,[first,{tool:7,az:0,el:-90,power:100},{tool:8,...last}]];
}));
function propose(seed,correlated){
  if(correlated)return D.seededPieces(seed);
  const rng=F.seedStream(seed),delta=width=>(2*rng()-1)*width;
  return D.pieces.map(base=>{
    const dp=[delta(2.2),delta(2.8),delta(1.3)];
    // Preserve the original independent-comparison stream's four unused draws.
    for(let i=0;i<4;i++)rng();
    const p=F.add(base.p,dp);
    const v=F.add(base.v,[delta(.032),delta(.038),delta(.020)]);
    return {...base,p,v};
  });
}
const view=F.angles(F.scale(start.p,-1)),forward=F.direction(...view),up=F.direction(view[0],view[1]+90),right=F.direction(view[0]-90,0);
function bounds(points){
  const pts=points.map(p=>{const d=F.sub(p,start.p),z=F.dot(d,forward);return [F.dot(d,right)/z,F.dot(d,up)/z];});
  return [0,1].map(i=>[Math.min(...pts.map(q=>q[i])),Math.max(...pts.map(q=>q[i]))]);
}
const targetBounds=bounds([-1,1].flatMap(a=>[-1,1].flatMap(b=>[-1,1].map(c=>F.half.map((x,i)=>x*[a,b,c][i])))));
function legible(bodies){
  return bodies.every(body=>{
    const b=bounds(body.mesh.faces.flatMap(face=>face.vertices.map(v=>F.add(body.p,v))));
    return b.some(([lo,hi],i)=>lo>targetBounds[i][1]+.015 || hi<targetBounds[i][0]-.015)
      && b[0][0]>-.72 && b[0][1]<.72 && b[1][0]>-.47 && b[1][1]<.47;
  });
}
function draws(mode,trial){
  const rng=F.seedStream(0x301060+trial),jitter=trial!==null;
  return fixedCommands[mode].map((c,i)=>{
    let dir=F.direction(c.az,c.el),power=c.power,t=[12,36,185][i];
    if(jitter){
      const angle=2*Math.PI*rng(),bend=Math.acos(1-rng()*(1-Math.cos(3*F.rad)));
      const side=F.add(F.scale(F.direction(c.az+90,0),Math.cos(angle)),F.scale(F.direction(c.az,c.el+90),Math.sin(angle)));
      dir=F.add(F.scale(dir,Math.cos(bend)),F.scale(side,Math.sin(bend)));
      power=F.clamp(Math.round(power+(2*rng()-1)*3),10,100);
      t+=(2*rng()-1)*5;
    }
    return {time:t,tool:c.tool,power,dir};
  });
}
function fly(bodies,mode,trial=null){
  let state=start,mask=511,t=0,gap=Infinity;
  const legs=[],releases=[];
  for(const cmd of [...draws(mode,trial),{time:600}]){
    const dt=cmd.time-t;
    const grab=F.entries(state,dt,mode,false,true).find(h=>F.softEnough(h.speed));
    const end=grab?.t??dt,forecast=D.forecast(state,t,end,mode,bodies);
    gap=Math.min(gap,forecast.nearest.gap);
    if(forecast.hit)return {win:false,gap};
    legs.push({state,time:t,end:t+end});
    state=F.motion(state,end,mode);t+=end;
    if(grab)return {win:true,gap,time:t,state,legs,releases,mask};
    if(cmd.tool===undefined)break;
    state=F.release(state,cmd.tool,cmd.power,cmd.dir,mask);mask^=1<<cmd.tool;
    releases.push({...cmd,p:state.p,v:state.v});
  }
  return {win:false,gap};
}
function screen(bodies){
  if(!legible(bodies))return 'opening view';
  for(const mode of modes){
    // The closest-pass search resolves gaps to within 0.012 m.
    if(D.forecast(start,0,90,mode,bodies).nearest.gap<1.012)return 'first 90 seconds';
    const run=fly(bodies,mode);
    if(!run.win||run.gap<.262||run.time>540)return 'nominal route';
    for(const [i,index,minLead] of [[1,0,45],[2,1,70]]){
      const leg=run.legs[i];
      const encounter=D.forecast(leg.state,leg.time,600-leg.time,mode,bodies).hit;
      if(encounter?.body!==bodies[index]||encounter.t<minLead)return 'encounter sequence';
    }
  }
  return 'accepted';
}
function study(correlated){
  const counts={},approved=[];
  const ts=performance.now();
  for(let k=0;k<sampleSize;k++){
    const seed=(0x7c3393+k*7919)>>>0,bodies=propose(seed,correlated);
    let status=screen(bodies);
    if(status==='accepted'){
      const wins=modes.map(m=>Array.from({length:trials},(_,i)=>fly(bodies,m,i).win).filter(Boolean).length);
      if(Math.min(...wins)>=14)approved.push({seed,wins});
      else status='imperfect throws';
    }
    counts[status]=(counts[status]??0)+1;
  }
  console.log(correlated?'Coupled':'Independent',counts,'accepted examples',approved.slice(0,3),
    'total ms',Math.round(performance.now()-ts));
  return approved;
}
function holdout(approved){
  const count=64;
  for(const mode of modes){
    const wins=approved.map(({seed})=>{
      const bodies=propose(seed,true);
      return Array.from({length:count},(_,i)=>fly(bodies,mode,2000+i).win).filter(Boolean).length;
    });
    console.log(mode,'fresh successful flights',wins.reduce((a,b)=>a+b,0),'of',count*wins.length);
  }
}
if(require.main===module){
  study(false);
  holdout(study(true));
}
module.exports={F,D,start,modes,propose,fly,screen,study};
