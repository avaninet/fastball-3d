const el=id=>document.getElementById(id), {scale,unit,norm,dot,sub,clamp}=Flight;
// Gear indices identify physical items in flight records and inventory masks.
const rackOrder=Flight.gear.map((_,i)=>i).sort((a,b)=>Flight.gear[a].mass-Flight.gear[b].mass);
const clockSpeeds=[1,10,20,30];
const clock=Visor.clockText, visor=el('forward'), aft=el('aft');
let flight, yaw=0,pitch=0,selected=5,power=95,running=false,started=false,dirty=true,drag=null;
let lastTime=performance.now(),lastPaint=0,lastText=0,rate=1;
const hex=n=>(n>>>0).toString(16).toUpperCase().padStart(8,'0');
const seedLabel=seed=>typeof seed==='number'?hex(seed):seed;
const weightClass=g=>g.mass<1?'Light':g.mass<3?'Medium':'Heavy';
const randomSeed=()=>'D-'+hex(crypto.getRandomValues(new Uint32Array(1))[0]);
function setView(vector){if(norm(vector)>1e-10){[yaw,pitch]=Flight.angles(vector);dirty=true;}}
function setMsg(msg){el('message').textContent=msg;}
function stationDirection(){return scale(flight.pos.p,-1);}
function reseat(skipInitial=false) {
  flight.anchor={p:flight.pos.p.slice(),v:flight.pos.v.slice()};flight.age=0;flight.hitIndex=0;
  flight.forecast=Flight.forecast(flight.anchor,Math.max(0,flight.limit-flight.time),flight.mode,skipInitial,flight.soft);
}
function start(index,mode,soft,seed=0,story=false,lesson=null) {
  const initial=Flight.opening(index,seed,story);
  invalidateInput();
  flight={index,mode,soft,seed,story,limit:Flight.oxygenReserve,lesson,skippedGuidance:false,checkAt:null,checked:false,initial,log:{releases:[],fast:[]},pos:{p:initial.p.slice(),v:initial.v.slice()},time:0,throws:0,mask:Flight.fullRack,objects:[],misses:0,done:'',dragging:false,keyAiming:false};
  selected=5;power=95;el('power').value=power;setClockStop(0);
  running=false;started=false;lastTime=performance.now();reseat();setView(stationDirection());
  el('name').textContent=initial.name;el('brief').textContent=lesson===0?'Capt. Tommi Dylan (she/they) broke Mach 10 in the classified SR-73. On Saturdays she pitches with friends. Today her tether snaps and her suit thrusters jam.':initial.brief;el('modeTag').textContent=mode;
  el('captureTag').textContent=soft?'Soft capture ≤ 0.080 m/s':'Any-speed capture';
  el('seedTag').hidden=index!==3;el('seedTag').textContent='Copy replay · '+seedLabel(seed);
  Replays.updateAddress(flight);
  el('assists').hidden=!story;el('storyTag').hidden=!story;
  el('lesson').hidden=lesson===null;
  setMsg(story?'Story flight. Aim while staged or paused. Throw runs the clock at 1×.':'Read the opening, then begin flight. Drag the visor or use arrow keys to aim.');
  updateRack();instruments();dirty=true;
}
const outcomes={capture:'Grab bars secured',oxygen:'Oxygen exhausted',stranded:'Out of tools'};
function finish(result) {
  running=false;flight.done=result;flight.finishedAt=new Date();invalidateInput();dirty=true;
  el('retry').textContent=flight.skippedGuidance?'Retry manual opening':'Retry';
  const won=result==='capture',drill=!!(flight.mask&(1<<4));
  el('endTitle').textContent=outcomes[result];
  el('endCopy').textContent=won?(drill?'Upmass Hero · “Welcome home, Captain. I see you brought the drill.”':'“I have your tether, Captain. Welcome back.”')+' — Commander Julian Bern':'The reserve ran out before a successful grab. Retry to test a different pitch.';
  if(result==='stranded'){
    const lastFast=flight.log.fast.at(-1);
    if(lastFast && Math.abs(lastFast.time-flight.time)<1e-7){
      el('endCopy').textContent='The final pass was too fast to grab. The empty rack leaves no way back before oxygen expiry.';
    }else if(Flight.inside(flight.pos.p)){
      el('endCopy').textContent='The rack is empty. The suit is moving too fast for a grab anywhere on the remaining coast.';
    }else{
      const distance=flight.forecast.near.d;
      const clearance=distance<.05?'less than 0.1':distance.toFixed(1);
      el('endCopy').textContent='The rack is empty. The remaining coast misses the bars by '+clearance+' m before oxygen expiry.';
    }
  }
  const {budget,speed}=FlightLog.resultReadout(flight);
  el('endBudget').textContent=budget;
  el('endStats').textContent=speed+' · '+clock(flight.time)+' flight time · '+Readout.count(flight.throws,'throw')+(flight.misses?' · '+Readout.count(flight.misses,'fast pass','fast passes'):'');
  setMsg(el('endTitle').textContent+'. '+budget+' · '+el('endStats').textContent);
  el('debriefShare').hidden=flight.index!==3;
  el('endSeed').textContent=flight.index===3?seedLabel(flight.seed):'';
  el('endShareStatus').textContent='';
  updateLessonEnd();instruments();updateRack();el('debrief').showModal();
}
function advance(dt) {
  if(flight.done || dt<=0)return;
  const step=Math.min(dt,flight.limit-flight.time,flight.checkAt===null?Infinity:Math.max(0,flight.checkAt-flight.time)),end=flight.age+step;
  const hits=flight.forecast.hits;
  while(flight.hitIndex<hits.length && hits[flight.hitIndex].t<=end+1e-8) {
    const h=hits[flight.hitIndex++];
    if(!flight.soft || Flight.softEnough(h.speed)) {
      flight.time+=Math.max(0,h.t-flight.age);flight.age=h.t;flight.pos=Flight.motion(flight.anchor,h.t,flight.mode);
      finish('capture');return;
    }
    flight.log.fast.push({time:flight.time-flight.age+h.t,p:h.p.slice(),speed:h.speed});
    flight.misses++;
    if(!flight.mask && flight.hitIndex===hits.length){
      flight.time+=Math.max(0,h.t-flight.age);flight.age=h.t;flight.pos=Flight.motion(flight.anchor,h.t,flight.mode);
      finish('stranded');return;
    }
    setMsg('Fast pass at '+Readout.speed(h.speed)+' m/s. Brake while within reach, or circle back for a slower grab.');
  }
  flight.time+=step;flight.age=end;flight.pos=Flight.motion(flight.anchor,end,flight.mode);
  if(flight.time>=flight.limit-1e-8)finish('oxygen');
  else if(flight.checkAt!==null && flight.time>=flight.checkAt-1e-8){
    flight.checkAt=null;flight.checked=true;freezeClock();
    setMsg('Course check. Read both cameras and Current coast before resuming.');
  }
}
function sync(now=performance.now()) {
  now=Math.max(now,lastTime);
  const elapsed=now-lastTime;
  lastTime=now;
  if(running && elapsed>1000){
    freezeClock();setMsg('Flight paused after a clock interruption. Resume when ready.');
    return false;
  }
  if(running)advance(elapsed/1000*rate);
  return true;
}
function updateRack() {
  for(const [i,g] of Flight.gear.entries()) {
    const b=el('tool'+i),present=!!(flight.mask&(1<<i));b.disabled=!present||!canPitch();
    const detail=present?g.mass.toFixed(1)+' kg':'Released';
    b.setAttribute('aria-label',g.name+', '+detail);
    b.setAttribute('aria-pressed',String(present&&selected===i));b.querySelector('small').textContent=detail;
  }
  el('budget').textContent=Flight.gear.filter((_,i)=>flight.mask&(1<<i)).length+'/'+Flight.gear.length+' aboard · '+Flight.budgets[flight.mask].toFixed(3)+' m/s Δv';
  el('throw').disabled=selected<0||!canPitch();el('power').disabled=selected<0||!canPitch();
  el('throwText').textContent=selected<0?'Rack empty':(flight.story&&!running?'Throw & fly · ':'Throw ')+Flight.gear[selected].name.toLowerCase();
  el('powerValue').textContent=power+'%';
  el('impulseInfo').textContent=selected<0?'No equipment remaining':weightClass(Flight.gear[selected])+' · '+(Flight.impulse(selected,flight.mask)*power/100).toFixed(3)+' m/s recoil';
}
function choose(i){if(canPitch() && (flight.mask&(1<<i))){selected=i;updateRack();}}
function throwTool() {
  if(!canPitch())return;
  const epoch=inputEpoch;
  sync();if(epoch!==inputEpoch||!canPitch()||selected<0||!(flight.mask&(1<<selected)))return;
  const dir=Flight.direction(yaw,pitch),g=Flight.gear[selected],old=flight.pos;
  flight.pos=Flight.release(old,selected,power,dir,flight.mask);
  flight.log.releases.push({time:flight.time,tool:selected,power,dir:dir.slice(),p:old.p.slice(),v:flight.pos.v.slice()});
  flight.objects.push({time:flight.time,start:{p:old.p.slice(),v:Flight.add(flight.pos.v,scale(dir,g.speed*power/100))}});
  flight.mask^=1<<selected;flight.throws++;
  setMsg(g.name+' released at '+power+'%. Read the committed coast before spending another tool.');
  selected=rackOrder.find(i=>flight.mask&(1<<i))??-1;
  reseat(Flight.inside(old.p)&&flight.misses>0);
  const contact=flight.forecast.hits[0];
  if(contact?.t===0 && (!flight.soft||Flight.softEnough(contact.speed))){finish('capture');return;}
  if(!flight.mask && !flight.forecast.hits.length){finish('stranded');return;}
  if(!running)invalidateInput();
  flight.noTrim=false;started=true;running=true;scheduleLessonCheck();setClockStop(0);lastTime=performance.now();dirty=true;updateRack();instruments();
}
function describeSide(point,bar) {
  const diff=sub(point,bar),side=['radially inward','radially outward','behind the station','ahead along-track','below the orbital plane','above the orbital plane'];
  const axis=diff.reduce((a,b,i,arr)=>Math.abs(b)>Math.abs(arr[a])?i:a,0);
  return side[2*axis+(diff[axis]>0?1:0)];
}
// The displacement runs from the nearest grab bar to the predicted miss.
// Point the tool to that side so recoil pushes the suit back toward the bars.
function trimHint(displacement,az,elevation){
  if(norm(displacement)<1e-7)return '';
  const [right,up,forward]=Visor.orientation(az,elevation).local(unit(displacement));
  if(forward>.94)return 'Pitch straight ahead along the forward crosshair.';
  if(forward<-.94)return 'Aim almost straight behind your current view.';
  const threshold=.42*Math.max(Math.abs(right),Math.abs(up)),parts=[];
  if(Math.abs(up)>=threshold)parts.push(up>0?'up':'down');
  if(Math.abs(right)>=threshold)parts.push(right>0?'right':'left');
  const side=parts.join(' and ');
  return forward<-.25?'Turn '+side+' toward the space behind you.':'Aim '+side+' in the forward visor.';
}
function nav() {
  const c=el('coast'),a=el('advice'),s=flight;
  c.className='readout';
  if(s.done){c.textContent=outcomes[s.done];c.classList.add(s.done==='capture'?'good':'danger');a.textContent='Flight time '+clock(s.time)+' · '+Readout.count(s.throws,'tool')+' released.';return;}
  if(!started && !s.throws){
    c.textContent=s.story?'Ready for first pitch':'Ready to begin';
    a.textContent=s.story?'Line up while staged. Throw starts the oxygen clock.':'The tool follows the crosshair. Your suit recoils the other way. Begin flight starts the clock.';return;
  }
  const h=s.forecast.hits[s.hitIndex];
  if(h){
    const tooFast=s.soft&&!Flight.softEnough(h.speed);
    c.textContent=(tooFast?'Fast contact in ':'Contact in ')+clock(Math.ceil(Math.max(0,h.t-s.age)));c.classList.add(tooFast?'warn':'good');
    if(tooFast){
      a.textContent='Projected '+Readout.speed(h.speed)+' m/s. '+(s.mask?'Throw along measured drift to brake before reaching the bars.':'The rack is empty. Coast to the bars.');
    }else{
      a.textContent='Grab bars on course. Projected grab speed '+Readout.speed(h.speed)+' m/s. You can advance the clock.';
    }
    return;
  }
  if(s.misses && Flight.inside(s.pos.p)){c.textContent='Inside after fast pass';c.classList.add('warn');a.textContent='Throw along your drift to brake while the bars are still within reach, or coast through and return.';return;}
  const n=s.forecast.near;
  if(s.misses && n.d<1e-6 && n.t<=s.age){
    const last=s.log.fast.at(-1);
    c.textContent='Cleared after fast pass';
    a.textContent='Last entry '+clock(s.time-last.time)+' ago at '+Readout.speed(last.speed)+' m/s. Set up a slower return.';
    c.classList.add('warn');return;
  }
  if(!s.throws && s.index===0 && n.t<=s.age+.03){
    c.textContent='Drifting away';
    a.textContent='Turn the visor away from the station. Throw along the crosshair to push yourself back. Watch the aft camera.';
    c.classList.add('warn');return;
  }
  if(n.t<=s.age+.03){c.textContent='Opening the gap';a.textContent='Closest pass '+n.d.toFixed(1)+' m '+describeSide(n.p,n.bar)+', '+clock(s.age-n.t)+' ago. '+trimHint(sub(s.pos.p,Flight.nearest(s.pos.p)),yaw,pitch);}
  else if(n.t>=s.forecast.path.at(-1).t-.03){c.textContent=n.d.toFixed(1)+' m short at expiry';a.textContent='Closest at oxygen expiry in '+clock(Math.ceil(n.t-s.age))+', '+describeSide(n.p,n.bar)+'. '+trimHint(sub(n.p,n.bar),yaw,pitch);}
  else{c.textContent='Miss by '+n.d.toFixed(1)+' m';a.textContent='Nearest pass '+describeSide(n.p,n.bar)+' in '+clock(Math.ceil(n.t-s.age))+'. '+trimHint(sub(n.p,n.bar),yaw,pitch);}
  c.classList.add('warn');
}
function instruments() {
  const {p,v}=flight.pos,bar=Flight.nearest(p),distance=Flight.clearance(p);
  const rr=distance>1e-8?dot(unit(sub(p,bar)),v):0,sp=norm(v);
  el('range').textContent=distance.toFixed(1);el('rate').textContent=Readout.signed(rr,3);el('rate').className=rr<0?'good':rr>0?'warn':'';
  el('speed').textContent=Readout.speed(sp);el('speed').className=flight.soft&&!Flight.softEnough(sp)?'danger':'';
  const gauge=el('speedGauge'),ceiling=Math.max(.12,Math.ceil(sp/.04)*.04);
  gauge.style.setProperty('--fill',(100*sp/ceiling)+'%');
  gauge.style.setProperty('--tick',(100*Flight.limit/ceiling)+'%');
  gauge.classList.toggle('over',flight.soft&&!Flight.softEnough(sp));
  gauge.setAttribute('aria-valuemax',ceiling.toFixed(3));gauge.setAttribute('aria-valuenow',String(sp));
  const threshold=flight.soft?'Soft limit':'Reference';
  el('speedRef').textContent=threshold+' '+Flight.limit.toFixed(3);
  gauge.setAttribute('aria-valuetext',Readout.speed(sp)+' metres per second. '+threshold+' '+Flight.limit.toFixed(3));
  for(const [i,axis] of ['X','Y','Z'].entries())el('vel'+axis).textContent=Readout.signed(v[i],4);
  el('suitMass').textContent=Flight.mass(flight.mask).toFixed(1)+' kg';
  const [az,elv]=Flight.angles(v);
  el('driftAngles').textContent=sp<.00001?'Stationary':'HDG '+Readout.heading(az,0)+'° / EL '+Readout.signed(elv,0)+'°';
  el('oxygen').textContent=clock(Math.ceil(flight.limit-flight.time));
  el('flightDeck').classList.toggle('is-paused',started&&!running&&!flight.done);
  el('pause').textContent=flight.done?'Debrief':running?'Pause':started?'Resume':'Begin flight';
  el('pausedLineup').hidden=!flight.story;
  updateLessonCue();
  nav();
}
function canPitch(){return !!flight && !flight.done && !document.hidden && !document.querySelector('dialog[open]') && (running||flight.story);}
function freezeClock(){
  running=false;invalidateInput();dirty=true;updateRack();instruments();
}
function pause(){
  if(document.hidden||document.querySelector('dialog[open]'))return;
  if(!sync())return;
  if(flight.done){el('debrief').showModal();return;}
  if(running){freezeClock();return;}
  invalidateInput();started=true;running=true;lastTime=performance.now();dirty=true;updateRack();instruments();
  setMsg(flight.story?'Clock running. Aim, throw, or pause to line up.':'Clock running. Drag or tap the visor, choose power, then throw.');
}
function frame(now) {
  sync(now);
  if(dirty || running&&now-lastPaint>=32) {
    if(dirty && !running){nav();updateLessonCue();}
    Visor.render(visor,yaw,pitch,flight);Visor.render(aft,yaw+180,-pitch,flight,true);lastPaint=now;dirty=false;
  }
  if(running && now-lastText>=135){instruments();lastText=now;}
  requestAnimationFrame(frame);
}
for(const [slot,i] of rackOrder.entries()) {
  const g=Flight.gear[i],keyNumber=slot+1;
  const b=document.createElement('button');b.id='tool'+i;b.className='tool';b.title=g.name+' · '+weightClass(g)+' · '+g.mass.toFixed(1)+' kg · key '+keyNumber;
  const key=document.createElement('span');key.className='hotkey';key.textContent=keyNumber;
  b.setAttribute('aria-keyshortcuts',String(keyNumber));
  const img=document.createElement('canvas');img.setAttribute('aria-hidden','true');const name=document.createElement('b');name.textContent=g.name;
  const size=document.createElement('small');b.append(key,img,name,size);el('tools').append(b);Visor.toolArt(img,i);b.onclick=()=>choose(i);
}
const heldKeys=new Map(),aimKeys=new Set(), presses=new Map(), handledClicks=new WeakSet();
let inputEpoch=0, inputSince=0, sliderPress=null;
function invalidateInput(){
  inputEpoch++;inputSince=performance.now();presses.clear();
  aimKeys.clear();if(flight)flight.keyAiming=false;
  if(sliderPress?.ended)sliderPress=null;
  if(drag && visor.hasPointerCapture(drag.id))visor.releasePointerCapture(drag.id);
  drag=null;if(flight)flight.dragging=false;document.body.classList.remove('dragging');
}
function changePower(value){if(canPitch())power=clamp(value,10,100);el('power').value=power;updateRack();}
function snap(vector){if(flight.story&&canPitch())setView(vector);}
el('toStation').onclick=()=>snap(stationDirection());el('away').onclick=()=>snap(flight.pos.p);el('prograde').onclick=()=>snap(flight.pos.v);
el('throw').onclick=throwTool;el('pause').onclick=pause;
function setClockStop(index){
  rate=clockSpeeds[index];el('clockRate').value=String(index);el('rateLabel').textContent=rate+'×';
  el('clockRate').setAttribute('aria-valuetext',rate+' times real time');
}
el('clockRate').oninput=()=>{sync();setClockStop(el('clockRate').valueAsNumber);};
el('power').oninput=()=>changePower(sliderPress && sliderPress.epoch!==inputEpoch?power:Number(el('power').value));

// Tie browser-generated activation to the press that began it. Pause, dialogs,
// a new opening and a hidden tab each invalidate outstanding cockpit gestures.
const pitchTargets='.tool,#throw,#away,#toStation,#prograde,#lessonAction';
document.addEventListener('pointerdown',e=>{
  presses.delete(e.pointerId);
  if(e.target===el('power'))sliderPress={id:e.pointerId,epoch:canPitch()?inputEpoch:-1};
  const button=e.target.closest(pitchTargets);
  for(const [id,press] of presses)if(press.up&&press.button===button)presses.delete(id);
  if(button && canPitch() && e.button===0)presses.set(e.pointerId,{button,epoch:inputEpoch,up:false});
},true);
document.addEventListener('pointerup',e=>{
  const press=presses.get(e.pointerId);
  if(press){
    press.up=press.button===e.target.closest(pitchTargets);
    if(!press.up)presses.delete(e.pointerId);
  }
  if(sliderPress?.id===e.pointerId){
    const released=sliderPress;released.ended=true;
    // Native range inputs may deliver their final input after pointerup.
    setTimeout(()=>{if(sliderPress===released)sliderPress=null;},0);
  }
},true);
document.addEventListener('pointercancel',e=>{
  presses.delete(e.pointerId);if(sliderPress?.id===e.pointerId)sliderPress=null;
},true);
document.addEventListener('click',e=>{
  const button=e.target.closest(pitchTargets);
  if(!button)return;
  let valid=canPitch()&&e.timeStamp>=inputSince&&!handledClicks.has(e);
  if(e.detail>0 || (e.pointerType && e.pointerId>=0)){
    // A compatibility mouse click can omit or relabel the original touch ID.
    let id=e.pointerId;
    if(!presses.has(id)){
      for(const [candidate,completed] of presses){
        if(completed.button===button&&completed.up&&completed.epoch===inputEpoch){id=candidate;break;}
      }
    }
    const press=presses.get(id);
    valid=valid && press?.button===button && press.up && press.epoch===inputEpoch;
    presses.delete(id);
  }
  handledClicks.add(e);
  if(!valid){e.preventDefault();e.stopImmediatePropagation();}
},true);
visor.addEventListener('pointerdown',e=>{
  if(!canPitch() || drag || e.button!==0)return;
  visor.focus({preventScroll:true});if(e.isTrusted)visor.setPointerCapture(e.pointerId);
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,moved:false};flight.dragging=true;document.body.classList.add('dragging');
});
visor.addEventListener('pointermove',e=>{
  if(!canPitch()||!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>3)drag.moved=true;
  if(drag.moved){yaw=drag.yaw+dx*.25;pitch=clamp(drag.pitch+dy*.25,-90,90);dirty=true;}
});
function endDrag(e,accept){
  if(!drag||e.pointerId!==drag.id)return;
  if(accept&&canPitch()&&!drag.moved){
    const r=visor.getBoundingClientRect(),cam=Visor.camera(flight.pos.p,yaw,pitch,r.width,r.height,false);
    const dx=(e.clientX-r.left-r.width/2)/cam.f,dy=(r.height/2-e.clientY+r.top)/cam.f;
    setView(Flight.add(cam.forward,Flight.add(scale(cam.right,dx),scale(cam.up,dy))));
  }
  drag=null;flight.dragging=false;document.body.classList.remove('dragging');dirty=true;
}
visor.onpointerup=e=>endDrag(e,true);visor.onpointercancel=e=>endDrag(e,false);visor.onlostpointercapture=e=>endDrag(e,false);
document.addEventListener('keyup',e=>{
  const key=e.code||e.key;
  if(aimKeys.delete(key)){flight.keyAiming=aimKeys.size>0;dirty=true;}
  if(heldKeys.has(key)&&heldKeys.get(key)!==inputEpoch){e.preventDefault();e.stopImmediatePropagation();}
  heldKeys.delete(key);
},true);
document.addEventListener('keydown',e=>{
  if(typeof e.key!=='string'||!e.key)return;
  const code=e.code||e.key,key=e.key.toLowerCase();
  if(!e.repeat)heldKeys.set(code,canPitch()||key==='p'?inputEpoch:-1);
  if(e.repeat && heldKeys.get(code)!==inputEpoch){e.preventDefault();return;}
  if(document.querySelector('dialog[open]')||e.altKey||e.ctrlKey||e.metaKey)return;
  const target=e.target instanceof Element?e.target:document.body;
  if(key==='p'){e.preventDefault();if(!e.repeat)pause();return;}
  if(target.matches(pitchTargets) && (key==='enter'||key===' ')){
    e.preventDefault();if(canPitch()&&!e.repeat)target.click();return;
  }
  if(!canPitch()){
    if(target===visor || target===el('power')){if(key!=='tab')e.preventDefault();}
    return;
  }
  if(target===el('power'))sliderPress=null;
  if(target.matches('input,select,textarea'))return;
  const step=e.shiftKey?.25:2;
  if(/^[1-9]$/.test(key)){choose(rackOrder[Number(key)-1]);return;}
  if(key==='['||key===']'){e.preventDefault();changePower(power+(key==='['?-1:1));return;}
  if(key==='enter'&&target===visor){e.preventDefault();if(!e.repeat)throwTool();return;}
  if(!key.startsWith('arrow'))return;
  aimKeys.add(code);flight.keyAiming=true;
  e.preventDefault();if(key==='arrowleft')yaw+=step;if(key==='arrowright')yaw-=step;
  if(key==='arrowup')pitch=clamp(pitch+step,-90,90);if(key==='arrowdown')pitch=clamp(pitch-step,-90,90);dirty=true;
});
window.addEventListener('blur',()=>{
  if(aimKeys.size){aimKeys.clear();flight.keyAiming=false;dirty=true;}
});
function pauseForModal(d){
  sync();freezeClock();
  if(el('debrief').open)el('debrief').close();
  d.showModal();updateRack();
}
function setupRules(){
  return {mode:document.querySelector('input[name=model]:checked').value,soft:el('soft').checked,story:el('storyMode').checked};
}
function previewSeed(replay){
  const initial=Flight.opening(3,replay.seed,replay.story);
  el('seedPreview').textContent=seedLabel(replay.seed)+' · '+Flight.clearance(initial.p).toFixed(1)+' m from the bars · '+norm(initial.v).toFixed(3)+' m/s';
}
function loadSetupSeed(){
  const input=el('seed'),replay=Replays.parse(input.value,setupRules());
  if(!replay){
    el('seedPreview').textContent='Enter a Fastball 3D seed (for example D-00019919) or a replay link.';
    input.setAttribute('aria-invalid','true');input.focus();return null;
  }
  input.removeAttribute('aria-invalid');input.value=seedLabel(replay.seed);
  document.querySelector('input[name=model][value="'+replay.mode+'"]').checked=true;
  el('soft').checked=replay.soft;el('storyMode').checked=replay.story;
  previewSeed(replay);return replay;
}
function updateSetup() {
  const idx=Number(el('scenario').value),isRandom=idx===3;
  el('seedGroup').hidden=!isRandom;el('seed').required=isRandom;el('seed').disabled=!isRandom;
  el('setupBrief').textContent=isRandom?'Share the opening and flight rules with a friend, or load their replay.':Flight.named[idx].brief;
  if(isRandom)loadSetupSeed();
}
function openSetup(){
  el('scenario').value=String(flight.index);el('seed').value=flight.index===3?seedLabel(flight.seed):randomSeed();
  document.querySelector('input[name=model][value="'+flight.mode+'"]').checked=true;
  el('soft').checked=flight.soft;el('storyMode').checked=flight.story;updateSetup();pauseForModal(el('setup'));
}
el('new').onclick=openSetup;el('again').onclick=openSetup;el('manual').onclick=()=>pauseForModal(el('guide'));
el('scenario').onchange=updateSetup;el('reroll').onclick=()=>{el('seed').value=randomSeed();loadSetupSeed();};
el('loadSeed').onclick=loadSetupSeed;
el('seed').oninput=()=>{el('seed').removeAttribute('aria-invalid');el('seedPreview').textContent='Choose Load seed to preview this opening.';};
el('seed').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();loadSetupSeed();}};
el('storyMode').onchange=()=>{if(!el('seedGroup').hidden)loadSetupSeed();};
function launchFlight(index,mode,soft,seed,story,lesson=null){
  start(index,mode,soft,seed,story,lesson);
  if(!story)pause();
  visor.focus({preventScroll:true});
}
el('setupForm').onsubmit=e=>{
  e.preventDefault();
  const index=Number(el('scenario').value);
  const replay=index===3?loadSetupSeed():{...setupRules(),seed:0};
  if(!replay)return;
  const {mode,soft,seed,story}=replay;
  el('setup').close();launchFlight(index,mode,soft,seed,story);
};
el('retry').onclick=()=>{
  el('debrief').close();launchFlight(flight.index,flight.mode,flight.soft,flight.seed,flight.story,flight.lesson);
};
el('viewLog').onclick=()=>{FlightLog.show(flight);el('flightLog').showModal();};
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
// Require both ends of a gesture on the backdrop, including on touch screens.
for(const dialog of document.querySelectorAll('dialog')){
  let pointer=null;
  const outside=e=>{
    const r=dialog.getBoundingClientRect();
    return e.target===dialog && (e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom);
  };
  dialog.addEventListener('pointerdown',e=>{pointer=e.button===0 && outside(e)?e.pointerId:null;});
  dialog.addEventListener('pointercancel',()=>{pointer=null;});
  dialog.addEventListener('click',e=>{
    if(pointer!==null && (e.pointerId===undefined||pointer===e.pointerId) && outside(e))dialog.close();
    pointer=null;
  });
  dialog.addEventListener('close',()=>{pointer=null;});
}
for(const d of [el('guide'),el('setup'),el('confirmRescue')])d.addEventListener('close',()=>{
  dirty=true;updateRack();instruments();
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){sync();freezeClock();}
  lastTime=performance.now();updateRack();instruments();
});
new ResizeObserver(()=>{dirty=true;}).observe(document.querySelector('.deck'));
const earth=el('earthArt');
function loadSky(){Visor.loadEarth(earth);dirty=true;}
if(earth.complete&&earth.naturalWidth)loadSky();else earth.onload=loadSky;
