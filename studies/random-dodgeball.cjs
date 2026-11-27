// Offline qualification using the game's debris generators and flight model.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'../src',name+'.js'),'utf8');
const {F,D,station}=vm.runInThisContext('(()=>{'+read('physics')+read('debris')+read('station')+';return {F:Flight,D:Debris,station:Station}})()');
const modes=['Straight-Line','Orbital'],start=F.opening(4,0,false);
const trials=16,sampleSize=256;
const fixedCommands=Object.fromEntries(modes.map(mode=>{
  const first=F.command(F.transfer(F.motion(start,12,mode),[3,0,3],420,mode),5,511);
  const last=mode==='Orbital'?{az:-31,el:81,power:99}:{az:104,el:88,power:98};
  return [mode,[first,{tool:7,az:0,el:-90,power:100},{tool:8,...last}]];
}));
// Each DB2 row gives the lamp throw and the two model-specific return
// pitches. These are integer cockpit settings, used only by the offline pilot.
const routes = [
  {detour:[0, -90], home:[[111, 83, 100], [17, 83, 91]]},
  {detour:[0, 90], home:[[30, -82, 69], [-26, -80, 75]]},
  {detour:[170, -32], home:[[-1, 34, 86], [-14, 33, 100]]},
  {detour:[0, 58], home:[[179, -53, 66], [165, -62, 56]]},
  {detour:[12, -40], home:[[-173, 43, 100], [175, 55, 73]]},
  {detour:[165, 38], home:[[-5, -33, 88], [-21, -36, 100]]},
  {detour:[145, -55], home:[[-25, 60, 85], [-41, 54, 92]]},
  {detour:[-18, 52], home:[[162, -54, 78], [149, -49, 57]]}
];
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
function legible(bodies,layout){
  const boxes=bodies.map(body=>bounds(body.mesh.faces.flatMap(face=>face.vertices.map(v=>F.add(body.p,v)))));
  const apart=boxes[0].some(([lo,hi],i)=>lo>boxes[1][i][1]+.015 || hi<boxes[1][i][0]-.015);
  return (layout===null || apart) && boxes.every(b=>{
    return b.some(([lo,hi],i)=>lo>targetBounds[i][1]+.015 || hi<targetBounds[i][0]-.015)
      && b[0][0]>-.72 && b[0][1]<.72 && b[1][0]>-.47 && b[1][1]<.47;
  });
}
function draws(mode,trial,layout){
  let commands=fixedCommands[mode],times=[12,36,185];
  if(layout!==null){
    const {detour,home}=routes[layout];
    const [az,el,power]=home[modes.indexOf(mode)];
    commands=[commands[0],{tool:7,az:detour[0],el:detour[1],power:100},{tool:8,az,el,power}];
    times=[12,36,180];
  }
  const rng=F.seedStream(0x301060+trial),jitter=trial!==null;
  return commands.map((c,i)=>{
    let dir=F.direction(c.az,c.el),power=c.power,t=times[i];
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
// A witness's coasts and grab time depend only on the throws. Reuse them
// across candidate debris pairs, then test every leg against that pair.
const tracks=new Map();
function track(mode,trial,layout,story,rule){
  const key=[mode,trial,layout,story,rule].join('/');
  if(tracks.has(key))return tracks.get(key);
  let state=start,mask=F.fullRack,t=0,win=false;
  const legs=[],releases=[];
  for(const cmd of [...draws(mode,trial,layout),{time:F.oxygenReserve}]){
    const dt=cmd.time-t;
    const grab=F.entries(state,dt,mode,false,rule).find(h=>F.canGrab(h,rule));
    const end=grab?.t??dt;
    legs.push({state,time:t,end:t+end});
    state=F.motion(state,end,mode);t+=end;
    if(grab){win=true;break;}
    if(cmd.tool===undefined)break;
    state=F.release(state,cmd.tool,cmd.power,cmd.dir,mask);
    mask=F.rackAfterThrow(mask,cmd.tool,story);
    releases.push({...cmd,p:state.p,v:state.v});
  }
  const route={win,time:t,state,legs,releases,mask};
  tracks.set(key,route);
  return route;
}
function fly(bodies,mode,trial=null,layout=null,story=false,rule=true){
  const route=track(mode,trial,layout,story,rule);
  let gap=Infinity;
  for(const leg of route.legs){
    const forecast=D.forecast(leg.state,leg.time,leg.end-leg.time,mode,bodies);
    gap=Math.min(gap,forecast.nearest.gap);
    if(forecast.hit)return {win:false,gap};
  }
  return {...route,gap};
}
// Expand every station part by the debris box's world-axis extents.
// The centre cannot reach any box outside a midpoint's speed-bound radius.
// Subdivide possible overlaps and conservatively reject unresolved intervals.
const sizes=D.pieces.map(({box})=>[0,1,2].map(axis=>
  Math.max(...box.faces.flatMap(f=>f.vertices.map(v=>Math.abs(v[axis]))))));
function expanded(min,max,size){
  return {min:F.sub(min,size),max:F.add(max,size)};
}
const stationBoxes=sizes.map(size=>station.parts.map(part=>expanded(part.min,part.max,size)));
const pairBox=expanded([0,0,0],[0,0,0],F.add(sizes[0],sizes[1]));
function clearsBoxes(state,mode,boxes){
  const speed=D.speedBound(state,mode);
  function clear(from,to,nearby){
    const half=(to-from)/2,p=F.motion(state,from+half,mode).p,pad=speed*half;
    const possible=nearby.filter(box=>p.every((x,i)=>x>=box.min[i]-pad && x<=box.max[i]+pad));
    if(!possible.length)return true;
    return half>.0625 && clear(from,from+half,possible) && clear(from+half,to,possible);
  }
  return clear(0,F.oxygenReserve,boxes);
}
function screen(bodies,layout=null){
  if(!legible(bodies,layout))return 'opening view';
  for(const mode of modes){
    // The closest-pass search resolves gaps to within 0.012 m.
    if(D.forecast(start,0,90,mode,bodies).nearest.gap<1.012)return 'first 90 seconds';
    const run=fly(bodies,mode,null,layout);
    if(!run.win||run.gap<.262||run.time>540)return 'nominal route';
    const first=layout!==null && layout>=4?1:0;
    for(const [i,index,minLead] of [[1,first,45],[2,1-first,70]]){
      const leg=run.legs[i];
      const encounter=D.forecast(leg.state,leg.time,600-leg.time,mode,bodies).hit;
      if(encounter?.body!==bodies[index]||encounter.t<minLead)return 'encounter sequence';
    }
    if(layout!==null){
      if(!bodies.every((body,i)=>clearsBoxes(body,mode,stationBoxes[i])))return 'station clearance';
      const relative={p:F.sub(bodies[0].p,bodies[1].p),v:F.sub(bodies[0].v,bodies[1].v)};
      if(!clearsBoxes(relative,mode,[pairBox]))return 'debris separation';
      const story=fly(bodies,mode,null,layout,true);
      if(!story.win||story.gap<.262||story.time>540)return 'Story route';
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
