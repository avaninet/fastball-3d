const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(process.argv[2] || path.join(__dirname,'../index.html'),'utf8');
const src=html.match(/<script id="physics">([\s\S]+?)<\/script>/)[1];
const F=vm.runInNewContext(src+';Flight',{Math}), modes=['Straight-Line','Orbital'];
const {norm,scale,unit,add,dot,clamp}=F;
function valid(hit,soft){return hit && (!soft || hit.speed<=F.limit+1e-9);}
function plan(s,mode,mask,left,soft,skipInitial=false) {
  const rack=[0,1,2,3,4,5].filter(i=>mask&(1<<i));
  if(!rack.length || left<1) return null;
  const targets=[scale(F.nearest(s.p),.55),[0,0,0],scale(F.nearest(s.p),.84)];
  const times=[.75,.88,.61,.95,.48,.32].map(f=>f*left);
  for(const count of [1,2,3]) for(const target of targets) for(const t of times) {
    let p=s,bag=mask,delay=0,actions=[];
    for(let step=0;step<count;step++) {
      const dv=F.transfer(p,target,t-delay,mode), mag=norm(dv);
      const avail=rack.filter(i=>bag&(1<<i));
      const finish=avail.filter(i=>F.impulse(i,bag)*1.005>=mag).sort((a,b)=>F.impulse(a,bag)-F.impulse(b,bag))[0];
      const tool=finish ?? avail.sort((a,b)=>F.impulse(b,bag)-F.impulse(a,bag))[0];
      if(tool===undefined) break;
      const c=F.command(p,dv,tool,bag); actions.push({...c,delay});
      p=F.applyCommand(p,c,bag);bag^=1<<tool;
      if(finish!==undefined || step===count-1) {
        const hit=F.entries(p,left-delay,mode,skipInitial && delay===0)[0];
        if(valid(hit,soft)) return {actions,hit:{...hit,t:hit.t+delay}};
        break;
      }
      if(F.entries(p,4,mode,skipInitial && delay===0).length) break;
      p=F.motion(p,4,mode);delay+=4;
    }
  }
  return null;
}
function perturb(c,angle,pct,draw) {
  const v=F.direction(c.az,c.el),a=draw()*2*Math.PI,b=Math.acos(1-draw()*(1-Math.cos(angle*F.rad)));
  const side=F.direction(c.az+90,0),up=F.direction(c.az,c.el+90);
  const direction=add(scale(v,Math.cos(b)),scale(add(scale(side,Math.cos(a)),scale(up,Math.sin(a))),Math.sin(b)));
  return {...c,dir:direction,power:clamp(Math.round(c.power+(draw()*2-1)*pct),10,100)};
}
function runPlan(s,mode,mask,left,soft,actions,angle,pct,draw) {
  let elapsed=0;
  for(const c of actions) {
    const dt=c.delay-elapsed;
    if(dt>0) {
      const hit=F.entries(s,dt,mode)[0]; if(hit) return {win:!!valid(hit,soft),early:true};
      s=F.motion(s,dt,mode);elapsed+=dt;
    }
    const pc=perturb(c,angle,pct,draw);
    s=F.release(s,c.tool,pc.power,pc.dir,mask);mask^=1<<c.tool;
  }
  const hit=F.entries(s,left-elapsed,mode)[0];
  return {win:!!valid(hit,soft),s,mask,elapsed,hit};
}
const starts=Array.from({length:128},(_,i)=>F.randomStart(104729+i));
for(const mode of modes) {
  const simple=starts.map(s=>F.entries(F.release(s,5,95,unit(s.p),63),450,mode)[0]);
  console.log(mode,'face away + 95% battery, any / soft',simple.filter(Boolean).length,simple.filter(h=>valid(h,true)).length);
  for(const soft of [false,true]) {
    const named=F.named.map(s=>{
      const r=plan(s,mode,63,450,soft); assert.ok(r,s.name+' '+mode);
      return [s.name,r.actions.map(c=>[c.tool,c.az,c.el,c.power]),Math.round(r.hit.t),r.hit.speed.toFixed(4)];
    });
    const rows=[];
    for(const [angle,pct] of [[0,0],[3,3],[5,5],[10,10]]) {
      let won=0,recovered=0;
      for(const [i,s] of starts.entries()) {
        const nominal=plan(s,mode,63,450,soft);assert.ok(nominal);
        const draw=F.seedStream(0xA580+i*19);
        const r=runPlan(s,mode,63,450,soft,nominal.actions,angle,pct,draw);
        if(r.win) {won++;recovered++;continue;}
        if(r.early)continue;
        const forecast=F.forecast(r.s,450-r.elapsed,mode);
        const time=Math.min(145,Math.max(8,(r.hit?.t??forecast.near.t)*.50));
        if(r.hit && r.hit.t<=time)continue;
        const next=F.motion(r.s,time,mode),left=450-r.elapsed-time;
        const fix=plan(next,mode,r.mask,left,soft);
        if(fix && runPlan(next,mode,r.mask,left,soft,fix.actions,angle,pct,draw).win)recovered++;
      }
      rows.push({angle,pct,opening:won,withCorrection:recovered});
    }
    console.log(mode,soft?'soft':'any',JSON.stringify({named,rows}));
  }
  // A spent battery and pouch, an already excessive speed toward the thin
  // station face, and a genuine first entry followed by an exit.
  let braked=0,returned=0,returnWithError=0,attempts=0;const bag=63^(1<<5)^(1<<3);
  for(let i=0;i<96;i++){
    const draw=F.seedStream(1501+i);
    const p=[(draw()-.5)*5,-1.6-8,(draw()-.5)*5],v=[(draw()-.5)*.012,.10+draw()*.035,(draw()-.5)*.012];
    const s={p,v},hits=F.entries(s,320,mode);assert.ok(hits[0]?.speed>F.limit);
    const deadline=320,leadTime=hits[0].t-18,approach=F.motion(s,leadTime,mode);
    const braking=F.command(approach,scale(unit(approach.v),-(norm(approach.v)-.061)),4,bag);
    const bv=F.applyCommand(approach,braking,bag);
    if(valid(F.entries(bv,deadline-leadTime,mode)[0],true))braked++;
    let after=hits[0].t+1;
    while(F.inside(F.motion(s,after,mode).p) && after<deadline)after+=.5;
    after+=10;
    const outbound=F.motion(s,after,mode),left=deadline-after;
    const recovery=plan(outbound,mode,bag,left,true);
    if(recovery){
      returned++;
      if(runPlan(outbound,mode,bag,left,true,recovery.actions,5,5,F.seedStream(945+i)).win)returnWithError++;
    }
    attempts++;
  }
  console.log(mode,'late braking / post-flyby nominal / post-flyby 5 deg and 5 points / count',braked,returned,returnWithError,attempts);
}
for(const mode of modes){
  assert.equal(F.entries({p:[0,-20,0],v:[0,0,0]},300,mode).length,0);
  const crossing={p:[0,-18,0],v:[0,2,0]};assert.ok(F.entries(crossing,15,mode).length);
  const inner={p:[0,0,0],v:[0,.03,0]};assert.equal(F.entries(inner,8,mode,true).length,0);
}
const graze={p:[-8,-.6,7],v:[1,1,0]};assert.equal(F.entries(graze,2,'Straight-Line').length,1);
assert.equal(F.entries({p:[-8,.6,7.001],v:[1,1,0]},3,'Straight-Line').length,0);
console.log('Contact and reserve checks passed.');

function recipe(initial,mode,soft,kind){
  let state=initial,elapsed=0,mask=63;
  function pitch(tool,pct,direction){
    state=F.release(state,tool,pct,direction,mask);
    mask^=1<<tool;
  }
  if(kind==='manual'){
    // Same keyboard increments as the visor. Allow twelve live seconds to slew.
    state=F.motion(state,12,mode);elapsed=12;
    const from=F.angles(scale(initial.p,-1)),to=F.angles(state.p);
    const angles=to.map((a,i)=>from[i]+Math.round((a-from[i])*4)/4);
    pitch(5,95,F.direction(...angles));
  }else pitch(5,95,unit(state.p));
  if(kind==='repeat'){
    // At 60 and 120 seconds spend the next heavy tool unless the coast is already safe.
    for(const tool of [4,3]){
      const entries=F.entries(state,450-elapsed,mode,F.inside(state.p));
      if(valid(entries[0],soft)||entries.some(h=>h.t<=60&&valid(h,soft)))return true;
      state=F.motion(state,60,mode);elapsed+=60;pitch(tool,95,unit(state.p));
    }
  }
  if(kind==='brake'){
    const entry=F.entries(state,450-elapsed,mode)[0];
    if(entry && entry.speed>F.limit && entry.t>18){
      const wait=entry.t-18;state=F.motion(state,wait,mode);elapsed+=wait;
      const command=F.command(state,scale(unit(state.v),.061-norm(state.v)),4,mask);
      pitch(4,command.power,unit(state.v));
    }
  }
  return F.entries(state,450-elapsed,mode,F.inside(state.p)).some(entry=>valid(entry,soft));
}
const varied=Array.from({length:128},(_,i)=>F.randomStart('D-'+(104729+i).toString(16)));
for(const [label,openings] of [['named',F.named],['original',starts],['varied',varied]]){
  for(const mode of modes){
    for(const soft of [false,true]){
      const rows={};
      for(const kind of ['snap','manual','repeat','brake']){
        const wins=openings.map(s=>recipe(s,mode,soft,kind));
        rows[kind]=label==='named'?wins.map(w=>w?1:0).join(''):wins.filter(Boolean).length;
      }
      let planned=0,imprecise=0,corrected=0;
      for(const [i,s] of openings.entries()){
        const route=plan(s,mode,63,450,soft);assert.ok(route,s.name+' '+mode);
        planned++;
        const draw=F.seedStream(0xA580+i*19);
        const r=runPlan(s,mode,63,450,soft,route.actions,10,10,draw);
        if(r.win){imprecise++;corrected++;continue;}
        if(r.early)continue;
        const near=F.forecast(r.s,450-r.elapsed,mode).near;
        const time=Math.min(145,Math.max(8,(r.hit?.t??near.t)*.5));
        const rem=450-time-r.elapsed;
        if(r.hit && r.hit.t<=time)continue;
        const coast=F.motion(r.s,time,mode),fix=plan(coast,mode,r.mask,rem,soft);
        if(fix && runPlan(coast,mode,r.mask,rem,soft,fix.actions,10,10,draw).win)corrected++;
      }
      console.log('Strategy comparison',label,mode,soft?'soft':'any',JSON.stringify({...rows,planned,imprecise,corrected}));
    }
  }
}

for(const mode of modes){
  const lengths=[0,0,0,0];let delayed=0;
  for(const s of varied){
    const route=plan(s,mode,63,450,true);lengths[route.actions.length]++;
    if(plan(F.motion(s,30,mode),mode,63,420,true))delayed++;
  }
  console.log('Varied soft routes',mode,'one/two/three',lengths.slice(1).join('/'),'after 30 live seconds',delayed);
}
