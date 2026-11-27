// Paired offline playtest. Run "node studies/capture-speed.cjs catalog|routes|pilots".
// Each JSON line compares identical initial states, inventory and error streams.
'use strict';
const {F,D,fly,modes}=require('./random-dodgeball.cjs');
const ids=require('../assets/dodgeball-layout-seeds.json');
const rules=[true,'firm'];
const seeds=Array.from({length:200},(_,i)=>'E-'+((0x3a7c0001+i*104729)>>>0).toString(16));
const layouts=D.layouts.map((layout,i)=>({
  name:layout.name,ids:ids.filter(id=>Math.floor(id/D.layoutStride)===i),index:i
}));
const toolOrder=F.gear.map((_,i)=>i).sort((a,b)=>F.impulse(a,511)-F.impulse(b,511));
const fuel=mask=>F.budgets[mask];
function median(values){
  if(!values.length)return null;
  const sorted=values.slice().sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
  return +((sorted[mid]+sorted[(sorted.length-1)>>1])/2).toFixed(4);
}
function result(time,mask,throws,speed){return {won:true,time,budget:fuel(mask),throws,speed,drill:!!(mask&(1<<4))};}
function summary(runs){
  const wins=runs.filter(r=>r.won);
  const med=key=>median(wins.map(r=>r[key]));
  const losses={};
  for(const r of runs)if(!r.won)losses[r.reason]=(losses[r.reason]||0)+1;
  return {wins:wins.length,tools:med('throws'),budget:med('budget'),time:med('time'),speed:med('speed'),
    firmBand:wins.filter(r=>!F.softEnough(r.speed)).length,one:wins.filter(r=>r.throws===1).length,
    two:wins.filter(r=>r.throws===2).length,drill:wins.filter(r=>r.drill).length,losses};
}
function report(meta,pairs){
  const summarize=runs=>{
    const row=summary(runs);
    if(meta.story){row.budget=null;row.drill=null;}
    return row;
  };
  const both=pairs.filter(([a,b])=>a.won&&b.won);
  console.log(JSON.stringify({...meta,n:pairs.length,soft:summarize(pairs.map(p=>p[0])),firm:summarize(pairs.map(p=>p[1])),
    gained:pairs.filter(([a,b])=>!a.won&&b.won).length,lost:pairs.filter(([a,b])=>a.won&&!b.won).length,
    both:both.length,savedTool:both.filter(([a,b])=>a.throws>b.throws).length,
    pairedBudget:meta.story?null:median(both.map(([a,b])=>b.budget-a.budget))}));
}
function coast(state,time,dt,mode,rule,bodies){
  const entries=F.entries(state,dt,mode,false,rule),grab=entries.find(h=>F.canGrab(h,rule));
  const debris=bodies&&D.forecast(state,time,grab?.t??dt,mode,bodies);
  return {grab,hit:debris?.hit,entries,debris};
}
function catalog(){
  for(const layout of layouts)for(const mode of modes)for(const story of [false,true]){
    const pairs=[],nominal=[];
    for(const id of layout.ids){
      const pieces=D.layoutPieces(id);
      for(const trial of [null,3100,3101,3102,3103]){
        const row=rules.map(rule=>{
          const run=fly(pieces,mode,trial,layout.index,story,rule);
          return run.win?result(run.time,run.mask,run.releases.length,F.norm(run.state.v)):{reason:'miss or collision'};
        });
        (trial===null?nominal:pairs).push(row);
      }
    }
    report({study:'nominal',name:layout.name,mode,story},nominal);
    report({study:'execution',name:layout.name,mode,story},pairs);
  }
}
// Enumerate single throws and paired throws separated by 24 seconds. Cache the
// instrument settings and coast arcs before checking the moving boxes for each DB2 seed.
function candidates(initial,mode,story,rule){
  const plans=[],keys=new Set(),stage=F.motion(initial,12,mode);
  function finish(state,time,path,mask,key,throws){
    if(keys.has(key))return;keys.add(key);
    const hit=F.entries(state,600-time,mode,false,rule).find(h=>F.canGrab(h,rule));
    if(hit)plans.push({...result(time+hit.t,mask,throws,hit.speed),legs:[...path,[state,time,hit.t]]});
  }
  const tools=(dv,mask)=>{
    const available=toolOrder.filter(i=>mask&(1<<i));
    const fitting=available.filter(i=>F.impulse(i,mask)>=F.norm(dv)*.97);
    return fitting.length?fitting:[available.at(-1)];
  };
  const targets=[F.scale(F.nearest(initial.p),.65),[0,0,0],[-5,0,-4],[-5,0,4],[5,0,-4],[5,0,4]];
  for(const seconds of [180,240,300,360,420,480,550])for(const target of targets){
    const dv=F.transfer(stage,target,seconds,mode);
    for(const tool of tools(dv,F.fullRack)){
      const a=F.command(dv,tool,F.fullRack),next=F.applyCommand(stage,a,F.fullRack);
      const mask=F.rackAfterThrow(F.fullRack,tool,story),key=JSON.stringify(a);
      const opening=[[initial,0,12]];
      finish(next,12,opening,mask,key,1);
      if(F.entries(next,24,mode,false,rule).some(h=>F.canGrab(h,rule)))continue;
      const turn=F.motion(next,24,mode),change=F.transfer(turn,target,seconds-24,mode);
      for(const second of tools(change,mask)){
        const b=F.command(change,second,mask);
        finish(F.applyCommand(turn,b,mask),36,[...opening,[next,12,24]],
          F.rackAfterThrow(mask,second,story),key+JSON.stringify(b),2);
      }
    }
  }
  return plans.sort((a,b)=>a.throws-b.throws||b.budget-a.budget||a.time-b.time);
}
function routes(){
  for(const mode of modes)for(const story of [false,true]){
    for(const index of [0,1,2,3,4,5]){
      const openings=index===3?seeds:[0],pairs=[];
      for(const seed of openings){
        const initial=F.opening(index,seed,story);
        const options=rules.map(rule=>candidates(initial,mode,story,rule));
        function score(bodies){
          return options.map(plans=>plans.find(p=>!bodies||p.legs.every(([s,t,dt])=>
            !D.forecast(s,t,dt,mode,bodies).hit))??{reason:'no 1–2 throw route found'});
        }
        if(index===5){
          for(const layout of layouts)report({study:'routes',name:layout.name,mode,story},layout.ids.map(id=>score(D.layoutPieces(id))));
        }else pairs.push(score(index===4?D.pieces:null));
      }
      if(index!==5)report({study:'routes',name:F.opening(index,openings[0],story).name,mode,story},pairs);
    }
  }
}
function pickTool(wanted,mask){
  const tools=toolOrder.filter(i=>mask&(1<<i));
  const tool=tools.find(i=>F.impulse(i,mask)>=wanted)??tools.at(-1);
  return {tool,power:F.clamp(Math.round(100*wanted/F.impulse(tool,mask)),10,100)};
}
function perturb(dir,azError,elError){
  const [az,el]=F.angles(dir);
  return F.unit(F.add(dir,F.add(F.scale(F.direction(az+90,0),Math.tan(azError*F.rad)),
    F.scale(F.direction(az,el+90),Math.tan(elError*F.rad)))));
}
// A reactive pilot reads committed coast, the soft/firm warning and, when enabled,
// Coach or Preview. It never receives a qualified route, future commands or a seed layout.
function pilot(initial,bodies,mode,story,rule,drawSeed,aids){
  let state=initial,time=0,throws=0,mask=F.fullRack,outcome;
  const rng=F.seedStream(drawSeed),limit=F.captureLimit(rule);
  function wait(dt){
    dt=Math.min(dt,600-time);
    const {hit,grab}=coast(state,time,dt,mode,rule,bodies);
    if(hit)outcome={reason:hit.body.short};
    else if(grab)outcome=result(time+grab.t,mask,throws,grab.speed);
    else if(time+dt>=600)outcome={reason:'oxygen'};
    state=F.motion(state,dt,mode);time+=dt;
  }
  wait(story?0:12);
  while(!outcome){
    const left=600-time,forecast=F.forecast(state,left,mode,false,rule);
    const grab=forecast.hits.find(h=>F.canGrab(h,rule)),entry=forecast.hits[0];
    const debris=bodies&&D.forecast(state,time,grab?.t??left,mode,bodies);
    const hazard=debris?.hit;
    if(!mask || (!hazard && entry && F.canGrab(entry,rule))){
      if(!mask && !grab && !hazard){outcome={reason:entry?'overspeed':'out of tools'};break;}
      wait(left);break;
    }
    const pass=debris?.approaches.filter(p=>p.gap>=0&&p.gap<2&&p.tNear>0&&p.tNear<90).sort((a,b)=>a.tNear-b.tNear)[0];
    if(throws && !hazard && pass && (!entry || pass.tNear<entry.t)){wait(pass.tNear+3);continue;}
    if(!hazard && entry && entry.t>30){wait(entry.t-29);continue;}
    // Six fixed draws per decision keep errors paired when both policies choose the same throw.
    const errors=Array.from({length:6},()=>2*rng()-1);
    let dir,tool,power;
    if(hazard){
      const coach=aids.includes('coach')&&D.avoidance(state,mask,mode,time,left,hazard,bodies);
      if(coach){dir=coach.dir;tool=coach.tool;power=100;}
      else{
        const rel=F.sub(hazard.body.v,state.v);
        dir=F.unit([rel[1],-rel[0],.04]);({tool,power}=pickTool(.035,mask));
      }
    }else if(!throws){
      dir=F.unit(state.p);tool=5;power=95;
    }else if(entry||F.inside(state.p)){
      dir=F.unit(state.v);({tool,power}=pickTool(Math.max(.006,F.norm(state.v)-limit+.014),mask));
    }else{
      const n=forecast.near;
      dir=F.unit(n.t>1?F.sub(n.p,n.bar):F.sub(state.p,F.nearest(state.p)));
      const wanted=n.t>12?F.norm(F.transfer(state,n.bar,n.t,mode)):.05;
      ({tool,power}=pickTool(wanted*(1+.4*errors[2]),mask));
    }
    dir=perturb(dir,6*errors[0],6*errors[1]);
    power=F.clamp(Math.round(power+4*errors[3]),10,100);
    let adjustments=0;
    if(aids.includes('preview')){
      const angles=[[0,0],[8,0],[-8,0],[0,8],[0,-8],[0,0],[0,0]];
      let best=Infinity,original=dir,base=power;
      for(const [i,[x,y]] of angles.entries()){
        adjustments++;
        const bearing=perturb(original,x,y),pct=F.clamp(base+(i===5?15:i===6?-15:0),10,100);
        const next=F.release(state,tool,pct,bearing,mask),fc=F.forecast(next,left,mode,false,rule);
        const contact=fc.hits.find(h=>F.canGrab(h,rule));
        const risk=bodies&&D.forecast(next,time,contact?.t??left,mode,bodies);
        const score=risk?.hit?10000-risk.hit.t:contact?contact.t/10000:fc.hits.length?1+Math.max(0,fc.hits[0].speed-limit):2+fc.near.d;
        if(score<best){best=score;dir=bearing;power=pct;}
      }
    }
    // Story may aim while paused. Manual decisions and Preview adjustments consume oxygen.
    if(!story){wait(8+4*errors[4]+adjustments);if(outcome)break;}
    state=F.release(state,tool,power,dir,mask);
    mask=F.rackAfterThrow(mask,tool,story);throws++;
    wait(8+3*errors[5]);
  }
  return outcome;
}
function pilots(){
  for(const mode of modes)for(const story of [false,true]){
    function run(name,states,attempts,aids){
      const pairs=[];
      for(const [i,[initial,bodies]] of states.entries())for(let trial=0;trial<attempts;trial++){
        const drawSeed=0x527000+7919*i+313*trial;
        pairs.push(rules.map(rule=>pilot(initial,bodies,mode,story,rule,drawSeed,aids)));
      }
      report({study:'pilot',name,mode,story,aids},pairs);
    }
    for(const index of [0,1,2,3,4]){
      const keys=index===3?seeds:[0],states=keys.map(s=>[F.opening(index,s,story),index===4?D.pieces:null]);
      for(const aids of (index===4?['none','coach','preview','coach+preview']:['none','preview'])){
        run(states[0][0].name,states,index===3?2:64,aids);
      }
    }
    const initial=F.opening(5,0,story);
    for(const layout of layouts){
      const states=Array.from({length:32},(_,i)=>[initial,D.layoutPieces(layout.ids[8+i*16])]);
      for(const aids of ['none','coach','preview','coach+preview'])run(layout.name,states,4,aids);
    }
  }
}
// Optional comparison with the third-party simulated novices through experts.
// Pass the local path to the review's humans.cjs as the third argument. Its
// compatibility adapter affects public queries in this process only. The seed
// generator retains its original admission rule and sequence for both runs.
function review(){
  const path=require('node:path');
  process.env.FB3D_ROOT=path.resolve(__dirname,'..');
  const H=require(path.resolve(process.argv[3]));
  const original={...H.F};
  let rule=true;
  H.F.softEnough=speed=>original.softEnough(speed,rule);
  for(const method of ['entries','forecast']){
    H.F[method]=(state,end,mode,skip,soft)=>original[method](state,end,mode,skip,soft&&rule);
  }
  function hash(str){
    let h=2166136261;
    for(const c of str)h=Math.imul(h^c.charCodeAt(0),16777619);
    return h>>>0;
  }
  for(const mode of modes)for(const tier of Object.keys(H.TIERS))for(const aligned of [false,true]){
    const pairs=[];
    for(const seed of seeds)for(let attempt=0;attempt<3;attempt++){
      const random=hash([seed,attempt,tier,mode,true].join('|'));
      pairs.push(rules.map(active=>{
        rule=active;H.F.limit=original.captureLimit(rule);
        const brakeTarget=rule==='firm'?.12-1.5*(.08-H.TIERS[tier].brakeTarget):H.TIERS[tier].brakeTarget;
        const r=H.fly(seed,mode,true,tier,'hints',random,{driftAssist:aligned,tweak:{brakeLate:30,brakeTarget}});
        return r.won?{won:true,time:r.time,budget:r.dvHome,throws:r.throws,speed:r.grabSpeed,drill:r.drill}:{reason:r.result};
      }));
    }
    report({study:'review',name:'Random drift',mode,story:false,tier,aligned},pairs);
  }
}
// Count distinct legal control sequences and their earliest arrival in the same search grid.
// Do the expensive clearance comparison on an evenly spaced sample in every layout.
function breadth(){
  for(const mode of modes)for(const story of [false,true]){
    for(const index of [0,1,2,3,4,5]){
      const groups=new Map();
      for(const seed of index===3?seeds:[0]){
        const initial=F.opening(index,seed,story);
        const options=rules.map(rule=>candidates(initial,mode,story,rule));
        function measure(name,bodies){
          const measurements=options.map(plans=>{
            const legal=bodies?plans.filter(p=>p.legs.every(([s,t,dt])=>!D.forecast(s,t,dt,mode,bodies).hit)):plans;
            return {count:legal.length,time:legal.length?Math.min(...legal.map(p=>p.time)):null};
          });
          if(!groups.has(name))groups.set(name,[]);
          groups.get(name).push(measurements);
        }
        if(index===5){
          for(const layout of layouts)for(let i=16;i<512;i+=32)measure(layout.name,D.layoutPieces(layout.ids[i]));
        }else measure(initial.name,index===4?D.pieces:null);
      }
      for(const [name,pairs] of groups){
        const stats=i=>({commands:median(pairs.map(p=>p[i].count)),fastest:median(pairs.flatMap(p=>p[i].time===null?[]:[p[i].time]))});
        console.log(JSON.stringify({study:'breadth',name,mode,story,n:pairs.length,soft:stats(0),firm:stats(1),
          more:pairs.filter(([a,b])=>b.count>a.count).length}));
      }
    }
  }
}
const studies={catalog,routes,pilots,review,breadth},study=studies[process.argv[2]];
if(!study)throw Error('Choose catalog, routes, breadth, pilots or review.');
study();
