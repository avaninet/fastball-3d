const rescueCalls = {
  'Tether separation': {
    'Straight-Line': ['Commander Julian Bern', 'There. That’s my tether clipped to your suit. Take all the time you need to let go of that rail.'],
    'Orbital': ['Capt. Tommi Dylan', 'I spend all spring trying to get that much break on a pitch. Up here I get it for free.']
  },
  'Lateral drift': {
    'Straight-Line': ['Capt. Tommi Dylan', 'Safe at second. I’d get up and dust myself off, but I think I’ll hang on here a minute.'],
    'Orbital': ['Commander Julian Bern', 'You slid right past my window. Then I heard your glove ring the rail through the hull. Best sound I’ve heard all day, Tommi.']
  },
  'Wide separation': {
    'Straight-Line': ['Commander Julian Bern', 'Out there I could cover your suit with my thumb. It’s good to have to move over and make room for you again.'],
    'Orbital': ['Capt. Tommi Dylan', 'For a while there I had the whole station in my visor and no idea where we’d meet. Now I can read the part number on this rail. Give me a minute, Julian.']
  },
  'Random drift': {
    'Straight-Line': ['Commander Julian Bern', 'BOREX just called to ask if the server’s back up. I told them I got the technician back. They can hold.'],
    'Orbital': ['Capt. Tommi Dylan', 'Save that plot for me, Julian. Next time the folks back home ask what I fly, I’ve finally got something I can show them.']
  }
};

function showRescueCall(opening, mode) {
  const [speaker, line] = rescueCalls[opening][mode];
  const credit = document.createElement('span');
  credit.className = 'attribution';
  credit.textContent = '— ' + speaker;
  el('endCopy').replaceChildren('“' + line + '” ', credit);
}

const lessons=[
  {title:'First rescue',index:0,mode:'Straight-Line',soft:false},
  {title:'Trim an oblique miss',index:1,mode:'Straight-Line',soft:false},
  {title:'Brake for the bars',index:1,mode:'Straight-Line',soft:true},
  {title:'Read the orbital bend',index:0,mode:'Orbital',soft:false}
];
function beginLesson(i){
  const lesson=lessons[i];
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  start(lesson.index,lesson.mode,lesson.soft,0,true,i);
  visor.focus({preventScroll:true});
}
function scheduleHalfwayCheck(){
  const target=Flight.clearance(flight.initial.p)/2,nearest=flight.forecast.near;
  flight.checkAt=null;
  if(nearest.d>target || Flight.clearance(flight.pos.p)<=target)return;
  // First rescue flies Straight-Line. Clearance decreases up to the nearest pass.
  let lo=0,hi=nearest.t;
  for(let i=0;i<32;i++){
    const mid=(lo+hi)/2;
    if(Flight.clearance(Flight.motion(flight.anchor,mid,flight.mode).p)>target)lo=mid;else hi=mid;
  }
  flight.checkAt=flight.time+hi;
}
function updateLessonEnd(){
  const next=el('nextLesson'),i=flight.lesson;
  next.hidden=i===null || !lessons[i+1] || flight.done!=='capture';
  if(!next.hidden)next.textContent=lessons[i+1].title;
}
function updateLessonCue(){
  if(flight.lesson===null)return;
  const i=flight.lesson,h=flight.forecast.hits[flight.hitIndex];
  el('lessonTitle').textContent=lessons[i].title;
  const action=el('lessonAction');
  let cue='',label='';
  if(!flight.throws){
    const cues=[
      'Without a tether or thrusters, a drifting astronaut is presumed lost. Newton’s third law gives Tommi one last pitch. Fling a wrench away from the station as hard as you can and it pushes you back. For this gap, choose Face away and throw the heavier battery at 95%.',
      'Sideways drift carries across the station face. Try Face away and throw the 95% battery. Read the side and distance of the predicted miss, then line up a correction.',
      'This approach crosses the bars above the soft limit. Line up the practice pitch, then press Throw. Compare range rate with relative speed.',
      'Repeat the first rescue’s Face away battery pitch at 95%. Watch the coast bend in the rotating frame and compare its nearest pass with the straight return.'
    ];
    cue=cues[i];if(i===2){label='Line up practice pitch';if(flight.linedUp)cue='The 95% battery is lined up. Press Throw, then read the predicted entry speed.';}
  }else if(flight.checkAt!==null){
    cue='Find the station in the aft camera. Read Current coast to see where your recoil leads. The clock pauses for one course check.';
    label='Coast to halfway';
  }else if(h && (!flight.soft || Flight.softEnough(h.speed))){
    cue='The coast enters the full grab-bar envelope. Check the entry speed and coast to the grab.';label='Coast to grab';
  }else if(h){
    cue='The grab will be too fast. A pitch along the measured drift slows the suit. Line up the brake, then throw. To experience a fast pass, let the clock run and coast clear for another entry.';
    label='Line up brake';
  }else if(Flight.inside(flight.pos.p)&&flight.misses){
    cue='You are within reach. Throw along the measured drift to slow down for a grab, or coast through and return.';
  }else{
    const near=Flight.coastPass(flight.forecast,flight.age);
    const miss=near.t>flight.age?sub(near.p,near.bar):sub(flight.pos.p,Flight.nearest(flight.pos.p));
    cue=trimHint(miss,yaw,pitch)+' A light pitch that way pushes your suit back toward the bars. Line up a correction and check its tool and power.';
    label='Line up correction';
  }
  if(!running && flight.prepared===flight.throws && flight.throws){cue='Correction staged. Read the selected tool, bearing and recoil, then press Throw to resume at 1×.';label='';}
  if(!running && flight.noTrimAt===flight.time){cue='No single throw reaches a tested return from here. Aim a heavier pitch to reduce the miss, then check again.';label='';}
  if(flight.done)label='';
  if(el('lessonCue').textContent!==cue)el('lessonCue').textContent=cue;
  action.textContent=label;action.hidden=!label;
}
function storyCorrection(){
  const s=flight.pos,left=flight.limit-flight.time;
  const hit=flight.forecast.hits[flight.hitIndex];
  for(const i of rackOrder){
    if(!(flight.mask&(1<<i)))continue;
    const candidates=[];
    if(hit && flight.soft && !Flight.softEnough(hit.speed)){
      const magnitude=norm(s.v)-.068;
      if(magnitude>0)candidates.push(scale(unit(s.v),-magnitude));
    }else{
      for(const f of [.75,.9,.6,.45,.3])for(const fraction of [.85,.55,0]){
        candidates.push(Flight.transfer(s,scale(Flight.nearest(s.p),fraction),left*f,flight.mode));
      }
    }
    for(const dv of candidates){
      const command=Flight.command(dv,i,flight.mask);
      const next=Flight.applyCommand(s,command,flight.mask);
      const contacts=Flight.entries(next,left,flight.mode,Flight.inside(s.p)&&flight.misses>0,flight.soft);
      if(contacts.some(hit=>!flight.soft||Flight.softEnough(hit.speed)))return command;
    }
  }
}
function lessonAction(){
  if(!flight.story || flight.lesson===null || !canPitch())return;
  if(!sync()||flight.done)return;
  if(!flight.throws && flight.lesson===2){
    const [az,elev]=Flight.angles(flight.pos.p);
    setView(Flight.direction(az+14,elev));choose(5);changePower(95);flight.linedUp=true;
  }else if(flight.checkAt!==null){
    advance(Math.max(0,flight.checkAt-flight.time));
  }else{
    const h=flight.forecast.hits[flight.hitIndex];
    if(h && (!flight.soft || Flight.softEnough(h.speed))){
      advance(Math.max(0,h.t-flight.age)+1e-7);
    }else{
      freezeClock();
      const c=storyCorrection();
      if(c){choose(c.tool);changePower(c.power);setView(Flight.direction(c.az,c.el));flight.prepared=flight.throws;}
      else flight.noTrimAt=flight.time;
    }
  }
  dirty=true;instruments();
}
function requestFirstRescue(){
  sync();
  if(started&&!flight.done){freezeClock();el('confirmRescue').showModal();return;}
  beginLesson(0);
}
el('storyEntry').onclick=requestFirstRescue;
el('replayLesson').onclick=requestFirstRescue;
el('replaceFlight').onclick=()=>beginLesson(0);
el('nextLesson').onclick=()=>beginLesson(flight.lesson+1);
el('lessonAction').onclick=lessonAction;
el('skipLesson').onclick=()=>{
  if(!flight.story||flight.lesson===null||!canPitch())return;
  if(!sync()||flight.done)return;
  flight.lesson=null;flight.checkAt=null;flight.story=false;flight.skippedGuidance=true;
  el('assists').hidden=true;el('storyTag').hidden=true;el('lesson').hidden=true;
  invalidateInput();if(!running)pause();
  setMsg('Guidance off. Each tool has one release left. This rescue counts as assisted. Retry for a manual score.');updateRack();instruments();
};
