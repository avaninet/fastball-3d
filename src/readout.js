'use strict';

const Readout={
  clock(time){
    const seconds=Math.max(0,Math.floor(time+1e-7));
    return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  },
  signed(value,digits,plus=true){
    const rounded=Number(value.toFixed(digits));
    return (plus && rounded>=0?'+':'')+rounded.toFixed(digits);
  },
  heading(value,digits){
    const wrapped=((value%360)+360)%360;
    return (Number(wrapped.toFixed(digits))%360).toFixed(digits);
  },
  bearing(azimuth,elevation){
    return 'HDG '+this.heading(azimuth,2)+'° / EL '+this.signed(elevation,2)+'°';
  },
  capture(rule){
    if(!rule)return 'Any-speed capture';
    return (rule==='firm'?'Firm':'Soft')+' capture ≤ '+Flight.captureLimit(rule).toFixed(3)+' m/s';
  },
  aids(flight){
    if(flight.manualThroughout)return 'Manual throughout';
    const aids=[];
    if(flight.lesson!=null || flight.skippedGuidance)aids.push('Lesson coaching');
    if(flight.usedPreview)aids.push('Preview');
    if(flight.usedCoach)aids.push('Dodgeball Coach');
    if(flight.usedFaceDrift)aids.push('Face drift');
    return aids.length?'Assists used: '+aids.join(', '):'Optional assists off';
  },
  speed(value,rule=true){
    const limit=Flight.captureLimit(rule);
    const ordinary=value.toFixed(3);
    if(Number(ordinary)===limit && !Flight.softEnough(value,rule)){
      const precise=value.toFixed(4);
      return Number(precise)>limit?precise:'>'+ordinary;
    }
    return ordinary;
  },
  clearance(value,digits=1){
    const rounded=value.toFixed(digits);
    return value>0 && Number(rounded)===0?'less than '+(10**-digits).toFixed(digits):rounded;
  },
  count(value,singular,plural=singular+'s'){return value+' '+(value===1?singular:plural);}
};

function orientation(az,el){
  const {direction,dot}=Flight;
  const forward=direction(az,el),right=direction(az-90,0),up=direction(az,el+90);
  const local=q=>[dot(q,right),dot(q,up),dot(q,forward)];
  return {forward,right,up,local};
}

// A transfer estimates recoil for a point in the grab volume. Preview evaluates the
// actual release, including the selected power stop, grab rule and debris.
function missTrim(pos,near,untilPass,oxygenLeft,mode,pose,mask,story){
  const {transfer,norm,scale}=Flight;
  const dv=transfer(pos,near.bar,untilPass,mode),recoil=norm(dv);
  const strongest=Math.max(0,...Flight.gear.map((_,i)=>mask&(1<<i)?Flight.impulse(i,mask):0));
  if(recoil<=strongest)return {bearing:scale(dv,-1),recoil,message:''};

  const budget=story?Infinity:Flight.budgets[mask];
  let best=recoil,bearing=null;
  for(const fraction of [.55,.75,.9]){
    const t=oxygenLeft*fraction;
    if(t<=untilPass+1)continue;
    const target=Flight.nearest(Flight.motion(pos,t,mode).p,pose);
    const later=transfer(pos,target,t,mode),cost=norm(later);
    if(cost<best && cost<=budget){best=cost;bearing=scale(later,-1);}
  }
  const message=recoil>budget?'This pass needs more recoil than the remaining rack.':'This pass needs more than one throw.';
  return {bearing,recoil:null,message:message+' Try a later approach.'};
}

// The displacement runs from the nearest grab bar to the predicted miss.
// Point the tool to that side so recoil pushes the suit back toward the bars.
function trimHint(displacement,az,elevation){
  if(Flight.norm(displacement)<1e-7)return '';
  const [right,up,forward]=orientation(az,elevation).local(Flight.unit(displacement));
  if(forward>.94)return 'Pitch straight ahead along the forward crosshair.';
  // At a pitch stop, match the target's horizontal heading before pitching back down or up.
  if(Math.abs(elevation)>=85 && up*Math.sign(elevation)>0 && Math.hypot(displacement[0],displacement[1])>1e-8){
    const [heading]=Flight.angles(displacement);
    const delta=((heading-az+540)%360+360)%360-180;
    if(Math.abs(delta)>8)return 'Turn '+(delta>0?'left':'right')+' along the horizon toward HDG '+Readout.heading(heading,0)+'°.';
  }
  if(forward<-.94)return 'Aim almost straight behind your current view.';
  const threshold=.42*Math.max(Math.abs(right),Math.abs(up)),parts=[];
  if(Math.abs(up)>=threshold)parts.push(up>0?'up':'down');
  if(Math.abs(right)>=threshold)parts.push(right>0?'right':'left');
  const side=parts.join(' and ');
  return forward<-.25?'Turn '+side+' toward the space behind you.':'Aim '+side+' in the forward visor.';
}
