// Run with Node from any directory. All candidate changes exist only in this survey.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const scripts=['physics','readout'].map(name=>fs.readFileSync(path.join(root,'src',name+'.js'),'utf8'));
const {F,trimHint}=vm.compileFunction(scripts.join('\n')+'\nreturn {F:Flight,trimHint};')();
const {norm,unit,add,sub,scale,clamp}=F;
const tools=F.gear.map((g,i)=>i).sort((a,b)=>F.impulse(a,F.fullRack)-F.impulse(b,F.fullRack));
function coast(state,left,mode,soft){
  return F.entries(state,left,mode,F.inside(state.p),soft);
}
function choosePitch(wanted,mask){
  const available=tools.filter(i=>mask&(1<<i));
  const tool=available.find(i=>F.impulse(i,mask)>=wanted)??available.at(-1);
  return {tool,power:clamp(Math.round(100*wanted/F.impulse(tool,mask)),10,100)};
}
function newPilot(initial,mode,soft,deadline,record=false,rack=F.fullRack,story=false){
  const actions=[];
  let state=initial,time=0,mask=rack,throws=0,result;
  function wait(seconds){
    const dt=clamp(seconds,0,deadline-time);
    const hit=coast(state,dt,mode,soft).find(h=>!soft||F.softEnough(h.speed));
    if(hit){result={time:time+hit.t,throws,actions};return true;}
    state=F.motion(state,dt,mode);time+=dt;return false;
  }
  function pitch(tool,power,dir){
    if(record)actions.push({time,tool,power,dir});
    state=F.release(state,tool,power,dir,mask);mask=F.rackAfterThrow(mask,tool,story);throws++;
  }
  return {wait,pitch,get s(){return state;},get time(){return time;},get left(){return deadline-time;},get mask(){return mask;},get result(){return result;}};
}
// Follow only the words returned by the live HUD. The amount, reaction time,
// and angle represented by a word are assumptions about this pilot.
function suggestedBearing(text,bearing){
  const [az,el]=F.angles(bearing),right=F.direction(az-90,0),up=F.direction(az,el+90);
  if(text.includes('straight ahead'))return bearing;
  if(text.includes('straight behind'))return scale(bearing,-1);
  const x=Number(text.includes('right'))-Number(text.includes('left'));
  const y=Number(text.includes('up'))-Number(text.includes('down'));
  return unit(add(add(scale(right,x),scale(up,y)),scale(bearing,text.includes('behind')?-1:0)));
}
function hintPilot(initial,mode,soft,deadline,story,useHint=true){
  const p=newPilot(initial,mode,soft,deadline,false,F.fullRack,story);
  p.wait(story?0:12);
  let bearing=unit(p.s.p);
  p.pitch(5,95,bearing);
  while(!p.result&&p.left>0){
    const forecast=F.forecast(p.s,p.left,mode,F.inside(p.s.p),soft),entry=forecast.hits[0];
    if(!p.mask||(entry&&(!soft||F.softEnough(entry.speed)))){p.wait(p.left);break;}
    const delay=entry?Math.max(18,entry.t-18):18;
    if(p.wait(delay)||!p.left)break;
    const now=F.forecast(p.s,p.left,mode,F.inside(p.s.p),soft),next=now.hits[0];
    if(next&&(!soft||F.softEnough(next.speed))){p.wait(p.left);break;}
    let wanted;
    if((next&&soft)||F.inside(p.s.p)){
      bearing=unit(p.s.v);wanted=Math.max(.005,norm(p.s.v)-.065);
    }else{
      const near=now.near;
      const miss=near.t>.03?sub(near.p,near.bar):sub(p.s.p,F.nearest(p.s.p));
      bearing=useHint?suggestedBearing(trimHint(miss,...F.angles(bearing)),bearing):unit(p.s.p);
      wanted=near.t>18?(near.d+1)/near.t:.045;
    }
    const {tool,power}=choosePitch(wanted,p.mask);p.pitch(tool,power,bearing);
  }
  return p.result;
}
// Replay an economical route with bounded execution errors on every release.
function flyImperfect(p,route,draw){
  for(const action of route.actions){
    if(p.wait(action.time-p.time)||!p.left)return;
    const [az,el]=F.angles(action.dir),angle=2*Math.PI*draw();
    const tangent=add(scale(F.direction(az+90,0),Math.cos(angle)),scale(F.direction(az,el+90),Math.sin(angle)));
    const error=Math.acos(1-draw()*(1-Math.cos(3*F.rad)));
    p.pitch(action.tool,clamp(Math.round(action.power+6*draw()-3),10,100),
      add(scale(action.dir,Math.cos(error)),scale(tangent,Math.sin(error))));
  }
}
function executionCheck(initial,mode,soft,deadline,route,seed,story){
  if(!route)return 0;
  const p=newPilot(initial,mode,soft,deadline,false,F.fullRack,story),draw=F.seedStream(seed);
  flyImperfect(p,route,draw);
  if(p.result||coast(p.s,p.left,mode,soft).some(h=>!soft||F.softEnough(h.speed)))return 2;
  if(!p.mask||p.left<=12)return 0;
  const recovery=plannedRoutes(p.s,mode,soft,p.left,story,p.mask,12).economical;
  if(!recovery)return 0;
  const retry=newPilot(p.s,mode,soft,p.left,false,p.mask,story);
  flyImperfect(retry,recovery,draw);
  return retry.result||retry.wait(retry.left)?1:0;
}
// Search several arrival times and aim points. Between releases the pilot
// spends 12 live seconds looking and choosing gear. On a fast approach it can
// release a brake before contact. These are feasible routes, never lower bounds.
function plannedRoutes(initial,mode,soft,deadline,story,mask=F.fullRack,setupDelay=story?0:12){
  let economical,quickest;
  function record(r){
    if(!r)return;
    if(!economical||r.throws<economical.throws||(r.throws===economical.throws&&r.time<economical.time))economical=r;
    if(!quickest||r.time<quickest.time)quickest=r;
  }
  const arrivals=[100,160,220,280,340,400,445,475,510,545,575,598];
  if(mask!==F.fullRack)arrivals.push(...[.5,.75,.95].map(f=>f*deadline));
  for(const arrival of arrivals){
    if(arrival>deadline)continue;
    for(const fraction of [.55,.87]){
      const p=newPilot(initial,mode,soft,deadline,true,mask,story);p.wait(setupDelay);
      const target=scale(F.nearest(initial.p),fraction);
      while(p.mask&&p.left>0&&!p.result){
        const leftToTarget=arrival-(deadline-p.left);if(leftToTarget<8)break;
        const hits=coast(p.s,p.left,mode,soft);
        const hit=hits.find(h=>!soft||F.softEnough(h.speed));
        if(hit){p.wait(hit.t+1e-5);break;}
        if(hits.length&&soft){
          const entry=hits[0];if(p.wait(Math.max(0,entry.t-24))||!p.left)break;
          const brake=choosePitch(Math.max(.004,norm(p.s.v)-.065),p.mask);
          p.pitch(brake.tool,brake.power,unit(p.s.v));
        }else{
          const dv=F.transfer(p.s,target,leftToTarget,mode);
          const {tool}=choosePitch(norm(dv),p.mask);
          const c=F.command(dv,tool,p.mask);p.pitch(tool,c.power,F.direction(c.az,c.el));
        }
        if(p.wait(12))break;
      }
      if(!p.result)p.wait(p.left);
      record(p.result);
    }
  }
  return {economical,quickest};
}
function percentile(xs,f=.5){if(!xs.length)return null;return +xs.sort((a,b)=>a-b)[Math.floor((xs.length-1)*f)].toFixed(2);}
function stats(states,mode,soft,deadline,story){
  const options=states.map(s=>plannedRoutes(s,mode,soft,deadline,story)),plans=options.filter(r=>r.economical);
  const aided=states.map(s=>hintPilot(s,mode,soft,deadline,story)).filter(Boolean);
  const noDirection=states.filter(s=>hintPilot(s,mode,soft,deadline,story,false)).length;
  const execution=states.map((s,i)=>executionCheck(s,mode,soft,deadline,options[i].economical,4817+i,story));
  return {n:states.length,hints:aided.length,withoutTrimDirection:noDirection,
    imperfect:execution.filter(result=>result===2).length,withRecovery:execution.filter(Boolean).length,planned:plans.length,
    medianFewest:percentile(plans.map(r=>r.economical.throws)),fivePlus:plans.filter(r=>r.economical.throws>=5).length,
    medianFastest:percentile(plans.map(r=>r.quickest.time)),finalMinute:plans.filter(r=>r.quickest.time>=deadline-60).length,
    lateAndFive:plans.filter(r=>r.quickest.time>=deadline-60&&r.economical.throws>=5).length,
    hintTools:percentile(aided.map(r=>r.throws)),hintTime:percentile(aided.map(r=>r.time))};
}
function variant(s,distance,speed,outward,minGap=0,maxGap=Infinity,holdSpeed=false){
  const bar=F.nearest(s.p);
  const gap=clamp(F.clearance(s.p)*distance,minGap,maxGap);
  const velocity=add(scale(s.v,speed),scale(unit(s.p),outward));
  return {...s,p:add(bar,scale(unit(sub(s.p,bar)),gap)),v:holdSpeed?scale(unit(velocity),norm(s.v)):velocity};
}
function geometry(states){
  function range(fn){const xs=states.map(fn);return [Math.min(...xs),percentile(xs),Math.max(...xs)].map(x=>+x.toFixed(3));}
  return {clearance:range(s=>F.clearance(s.p)),speed:range(s=>norm(s.v)),
    angleFromOutward:range(s=>Math.acos(clamp(F.dot(unit(s.p),unit(s.v)),-1,1))/F.rad),
    sideways:range(s=>{const radial=unit(s.p);return norm(sub(s.v,scale(radial,F.dot(s.v,radial))));})};
}
const print=(label,data)=>console.log(label,JSON.stringify(data));
for(const story of [false,true]){
  const named=F.named.map((_,i)=>F.opening(i,0,story));
  const generated=Array.from({length:128},(_,i)=>F.opening(3,'D-'+(104729+i).toString(16),story));
  const legacy=Array.from({length:128},(_,i)=>F.opening(3,104729+i,story));
  print(story?'Story geometry':'Manual geometry',geometry(generated));
  for(const mode of ['Straight-Line','Orbital'])for(const soft of [false,true]){
    const label=[story?'Story':'Manual',mode,soft?'soft':'any'].join(' ');
    const result=stats(generated,mode,soft,600,story);
    if(!story && mode==='Orbital' && soft){
      assert.equal(result.planned,128,'D-family planned soft returns');
      assert.equal(result.hints,115,'D-family manual Orbital hint pilot');
    }
    print(label+' D-seeds',result);
    print(label+' legacy',stats(legacy,mode,soft,600,story));
    print(label+' named',named.map(s=>({name:s.name,...stats([s],mode,soft,600,story)})));
  }
}
// Gap multiplier, velocity multiplier, added outward m/s, optional gap limits
// and whether to normalize back to initial speed for the direction-only trial.
const variants=[
  [1,1,0],[1.35,1,0],[1,1.8,0],[1,1,.045,0,Infinity,true],
  [1,1.8,.045],[1.35,1.8,.045],[1.55,2.15,.065],
  [2.35,1.7,.045],[2.65,1.6,.055],[2.65,1.6,.055,57,81],[2.45,1.55,.04,54,77]
];
for(const holdout of [false,true]){
  const sample=Array.from({length:128},(_,i)=>F.opening(3,'D-'+(holdout?0x726800+i*1543:104729+i).toString(16),false));
  for(const change of variants){
    const states=sample.map(s=>variant(s,...change)),label=(holdout?'Holdout':'Paired')+' '+change.join('/');
    print(label+' geometry',geometry(states));
    for(const deadline of [450,600])print(label+' '+deadline,stats(states,'Orbital',true,deadline,false));
  }
}
