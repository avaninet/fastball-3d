const el=id=>document.getElementById(id), {scale,unit,norm,dot,sub,clamp}=Flight;
const clock=Visor.clockText, allTools=63, visor=el('forward'), aft=el('aft');
let flight, yaw=0,pitch=0,selected=5,power=95,running=false,started=false,dirty=true,drag=null,modalResume=false;
let lastTime=performance.now(),lastPaint=0,lastText=0,rate=1;
const hex=n=>(n>>>0).toString(16).toUpperCase().padStart(8,'0');
const randomSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
function setView(vector){if(norm(vector)>1e-10){[yaw,pitch]=Flight.angles(vector);dirty=true;}}
function setMsg(msg){el('message').textContent=msg;}
function stationDirection(){return scale(flight.pos.p,-1);}
function reseat(skipInitial=false) {
  flight.anchor={p:flight.pos.p.slice(),v:flight.pos.v.slice()};flight.age=0;flight.hitIndex=0;
  flight.forecast=Flight.forecast(flight.anchor,Math.max(0,Flight.reserve-flight.time),flight.mode,skipInitial);
}
function start(index,mode,soft,seed=0) {
  const initial=index===3?Flight.randomStart(seed):Flight.named[index];
  flight={index,mode,soft,seed,initial,pos:{p:initial.p.slice(),v:initial.v.slice()},time:0,throws:0,mask:63,objects:[],misses:0,done:'',dragging:false};
  selected=5;power=95;el('power').value=power;rate=1;el('clockRate').value='1';
  running=false;started=false;lastTime=performance.now();reseat();setView(stationDirection());
  el('name').textContent=initial.name;el('brief').textContent=initial.brief;el('modeTag').textContent=mode;
  el('captureTag').textContent=soft?'Soft capture ≤ 0.080 m/s':'Any-speed capture';
  el('seedTag').hidden=index!==3;el('seedTag').textContent='Seed '+hex(seed);
  setMsg('First pitch starts the clock. Drag the visor or use Face away to line up a return.');
  updateRack();instruments();dirty=true;
}
function finish(result) {
  running=false;flight.done=result;dirty=true;
  const won=result==='capture',drill=!!(flight.mask&(1<<4));
  el('endTitle').textContent=won?'Grab bars secured':'Oxygen exhausted';
  el('endCopy').textContent=won?(drill?'“Welcome home, Captain. I see you brought the drill.”':'“I have your tether, Captain. Welcome back.”'):'The reserve ran out before a successful grab. Retry the same opening to test a different pitch.';
  el('endStats').textContent=clock(flight.time)+' flight time · '+flight.throws+' throw'+(flight.throws===1?'':'s')+' · '+norm(flight.pos.v).toFixed(3)+' m/s'+(flight.misses?' · '+flight.misses+' fast pass'+(flight.misses===1?'':'es'):'');
  setMsg(el('endTitle').textContent+'. '+el('endStats').textContent);
  instruments();updateRack();el('debrief').showModal();
}
function advance(dt) {
  if(flight.done || dt<=0)return;
  const step=Math.min(dt,Flight.reserve-flight.time),end=flight.age+step;
  const hits=flight.forecast.hits;
  while(flight.hitIndex<hits.length && hits[flight.hitIndex].t<=end+1e-8) {
    const h=hits[flight.hitIndex++];
    if(!flight.soft || h.speed<=Flight.limit+1e-9) {
      flight.time+=Math.max(0,h.t-flight.age);flight.age=h.t;flight.pos=Flight.motion(flight.anchor,h.t,flight.mode);
      finish('capture');return;
    }
    flight.misses++;setMsg('Fast pass at '+h.speed.toFixed(3)+' m/s. Clear the grab bars, turn back and enter again at 0.080 m/s or slower.');
  }
  flight.time+=step;flight.age=end;flight.pos=Flight.motion(flight.anchor,end,flight.mode);
  if(flight.time>=Flight.reserve-1e-8)finish('oxygen');
}
function sync(now=performance.now()) {
  if(running)advance(Math.max(0,now-lastTime)/1000*rate);
  lastTime=now;
}
function updateRack() {
  for(const [i,g] of Flight.gear.entries()) {
    const b=el('tool'+i),present=!!(flight.mask&(1<<i));b.disabled=!present||!!flight.done;
    b.setAttribute('aria-pressed',String(present&&selected===i));b.querySelector('small').textContent=present?g.mass.toFixed(1)+' kg':'Released';
  }
  el('budget').textContent=Flight.budgets[flight.mask].toFixed(3)+' m/s Δv';
  el('throw').disabled=selected<0||!!flight.done;el('power').disabled=selected<0||!!flight.done;
  el('throwText').textContent=selected<0?'Rack empty':'Throw '+Flight.gear[selected].name.toLowerCase();
  el('powerValue').textContent=power+'%';
  el('impulseInfo').textContent=selected<0?'No equipment remaining':(Flight.impulse(selected,flight.mask)*power/100).toFixed(3)+' m/s recoil';
}
function choose(i){if(!flight.done && (flight.mask&(1<<i))){selected=i;updateRack();}}
function throwTool() {
  sync();if(flight.done||selected<0||!(flight.mask&(1<<selected)))return;
  const dir=Flight.direction(yaw,pitch),g=Flight.gear[selected],old=flight.pos;
  flight.pos=Flight.release(old,selected,power,dir,flight.mask);
  flight.objects.push({time:flight.time,start:{p:old.p.slice(),v:Flight.add(flight.pos.v,scale(dir,g.speed*power/100))}});
  flight.mask^=1<<selected;flight.throws++;
  setMsg(g.name+' released at '+power+'%. Read the committed coast before spending another tool.');
  selected=Flight.gear.findIndex((g,i)=>!!(flight.mask&(1<<i)));
  reseat(Flight.inside(old.p)&&flight.misses>0);
  if(!started){started=true;running=true;}rate=1;el('clockRate').value='1';lastTime=performance.now();dirty=true;updateRack();instruments();
}
function describeSide(point,bar) {
  const diff=sub(point,bar),side=['radially inward','radially outward','behind the station','ahead along-track','below the orbital plane','above the orbital plane'];
  const axis=diff.reduce((a,b,i,arr)=>Math.abs(b)>Math.abs(arr[a])?i:a,0);
  return side[2*axis+(diff[axis]>0?1:0)];
}
function nav() {
  const c=el('coast'),a=el('advice'),s=flight;
  c.className='readout';
  if(s.done){c.textContent=s.done==='capture'?'Contact confirmed':'Reserve expired';c.classList.add(s.done==='capture'?'good':'danger');a.textContent='Flight time '+clock(s.time)+' · '+s.throws+' tools released.';return;}
  if(!s.throws && !s.misses){
    c.textContent='Awaiting first pitch';
    a.textContent=s.index===0?'Face away and throw the battery. Watch for the station in your aft camera.':'Aim so your recoil cancels unwanted drift. The coast appears after release.';return;
  }
  const h=s.forecast.hits[s.hitIndex];
  if(h){
    const tooFast=s.soft&&h.speed>Flight.limit+1e-9;
    c.textContent=(tooFast?'Fast contact in ':'Contact in ')+clock(Math.ceil(Math.max(0,h.t-s.age)));c.classList.add(tooFast?'warn':'good');
    a.textContent=tooFast?'Projected '+h.speed.toFixed(3)+' m/s. Face drift and brake before reaching the bars.':'Grab bars on course. Projected contact speed '+h.speed.toFixed(3)+' m/s. You can advance the clock.';return;
  }
  if(s.misses && Flight.inside(s.pos.p)){c.textContent='Inside after fast pass';c.classList.add('warn');a.textContent='Coast clear of the outline, then set up a slower return.';return;}
  const n=s.forecast.near;
  if(n.t<=s.age+.03){c.textContent='Opening the gap';a.textContent='Closest approach is behind you. Face away from the station for return recoil and account for sideways drift.';}
  else if(n.t>=s.forecast.path.at(-1).t-.03){c.textContent=n.d.toFixed(1)+' m short at expiry';a.textContent='The clock runs out before contact. Increase closure or aim a shorter route.';}
  else{c.textContent='Miss by '+n.d.toFixed(1)+' m';a.textContent='Nearest pass '+describeSide(n.p,n.bar)+' in '+clock(Math.ceil(n.t-s.age))+'. Throw toward the side of the miss to trim.';}
  c.classList.add('warn');
}
function instruments() {
  const {p,v}=flight.pos,bar=Flight.nearest(p),distance=Flight.clearance(p);
  const rr=distance>1e-8?dot(unit(sub(p,bar)),v):0,sp=norm(v);
  el('range').textContent=distance.toFixed(1);el('rate').textContent=(rr>=0?'+':'')+rr.toFixed(3);el('rate').className=rr<0?'good':rr>0?'warn':'';
  el('speed').textContent=sp.toFixed(3);el('speed').className=flight.soft&&sp>Flight.limit?'danger':'';
  const [az,elv]=Flight.angles(v);
  el('driftAngles').textContent=sp<.00001?'Stationary':'HDG '+Math.round((az+360)%360)%360+'° / EL '+(elv>=0?'+':'')+Math.round(elv)+'°';
  el('oxygen').textContent=clock(Math.ceil(Flight.reserve-flight.time));el('paused').hidden=!started||running||!!flight.done;
  el('pause').textContent=flight.done?'Debrief':running?'Pause':started?'Resume':'Start';
  nav();
}
function pause(){sync();if(flight.done){if(!el('debrief').open)el('debrief').showModal();return;}started=true;running=!running;dirty=true;instruments();}
function frame(now) {
  sync(now);
  if(dirty || running&&now-lastPaint>=32) {
    Visor.render(visor,yaw,pitch,flight);Visor.render(aft,yaw+180,-pitch,flight,true);lastPaint=now;dirty=false;
  }
  if(running && now-lastText>=135){instruments();lastText=now;}
  requestAnimationFrame(frame);
}
for(const [i,g] of Flight.gear.entries()) {
  const b=document.createElement('button');b.id='tool'+i;b.className='tool';b.title=g.name+' · '+g.mass.toFixed(1)+' kg · key '+(i+1);
  const key=document.createElement('span');key.className='hotkey';key.textContent=i+1;
  const img=document.createElement('canvas');img.setAttribute('aria-hidden','true');const name=document.createElement('b');name.textContent=g.name;
  const size=document.createElement('small');b.append(key,img,name,size);el('tools').append(b);Visor.toolArt(img,i);b.onclick=()=>choose(i);
}
el('toStation').onclick=()=>setView(stationDirection());el('away').onclick=()=>setView(flight.pos.p);el('prograde').onclick=()=>setView(flight.pos.v);
el('throw').onclick=throwTool;el('pause').onclick=pause;
el('clockRate').onchange=()=>{sync();rate=Number(el('clockRate').value);};
el('power').oninput=()=>{power=Number(el('power').value);updateRack();};
visor.addEventListener('pointerdown',e=>{
  if(drag || e.button!==0)return;visor.focus({preventScroll:true});visor.setPointerCapture(e.pointerId);
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch,moved:false};flight.dragging=true;document.body.classList.add('dragging');
});
visor.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.hypot(dx,dy)>3)drag.moved=true;
  if(drag.moved){yaw=drag.yaw+dx*.25;pitch=clamp(drag.pitch+dy*.25,-90,90);dirty=true;}
});
function endDrag(e,accept){
  if(!drag||e.pointerId!==drag.id)return;
  if(accept&&!drag.moved){
    const r=visor.getBoundingClientRect(),cam=Visor.camera(flight.pos.p,yaw,pitch,r.width,r.height,false);
    const dx=(e.clientX-r.left-r.width/2)/cam.f,dy=(r.height/2-e.clientY+r.top)/cam.f;
    setView(Flight.add(cam.forward,Flight.add(scale(cam.right,dx),scale(cam.up,dy))));
  }
  drag=null;flight.dragging=false;document.body.classList.remove('dragging');dirty=true;
}
visor.onpointerup=e=>endDrag(e,true);visor.onpointercancel=e=>endDrag(e,false);visor.onlostpointercapture=e=>endDrag(e,false);
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]')||e.altKey||e.ctrlKey||e.metaKey)return;
  const target=e.target,editing=['INPUT','SELECT','TEXTAREA'].includes(target.tagName);
  if(editing)return;
  const key=e.key.toLowerCase(),step=e.shiftKey?.25:2;
  if(/^[1-6]$/.test(key)){choose(Number(key)-1);return;}
  if(key==='p'){e.preventDefault();pause();return;}
  if(key==='['||key===']'){power=clamp(power+(key==='['?-1:1),10,100);el('power').value=power;updateRack();return;}
  if(key==='enter'&&target===visor){e.preventDefault();if(!e.repeat)throwTool();return;}
  if(!key.startsWith('arrow'))return;
  e.preventDefault();if(key==='arrowleft')yaw+=step;if(key==='arrowright')yaw-=step;
  if(key==='arrowup')pitch=clamp(pitch+step,-90,90);if(key==='arrowdown')pitch=clamp(pitch-step,-90,90);dirty=true;
});
function pauseForModal(d){
  sync();if(el('debrief').open && d!==el('debrief'))el('debrief').close();
  modalResume=running;running=false;dirty=true;instruments();d.showModal();
}
function updateSetup() {
  const idx=Number(el('scenario').value),isRandom=idx===3;
  el('seedGroup').hidden=!isRandom;el('seed').required=isRandom;el('seed').disabled=!isRandom;
  el('setupBrief').textContent=isRandom?'Each seed is checked for a soft return in both flight models.':Flight.named[idx].brief;
}
function openSetup(){
  el('scenario').value=String(flight.index);el('seed').value=hex(flight.index===3?flight.seed:randomSeed());
  document.querySelector('input[name=model][value="'+flight.mode+'"]').checked=true;el('soft').checked=flight.soft;updateSetup();pauseForModal(el('setup'));
}
el('new').onclick=openSetup;el('again').onclick=openSetup;el('manual').onclick=()=>pauseForModal(el('guide'));
el('scenario').onchange=updateSetup;el('reroll').onclick=()=>{el('seed').value=hex(randomSeed());};
el('setupForm').onsubmit=e=>{
  e.preventDefault();modalResume=false;el('setup').close();start(Number(el('scenario').value),document.querySelector('input[name=model]:checked').value,el('soft').checked,parseInt(el('seed').value,16)>>>0);
};
el('retry').onclick=()=>{el('debrief').close();start(flight.index,flight.mode,flight.soft,flight.seed);};
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
for(const d of [el('guide'),el('setup')])d.addEventListener('close',()=>{
  if(modalResume&&!flight.done&&!document.hidden){running=true;lastTime=performance.now();}
  modalResume=false;dirty=true;instruments();
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){sync();running=false;modalResume=false;dirty=true;instruments();}
  lastTime=performance.now();
});
new ResizeObserver(()=>{dirty=true;}).observe(document.querySelector('.deck'));
const earth=el('earthArt');
function loadSky(){Visor.loadEarth(earth);dirty=true;}
if(earth.complete&&earth.naturalWidth)loadSky();else earth.onload=loadSky;
start(0,'Straight-Line',false);requestAnimationFrame(frame);
