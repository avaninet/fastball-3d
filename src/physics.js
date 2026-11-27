const Flight = (() => {
  const n = 2 * Math.PI / (92 * 60);
  const oxygenReserve = 600, limit = 0.080, half = [7, 1.6, 7], dryMass = 186;
  const gear = [
    {name:'Socket driver', mass:0.6, speed:7.4},
    {name:'T-handle', mass:0.8, speed:7.0},
    {name:'Gas cartridge', mass:1.2, speed:6.4},
    {name:'Wrench pouch', mass:2.4, speed:5.2},
    {name:'Power drill', mass:3.6, speed:4.2},
    {name:'Spare battery', mass:4.8, speed:3.8},
    {name:'Tether clip', mass:0.4, speed:7.5},
    {name:'Inspection lamp', mass:1.5, speed:5.8},
    {name:'Camera housing', mass:3.2, speed:4.3}
  ];
  const fullRack = (1 << gear.length) - 1;
  const named = [
    {name:'Tether separation', p:[12,-19,8], v:[0.016,-0.019,0.010], brief:'A broken tether. A slow outward drift. Bring Capt. Tommi Dylan back to the grab bars.'},
    {name:'Lateral drift', p:[-7,-18,9], v:[0.050,0.008,-0.018], brief:'You are sliding across the station face. Take some sideways speed out of your first pitch.'},
    {name:'Wide separation', p:[19,-26,10], v:[0.027,-0.027,0.012], brief:'The station is pulling ahead of you. Spend a heavy tool early and leave yourself time to trim.'}
  ];
  const add = (a,b) => a.map((x,i)=>x+b[i]);
  const sub = (a,b) => a.map((x,i)=>x-b[i]);
  const scale = (a,k) => a.map(x=>x*k);
  const norm = a => Math.hypot(...a);
  const dot = (a,b) => a.reduce((s,x,i)=>s+x*b[i],0);
  const unit = a => scale(a,1/(norm(a)||1));
  const clamp = (x,lo,hi) => Math.max(lo,Math.min(hi,x));
  const rad = Math.PI/180;
  function direction(az,el) {
    return [Math.cos(el*rad)*Math.cos(az*rad),Math.cos(el*rad)*Math.sin(az*rad),Math.sin(el*rad)];
  }
  function angles(d) {return [Math.atan2(d[1],d[0])/rad,Math.atan2(d[2],Math.hypot(d[0],d[1]))/rad];}
  const mass = mask => gear.reduce((m,g,i)=>m+((mask & (1<<i)) ? g.mass : 0),dryMass);
  const rackAfterThrow = (mask,tool,story) => story ? mask : mask & ~(1<<tool);
  const impulse = (tool,mask) => gear[tool].mass*gear[tool].speed/mass(mask);
  const budgets = [0];
  for (let mask=1;mask<=fullRack;mask++) {
    budgets[mask]=Math.max(...gear.map((_,i)=>(mask & (1<<i)) ? impulse(i,mask)+budgets[mask^(1<<i)] : 0));
  }
  function release(s,tool,power,dir,mask) {
    return {p:s.p.slice(),v:sub(s.v,scale(unit(dir),impulse(tool,mask)*clamp(power,10,100)/100))};
  }
  function motion(s,t,mode) {
    if (mode==='Straight-Line') return {p:add(s.p,scale(s.v,t)),v:s.v.slice()};
    const [x,y,z]=s.p,[vx,vy,vz]=s.v, a=n*t,b=Math.sin(a),k=2*Math.sin(a/2)**2,c=1-k;
    return {
      p:[x+3*k*x+b/n*vx+2*k/n*vy, y+6*(b-a)*x-2*k/n*vx+(4*b-3*a)/n*vy, c*z+b/n*vz],
      v:[3*n*b*x+c*vx+2*b*vy,-6*n*k*x-2*b*vx+(1-4*k)*vy,-n*b*z+c*vz]
    };
  }
  // Version 1 replay IDs. Rotate about X, then fixed-frame Z. The orbital
  // equations and velocities always use the original orbital coordinates.
  const tilts=[15,30].flatMap(d=>[[d,0],[-d,0],[0,d],[0,-d],[d,d],[-d,d],[d,-d],[-d,-d]]);
  const poses=[[0,0],...tilts].map(([x,z],id)=>{
    const a=x*rad,b=z*rad,c=Math.cos(a),s=Math.sin(a),u=Math.cos(b),v=Math.sin(b);
    const axes=[[u,v,0],[-v*c,u*c,s],[v*s,-u*s,c]];
    const local=p=>axes.map(axis=>dot(axis,p));
    const world=p=>[0,1,2].map(i=>axes[0][i]*p[0]+axes[1][i]*p[1]+axes[2][i]*p[2]);
    const corners=[];
    for(const i of [-1,1])for(const j of [-1,1])for(const k of [-1,1])
      corners.push(world([i*half[0],j*half[1],k*half[2]]));
    const signed=n=>(n>0?'+':'')+n+'°';
    return {id,axes,local,world,corners,label:'Tilt X '+signed(x)+' / Z '+signed(z)};
  });
  function nearest(p,pose){
    const q=pose?.id?pose.local(p):p;
    const bar=q.map((x,i)=>clamp(x,-half[i],half[i]));
    return pose?.id?pose.world(bar):bar;
  }
  const clearance = (p,pose) => norm(sub(p,nearest(p,pose)));
  const inside = (p,pose) => (pose?.id?pose.local(p):p).every((x,i)=>Math.abs(x)<=half[i]+1e-8);
  // Capture rules use false for Any-speed, true for Soft and 'firm' for Firm.
  const captureLimit = rule => rule==='firm' ? .120 : limit;
  const softEnough = (speed,rule=true) => speed<=captureLimit(rule)+1e-9;
  const canGrab = (hit,soft) => !soft || softEnough(hit.speed,soft);
  // A fast Story pitch can cross the envelope tolerance in nanoseconds.
  // Resolve the full ten-minute bracket to near machine precision.
  function bisectCrossing(value,lo,hi,left){
    for(let i=0;i<50;i++){
      const mid=(lo+hi)/2;
      if(left*value(mid)>0)lo=mid;else hi=mid;
    }
    return (lo+hi)/2;
  }
  // Split each coordinate into monotone intervals at every zero of its velocity.
  // For this orbit each velocity is A sin(nt) + B cos(nt) + C.
  function extrema(A,B,C,end) {
    const k=Math.hypot(A,B), times=[0,end];
    if (!k || Math.abs(C)>k) return times;
    const phase=Math.atan2(B,A), root=Math.asin(clamp(-C/k,-1,1));
    for (const base of [root-phase,Math.PI-root-phase]) {
      const a=base+2*Math.PI*Math.ceil(-base/(2*Math.PI));
      for(let t=a/n;t<end;t+=2*Math.PI/n) if(t>1e-8) times.push(t);
    }
    return times.sort((a,b)=>a-b);
  }
  // A polynomial is monotone between consecutive roots of its derivative.
  // Include touching roots so a grazing soft grab also works at high clock rates.
  function polynomialRoots(coeff,lo,hi){
    while(coeff.length>1 && coeff.at(-1)===0)coeff.pop();
    if(coeff.length<2)return [];
    if(coeff.length===2){
      const root=-coeff[0]/coeff[1];
      return root>=lo && root<=hi?[root]:[];
    }
    const value=x=>coeff.reduceRight((acc,c)=>acc*x+c,0);
    const derivative=coeff.slice(1).map((c,i)=>c*(i+1));
    const cuts=[lo,...polynomialRoots(derivative,lo,hi),hi];
    const tolerance=32*Number.EPSILON*Math.max(...coeff.map(Math.abs));
    const roots=cuts.filter(x=>Math.abs(value(x))<=tolerance);
    for(let i=1;i<cuts.length;i++){
      const a=cuts[i-1],b=cuts[i];
      const left=value(a);
      if(left*value(b)>=0)continue;
      roots.push(bisectCrossing(value,a,b,left));
    }
    return roots.sort((a,b)=>a-b);
  }
  function softCrossings(velocityCoefficients,end,threshold){
    // With u = tan(nt/2), each velocity component has a quadratic numerator
    // over 1+u². The ten-minute horizon stays inside a single tangent branch.
    const squared=threshold*threshold,coeff=[-squared,0,-2*squared,0,-squared];
    for(const [sin,cos,offset] of velocityCoefficients){
      const v=[cos+offset,2*sin,offset-cos];
      for(let i=0;i<3;i++)for(let j=0;j<3;j++)coeff[i+j]+=v[i]*v[j];
    }
    return polynomialRoots(coeff,0,Math.tan(n*end/2)).map(u=>2*Math.atan(u)/n);
  }
  function velocityTerms(s){
    const [x,,z]=s.p,[vx,vy,vz]=s.v;
    return [[3*n*x+2*vy,vx,0],[-2*vx,4*vy+6*n*x,-3*vy-6*n*x],[-n*z,vz,0]];
  }
  // Times the flown coast reaches Y = 0, even if it reverses between plot samples.
  function alongTrackCrossings(s,end,mode){
    const cuts=mode==='Orbital'?extrema(...velocityTerms(s)[1],end):[0,end];
    const at=t=>motion(s,t,mode).p[1],roots=[];
    for(let i=1;i<cuts.length;i++){
      const a=cuts[i-1],b=cuts[i],ya=at(a),yb=at(b);
      if(ya===0)continue; // Ignore a stationary coast or a repeat at a release boundary.
      if(yb===0)roots.push(b);
      else if(ya*yb<0)roots.push(bisectCrossing(at,a,b,ya));
    }
    return roots;
  }
  function entries(s,end,mode,skipInitial=false,soft=false,pose) {
    const coeff=velocityTerms(s);
    const candidates=[0,end];
    for(let i=0;i<3;i++) {
      const normal=pose?.id?pose.axes[i]:null;
      const component=p=>normal?dot(normal,p):p[i];
      const faceAt=t=>component(motion(s,t,mode).p);
      const velocity=normal?[0,1,2].map(k=>normal[0]*coeff[0][k]+normal[1]*coeff[1][k]+normal[2]*coeff[2][k]):coeff[i];
      const cuts=mode==='Orbital' ? extrema(...velocity,end) : [0,end];
      for(let j=1;j<cuts.length;j++) {
        const a=cuts[j-1],b=cuts[j],pa=faceAt(a),pb=faceAt(b);
        for(const face of [-half[i],half[i]]) {
          if(Math.abs(pa-face)<1e-9) candidates.push(a);
          if(Math.abs(pb-face)<1e-9) candidates.push(b);
          if((pa-face)*(pb-face)>=0) continue;
          if(mode==='Straight-Line') {candidates.push(a+(b-a)*(face-pa)/(pb-pa)); continue;}
          candidates.push(bisectCrossing(t=>faceAt(t)-face,a,b,pa-face));
        }
      }
    }
    if(soft && mode==='Orbital')candidates.push(...softCrossings(coeff,end,captureLimit(soft)));
    const sorted=candidates.sort((a,b)=>a-b).filter((t,i,a)=>i===0||t-a[i-1]>1e-7);
    const found=[];
    for(let i=0;i<sorted.length;i++) {
      const t=sorted[i], sample=motion(s,t,mode);
      if(!inside(sample.p,pose)) continue;
      const before=i?motion(s,(sorted[i-1]+t)/2,mode):null;
      const alreadyInside=before?inside(before.p,pose):skipInitial;
      const speed=norm(sample.v);
      if(alreadyInside && !(soft && softEnough(speed,soft) && (!before||norm(before.v)>captureLimit(soft))))continue;
      found.push({t,p:sample.p,speed});
    }
    return found;
  }
  function forecast(s,end,mode,skipInitial=false,soft=false,pose) {
    const hits=entries(s,end,mode,skipInitial,soft,pose);
    const path=[], steps=Math.max(2,Math.ceil(end/6)), ds=[];
    for(let i=0;i<=steps;i++) {
      const t=end*i/steps,p=motion(s,t,mode).p;
      path.push({t,p}); ds.push(clearance(p,pose));
    }
    const dist=t=>clearance(motion(s,t,mode).p,pose);
    const pass=t=>{
      const p=motion(s,t,mode).p;
      return {t,p,d:clearance(p,pose),bar:nearest(p,pose)};
    };
    const passes=[];
    for(let i=0;i<=steps;i++) {
      if(ds[i]>ds[i-1] || ds[i]>ds[i+1] || (i>0 && ds[i]===ds[i-1] && (i===steps || ds[i]===ds[i+1])))continue;
      let lo=path[Math.max(0,i-1)].t,hi=path[Math.min(steps,i+1)].t;
      for(let k=0;k<27;k++) {
        const a=(2*lo+hi)/3,b=(lo+2*hi)/3;
        if(dist(a)<dist(b))hi=b;else lo=a;
      }
      const refined=(lo+hi)/2;
      passes.push(pass(dist(refined)<ds[i]?refined:path[i].t));
    }
    const near=hits.length?pass(hits[0].t):passes.reduce((best,p)=>p.d<best.d?p:best);
    return {hits,path,near,passes};
  }

  // The log uses the minimum over the entire segment. The live instruments and
  // cameras switch to the next approach after that minimum is behind the suit.
  function coastPass(forecast,age){
    if(forecast.near.t>=age)return forecast.near;
    const next=forecast.passes.find(p=>p.t>=age);
    const last=forecast.passes.at(-1);
    return next??(last && last.t>forecast.near.t?last:forecast.near);
  }
  function coastStatus(state){
    if(state.done)return {kind:'finished'};
    const {forecast,age}=state,hit=forecast.hits[state.hitIndex];
    if(hit)return {kind:canGrab(hit,state.soft)?'grab':'fastEntry',hit};
    if(inside(state.pos.p,state.pose))return {kind:'inside'};
    const near=coastPass(forecast,age);
    if(state.misses && near.d<1e-6 && near.t<=age)return {kind:'cleared',near};
    if(near.t===0)return {kind:'receding',near};
    if(near.t<=age)return {kind:'past',near};
    if(near.t>=forecast.path.at(-1).t-.03)return {kind:'expiry',near};
    return {kind:'miss',near};
  }
  function seedStream(seed) {
    let a=seed>>>0;
    return ()=>{let t=a=(a+0x6D2B79F5)>>>0;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  }
  // Velocity change required to reach a station-relative point at time t.
  function transfer(s,target,t,mode) {
    const e=sub(target,motion(s,t,mode).p);
    if(mode==='Straight-Line') return scale(e,1/t);
    const a=n*t,b=Math.sin(a)/n,k=4*Math.sin(a/2)**2/n,d=(4*Math.sin(a)-3*a)/n,det=b*d+k*k;
    return [(d*e[0]-k*e[1])/det,(k*e[0]+b*e[1])/det,e[2]/b];
  }
  function command(dv,tool,mask) {
    const [az,el]=angles(scale(dv,-1));
    return {tool,az:Math.round(az),el:Math.round(el),power:clamp(Math.round(100*norm(dv)/impulse(tool,mask)),10,100)};
  }
  function applyCommand(s,c,mask) {return release(s,c.tool,c.power,direction(c.az,c.el),mask);}
  function manualOpening(base){
    // Manual separations start one third farther from the nearest grab bar.
    const bar=nearest(base.p);
    return {...base,p:add(bar,scale(sub(base.p,bar),4/3))};
  }
  function opening(index,seed,story){
    if(index===5)return {...manualOpening(named[0]),name:'Random Dodgeball',
      brief:'The platform took Tommi’s tether anchor with it. Read the drifting cover and frame before choosing a way home.',
      briefing:'A failed work platform tears away Tommi’s tether anchor. The seed sets the positions and drift of the service cover and bent frame. Find a route around them and back to the bars.'};
    if(index===4)return {...manualOpening(named[0]),name:'Dodgeball Challenge',
      brief:'The platform takes Tommi’s tether anchor with it. A loose cover and bent frame cross her path home.',
      briefing:'An external work platform tears free, taking Tommi’s tether anchor with it. A service cover and a bent equipment frame drift across her route to the grab bars. Her thrusters are stuck. Pick a gap and use the tools to get home.'};
    const base=index===3?Catalog.drift(seed):named[index];
    return story?base:manualOpening(base);
  }
  return {gear,fullRack,named,opening,poses,half,limit,captureLimit,oxygenReserve,n,add,sub,scale,norm,dot,unit,clamp,rad,direction,angles,mass,rackAfterThrow,impulse,budgets,
    release,motion,nearest,clearance,inside,softEnough,canGrab,entries,alongTrackCrossings,forecast,coastPass,coastStatus,seedStream,transfer,command,applyCommand,manualOpening};
})();
