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
    {name:'Wide separation', p:[19,-26,10], v:[0.027,-0.027,0.012], brief:'The station is falling behind. Spend a heavy tool early and leave yourself time to trim.'}
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
    budgets[mask]=Math.max(...gear.map((g,i)=>(mask & (1<<i)) ? impulse(i,mask)+budgets[mask^(1<<i)] : 0));
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
  const nearest = p => p.map((x,i)=>clamp(x,-half[i],half[i]));
  const clearance = p => norm(sub(p,nearest(p)));
  const inside = p => p.every((x,i)=>Math.abs(x)<=half[i]+1e-8);
  const softEnough = speed => speed<=limit+1e-9;
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
      let a=cuts[i-1],b=cuts[i];
      const left=value(a);
      if(left*value(b)>=0)continue;
      for(let j=0;j<46;j++){
        const mid=(a+b)/2;
        if(left*value(mid)>0)a=mid;else b=mid;
      }
      roots.push((a+b)/2);
    }
    return roots.sort((a,b)=>a-b);
  }
  function softCrossings(velocityCoefficients,end){
    // With u = tan(nt/2), each velocity component has a quadratic numerator
    // over 1+u². The ten-minute horizon stays inside a single tangent branch.
    const squared=limit*limit,coeff=[-squared,0,-2*squared,0,-squared];
    for(const [sin,cos,offset] of velocityCoefficients){
      const v=[cos+offset,2*sin,offset-cos];
      for(let i=0;i<3;i++)for(let j=0;j<3;j++)coeff[i+j]+=v[i]*v[j];
    }
    return polynomialRoots(coeff,0,Math.tan(n*end/2)).map(u=>2*Math.atan(u)/n);
  }
  function entries(s,end,mode,skipInitial=false,soft=false) {
    const [x,,z]=s.p,[vx,vy,vz]=s.v;
    const coeff=[[3*n*x+2*vy,vx,0],[-2*vx,4*vy+6*n*x,-3*vy-6*n*x],[-n*z,vz,0]];
    const candidates=[0,end];
    for(let i=0;i<3;i++) {
      const cuts=mode==='Orbital' ? extrema(...coeff[i],end) : [0,end];
      for(let j=1;j<cuts.length;j++) {
        const a=cuts[j-1],b=cuts[j],pa=motion(s,a,mode).p[i],pb=motion(s,b,mode).p[i];
        for(const face of [-half[i],half[i]]) {
          if(Math.abs(pa-face)<1e-9) candidates.push(a);
          if(Math.abs(pb-face)<1e-9) candidates.push(b);
          if((pa-face)*(pb-face)>=0) continue;
          if(mode==='Straight-Line') {candidates.push(a+(b-a)*(face-pa)/(pb-pa)); continue;}
          let lo=a,hi=b;
          for(let k=0;k<35;k++) {
            const t=(lo+hi)/2;
            if((motion(s,t,mode).p[i]-face)*(pa-face)>0) lo=t; else hi=t;
          }
          candidates.push((lo+hi)/2);
        }
      }
    }
    if(soft && mode==='Orbital')candidates.push(...softCrossings(coeff,end));
    const sorted=candidates.sort((a,b)=>a-b).filter((t,i,a)=>i===0||t-a[i-1]>1e-7);
    const found=[];
    for(let i=0;i<sorted.length;i++) {
      const t=sorted[i], sample=motion(s,t,mode);
      if(!inside(sample.p)) continue;
      const before=i?motion(s,(sorted[i-1]+t)/2,mode):null;
      const alreadyInside=before?inside(before.p):skipInitial;
      const speed=norm(sample.v);
      if(alreadyInside && !(soft && softEnough(speed) && (!before||norm(before.v)>limit)))continue;
      found.push({t,p:sample.p,speed});
    }
    return found;
  }
  function forecast(s,end,mode,skipInitial=false,soft=false) {
    const hits=entries(s,end,mode,skipInitial,soft);
    const path=[], steps=Math.max(2,Math.ceil(end/6)), ds=[];
    for(let i=0;i<=steps;i++) {
      const t=end*i/steps,p=motion(s,t,mode).p;
      path.push({t,p}); ds.push(clearance(p));
    }
    const dist=t=>clearance(motion(s,t,mode).p);
    const pass=t=>{
      const p=motion(s,t,mode).p;
      return {t,p,d:clearance(p),bar:nearest(p)};
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
  function command(s,dv,tool,mask) {
    const [az,el]=angles(scale(dv,-1));
    return {tool,az:Math.round(az),el:Math.round(el),power:clamp(Math.round(100*norm(dv)/impulse(tool,mask)),10,100)};
  }
  function applyCommand(s,c,mask) {return release(s,c.tool,c.power,direction(c.az,c.el),mask);}
  // Keep the seed sequence compatible with the first six-slot prototype.
  // The live opening is derived from this reproducible separation below.
  const seedRack=(1<<6)-1, seedHorizon=450;
  function witness(s,mode) {
    if(entries(s,seedHorizon,mode).length) return false;
    for(const t of [350,395,305,420]) {
      const target=scale(nearest(s.p),0.55), dv=transfer(s,target,t,mode);
      for(const tool of [3,4,5]) {
        if(norm(dv)>impulse(tool,seedRack)*1.01) continue;
        const c=command(s,dv,tool,seedRack), hit=entries(applyCommand(s,c,seedRack),seedHorizon-12,mode)[0];
        if(hit && hit.speed<=limit-.004) return true;
      }
    }
    return false;
  }
  // The original D-seed filter also admitted two releases four seconds apart.
  function twoThrowWitness(s,mode){
    if(entries(s,seedHorizon,mode).length)return false;
    for(const t of [350,395,305,420]){
      const target=scale(nearest(s.p),.55);
      const first=command(s,transfer(s,target,t,mode),5,seedRack);
      const coast=applyCommand(s,first,seedRack);
      if(entries(coast,4,mode).length)continue;
      const next=motion(coast,4,mode),dv=transfer(next,target,t-4,mode),mask=seedRack^(1<<5);
      for(const tool of [2,3,4]){
        if(norm(dv)>impulse(tool,mask)*1.01)continue;
        const final=applyCommand(next,command(next,dv,tool,mask),mask);
        const hit=entries(final,seedHorizon-16,mode)[0];
        if(hit && hit.speed<=limit-.004)return true;
      }
    }
    return false;
  }
  function randomStart(seed) {
    const current=typeof seed==='string' && /^E-/i.test(seed);
    const varied=current || (typeof seed==='string' && /^D-/i.test(seed));
    const numeric=typeof seed==='string'?parseInt(seed.replace(/^[DE]-/i,''),16):seed;
    const rng=seedStream(numeric);
    const crossing=varied && rng()<.76;
    for(let i=0;i<350;i++) {
      const side=rng()<.5?-1:1;
      const s={name:'Random drift',seed,p:[rng()*32-16,side*(12+rng()*12),rng()*28-14],
        v:[(rng()-.5)*.068,side*(.003+rng()*.027),(rng()-.5)*.055],
        brief:'An unfamiliar separation. Read your drift and choose an opening pitch.'};
      if(varied){
        if(crossing)s.p=[rng()*56-28,side*(14+rng()*17),rng()*44-22];
        const [az,el]=angles(s.p),angle=2*Math.PI*rng();
        const tangent=add(scale(direction(az+90,0),Math.cos(angle)),scale(direction(az,el+90),Math.sin(angle)));
        const radial=crossing?(rng()-.56)*.095:-.012+.045*rng();
        const lateral=crossing?.070+.057*rng():.020+.040*rng();
        s.v=add(scale(unit(s.p),radial),scale(tangent,lateral));
      }
      if(current && [s,manualOpening(s)].some(initial=>
        ['Straight-Line','Orbital'].some(mode=>entries(initial,oxygenReserve,mode).length)))continue;
      const reachable=mode=>witness(s,mode)||(crossing&&twoThrowWitness(s,mode));
      if(reachable('Straight-Line') && reachable('Orbital'))return s;
    }
    return {...named[0],seed,name:'Random drift',brief:'A seeded tether-separation reserve case.'};
  }
  function manualOpening(base){
    // Manual separations start one third farther from the nearest grab bar.
    const bar=nearest(base.p);
    return {...base,p:add(bar,scale(sub(base.p,bar),4/3))};
  }
  function opening(index,seed,story){
    const base=index===3?randomStart(seed):named[index];
    return story?base:manualOpening(base);
  }
  return {gear,fullRack,named,opening,half,limit,oxygenReserve,n,add,sub,scale,norm,dot,unit,clamp,rad,direction,angles,mass,rackAfterThrow,impulse,budgets,
    release,motion,nearest,clearance,inside,softEnough,entries,forecast,coastPass,seedStream,transfer,command,applyCommand,randomStart};
})();
