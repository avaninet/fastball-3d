const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(process.argv[2] || path.join(__dirname,'../index.html'),'utf8');
const src=html.match(/<script id="physics">([\s\S]+?)<\/script>/)[1];
const F=vm.runInNewContext(src+';Flight',{Math}), modes=['Straight-Line','Orbital'];
const {norm,scale,unit,add,clamp}=F;
// Historical builds can still be supplied for comparison. The E family is
// part of v0.2 and later, and both old families retain their original starts.
if(!process.argv[2] || F.coastPass){
  const legacy=F.opening(3,'D-0C338116',true);
  const late=F.entries(legacy,F.oxygenReserve,'Orbital')[0];
  assert.ok(late.t>581 && late.t<584 && F.softEnough(late.speed));
  for(const code of ['0C338116',...Array.from({length:128},(_,i)=>(104729+i).toString(16))]){
    for(const story of [false,true]){
      const start=F.opening(3,'E-'+code,story);
      for(const mode of modes)assert.equal(F.entries(start,F.oxygenReserve,mode).length,0,'unassisted entry E-'+code);
    }
  }
}
// Older standalone builds took the current state as an unused first argument.
const buildCommand = F.command.length===4 ? F.command : (_state,dv,tool,mask)=>F.command(dv,tool,mask);
function valid(hit,soft){return hit && (!soft || hit.speed<=F.limit+1e-9);}
function plan(s,mode,mask,left,soft,skipInitial=false) {
  const rack=F.gear.map((_,i)=>i).filter(i=>mask&(1<<i));
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
      const c=buildCommand(p,dv,tool,bag); actions.push({...c,delay});
      p=F.applyCommand(p,c,bag);bag^=1<<tool;
      if(finish!==undefined || step===count-1) {
        const hit=F.entries(p,left-delay,mode,skipInitial && delay===0,soft).find(h=>valid(h,soft));
        if(hit) return {actions,hit:{...hit,t:hit.t+delay}};
        break;
      }
      if(F.entries(p,4,mode,skipInitial && delay===0,soft).some(h=>valid(h,soft))) break;
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
      if(F.entries(s,dt,mode,false,soft).some(h=>valid(h,soft)))return {win:true};
      s=F.motion(s,dt,mode);elapsed+=dt;
    }
    const pc=perturb(c,angle,pct,draw);
    s=F.release(s,c.tool,pc.power,pc.dir,mask);mask^=1<<c.tool;
  }
  const contacts=F.entries(s,left-elapsed,mode,false,soft);
  return {win:contacts.some(h=>valid(h,soft)),s,mask,elapsed,hit:contacts[0]};
}
// Older builds can also be passed on the command line for balance comparisons.
const rack=(1<<F.gear.length)-1,duration=F.oxygenReserve??F.manualReserve??450;
const opening=(i,seed,story=false)=>F.opening?F.opening(i,seed,story):i===3?F.randomStart(seed):F.named[i];
const varied=Array.from({length:128},(_,i)=>opening(3,'D-'+(104729+i).toString(16)));
const legacy=Array.from({length:128},(_,i)=>opening(3,104729+i));
const named=F.named.map((_,i)=>opening(i,0));
for(const mode of modes){
  // A spent battery and pouch, an already excessive speed toward the thin
  // station face, and a genuine first entry followed by an exit.
  let braked=0,returned=0,returnWithError=0,attempts=0;const bag=rack^(1<<5)^(1<<3);
  for(let i=0;i<96;i++){
    const draw=F.seedStream(1501+i);
    const p=[(draw()-.5)*5,-1.6-8,(draw()-.5)*5],v=[(draw()-.5)*.012,.10+draw()*.035,(draw()-.5)*.012];
    const s={p,v},hits=F.entries(s,320,mode);assert.ok(hits[0]?.speed>F.limit);
    const deadline=320,leadTime=hits[0].t-18,approach=F.motion(s,leadTime,mode);
    const braking=buildCommand(approach,scale(unit(approach.v),-(norm(approach.v)-.061)),4,bag);
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
  let state=initial,elapsed=0,mask=rack;
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
      const entries=F.entries(state,duration-elapsed,mode,F.inside(state.p),soft);
      if(valid(entries[0],soft)||entries.some(h=>h.t<=60&&valid(h,soft)))return true;
      state=F.motion(state,60,mode);elapsed+=60;pitch(tool,95,unit(state.p));
    }
  }
  if(kind==='brake'){
    const entry=F.entries(state,duration-elapsed,mode)[0];
    if(entry && entry.speed>F.limit && entry.t>18){
      const wait=entry.t-18;state=F.motion(state,wait,mode);elapsed+=wait;
      const command=buildCommand(state,scale(unit(state.v),.061-norm(state.v)),4,mask);
      pitch(4,command.power,unit(state.v));
    }
  }
  return F.entries(state,duration-elapsed,mode,F.inside(state.p),soft).some(entry=>valid(entry,soft));
}

for(const mode of modes)for(const soft of [false,true]){
  const rows=named.map(s=>{
    const route=plan(s,mode,rack,duration,soft);assert.ok(route,s.name+' '+mode);
    return [s.name,route.actions.map(c=>[c.tool,c.az,c.el,c.power]),Math.round(route.hit.t),route.hit.speed.toFixed(4)];
  });
  console.log('Named',mode,soft?'soft':'any',JSON.stringify(rows));
  for(const [label,starts] of [['named',named],['legacy',legacy],['generated',varied]]){
    const counts={};
    for(const kind of ['snap','manual','repeat','brake'])counts[kind]=starts.filter(s=>recipe(s,mode,soft,kind)).length;
    const routes=starts.map(s=>plan(s,mode,rack,duration,soft));counts.exact=routes.filter(Boolean).length;
    counts.after30=starts.filter(s=>plan(F.motion(s,30,mode),mode,rack,duration-30,soft)).length;
    console.log(label,mode,soft?'soft':'any',JSON.stringify(counts));
    assert.ok(counts.exact>=starts.length*.95,'mostly reachable');
    if(label!=='generated')continue;
    // Paired cone draws reuse the same seeds at every angle. Power is exact.
    // All correction throws receive the same angular error as the opening.
    for(const angle of [0,2,3,5,8,10,15,20]){
      let openingWins=0,withTrim=0;
      const attempts=angle===0?1:4;
      for(const [i,s] of starts.entries())for(let trial=0;trial<attempts;trial++){
        if(!routes[i])continue;
        const draw=F.seedStream(0xA580+i*19+trial*7919);
        const r=runPlan(s,mode,rack,duration,soft,routes[i].actions,angle,0,draw);
        if(r.win){openingWins++;withTrim++;continue;}
        const near=F.forecast(r.s,duration-r.elapsed,mode).near;
        const wait=Math.min(duration/3,Math.max(8,(r.hit?.t??near.t)*.5));
        if(r.hit && r.hit.t<=wait)continue;
        const left=duration-r.elapsed-wait,coast=F.motion(r.s,wait,mode);
        const fix=plan(coast,mode,r.mask,left,soft);
        if(fix && runPlan(coast,mode,r.mask,left,soft,fix.actions,angle,0,draw).win)withTrim++;
      }
      console.log('Cone',mode,soft?'soft':'any',angle,openingWins,withTrim,'/',attempts*starts.length);
    }
  }
}

const holdout=Array.from({length:256},(_,i)=>opening(3,'D-'+(0x726800+i*1543).toString(16)));
for(const mode of modes){
  const softWins=holdout.filter(s=>plan(s,mode,rack,duration,true)).length;
  console.log('Independent generated seeds',mode,'soft',softWins,'/',holdout.length);
  assert.ok(softWins>=holdout.length*.95,'independent random reachability');
}
