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
  'Dodgeball Challenge': {
    'Straight-Line': ['Commander Julian Bern', 'I saw the cover go by. Then the frame. Been waiting for the one thing out there I actually wanted to catch. Welcome back, Tommi.'],
    'Orbital': ['Capt. Tommi Dylan', 'That frame broke across the plate just like I thought it would. Thanks for keeping a hand on home, Julian.']
  },
  'Random drift': {
    'Straight-Line': ['Commander Julian Bern', 'BOREX just called to ask if the server’s back up. I told them I got the technician back. They can hold.'],
    'Orbital': ['Capt. Tommi Dylan', 'Save that plot for me, Julian. Next time the folks back home ask what I fly, I’ve finally got something I can show them.']
  },
  'Random Dodgeball': {
    'Straight-Line': ['Capt. Tommi Dylan', 'I could hear you holding your breath when that cover went past, Julian. You can let it out now. I’ve got the rail.'],
    'Orbital': ['Commander Julian Bern', 'From this window it looked like you and that frame were headed for the same spot. Then it sailed past, and there was your glove. Welcome home.']
  }
};

function showRescueCall(opening, mode) {
  const [speaker, line] = rescueCalls[opening][mode];
  const credit = document.createElement('span');
  credit.className = 'attribution';
  credit.textContent = '— ' + speaker;
  el('endCopy').replaceChildren('“' + line + '” ', credit);
}

const lossCalls = {
  oxygen: {
    opening: 'The oxygen reserve ticks down to zero as Commander Bern crackles over the radio.',
    maneuver: 'The suit is already gently pushing her to intercept.',
    call: "Looks like you'll be back on station with time to spare."
  },
  stranded: {
    opening: 'Tommi watches the last tool tumble away. Commander Bern comes over the radio.',
    maneuver: 'A short burst from the suit puts the grab bars back on her flight path.',
    call: "Your new track takes you right to the bars. I'll meet you there."
  },
  overspeed: {
    opening: 'The grab speed on Commander Bern’s display is still in the red when he keys the radio.',
    maneuver: 'The suit is already decelerating her to a safe intercept speed.',
    call: "Looks like you're heading for a successful capture after all."
  }
};

function showLossCall(result) {
  const {opening, maneuver, call} = lossCalls[result];
  el('lossOpening').textContent = opening;
  el('lossManeuver').textContent = maneuver;
  el('lossCall').textContent = call;
}

const lessons=[
  {title:'First rescue',index:0,mode:'Straight-Line',soft:false,
    cue:'Without a tether or thrusters, a drifting astronaut is presumed lost. Newton’s third law gives Tommi one last pitch. Fling a wrench away from the station as hard as you can and it pushes you back. For this gap, choose Face away and throw the heavier battery at 95%.'},
  {title:'Trim an oblique miss',index:1,mode:'Straight-Line',soft:false,
    cue:'Sideways drift carries across the station face. Try Face away and throw the 95% battery. Read the side and distance of the predicted miss, then line up a correction.'},
  {title:'Brake for the bars',index:1,mode:'Straight-Line',soft:true,
    cue:'This approach crosses the bars above the soft limit. Line up the practice pitch, then press Throw. Compare range rate with relative speed.'},
  {title:'Read the orbital bend',index:0,mode:'Orbital',soft:false,
    cue:'Repeat the first rescue’s Face away battery pitch at 95%. Watch the coast bend in the rotating frame and compare its nearest pass with the straight return.'}
];
function beginLesson(i){
  const lesson=lessons[i];
  for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  start(lesson.index,lesson.mode,lesson.soft,0,true,i);
  visor.focus({preventScroll:true});
}
function scheduleHalfwayCheck(){
  const target=Flight.clearance(flight.initial.p,flight.pose)/2,nearest=flight.forecast.near;
  flight.checkAt=null;
  if(nearest.d>target || Flight.clearance(flight.pos.p,flight.pose)<=target)return;
  // First rescue flies Straight-Line. Clearance decreases up to the nearest pass.
  let lo=0,hi=nearest.t;
  for(let i=0;i<32;i++){
    const mid=(lo+hi)/2;
    if(Flight.clearance(Flight.motion(flight.anchor,mid,flight.mode).p,flight.pose)>target)lo=mid;else hi=mid;
  }
  flight.checkAt=flight.time+hi;
}
function updateLessonEnd(){
  const next=el('nextLesson'),i=flight.lesson;
  next.hidden=i===null || !lessons[i+1] || flight.done!=='capture';
  if(!next.hidden)next.title='Next lesson · '+lessons[i+1].title;
}
function stagedPitchMatches(){
  const staged=flight.stagedPitch;
  return !!staged && staged.yaw===yaw && staged.pitch===pitch && staged.tool===selected &&
    staged.power===power && staged.time===flight.time;
}
function updateLessonCue(status=Flight.coastStatus(flight)){
  if(flight.lesson===null)return;
  const i=flight.lesson,staged=stagedPitchMatches();
  writeText(el('lessonTitle'),lessons[i].title);
  const action=el('lessonAction');
  let cue='',label='';
  if(status.kind==='finished'){
    cue=flight.done==='capture'?'Grab bars secured.':'Flight over. Retry from the debrief.';
    if(flight.done==='capture' && lessons[i+1])cue+=' Open the debrief for the next lesson.';
  }else if(!flight.throws){
    cue=lessons[i].cue;
    if(i===2){
      label='Line up practice pitch';
      if(staged)cue='The 95% battery is lined up. Press Throw, then read the predicted entry speed.';
    }
  }else if(staged && !running){
    cue=flight.stagedPitch.partial
      ?'Battery lined up at full power. Throw to counter the drift, then line up another correction.'
      :'Correction staged. Read the selected tool, bearing and recoil, then press Throw to resume at 1×.';
  }else if(flight.checkAt!==null){
    cue='Find the station in the aft camera. Read Current coast to see where your recoil leads. The clock pauses for one course check.';
    label='Coast to halfway';
  }else if(status.kind==='grab'){
    cue='The coast enters the full grab-bar envelope. Check the entry speed and coast to the grab.';label='Coast to grab';
  }else if(status.kind==='fastEntry'){
    cue='This coast reaches the bars above the Soft limit. Aim along your drift and brake in the last 30 seconds before entry. Choose Line up brake to stage the pitch. You can also coast through to practice a slower return.';
    label='Line up brake';
  }else if(status.kind==='inside'){
    cue='You are within reach. Throw along the measured drift to slow down for a grab, or coast through and return.';
    label='Line up brake';
  }else{
    const near=status.near;
    const miss=near.t>flight.age?sub(near.p,near.bar):sub(flight.pos.p,Flight.nearest(flight.pos.p,flight.pose));
    const advice=status.kind==='receding'?'A heavy pitch can counter your outward drift.':'A pitch that way nudges your suit back toward the bars.';
    cue=[trimHint(miss,yaw,pitch),advice,'Line up a correction and check its tool and power.'].filter(Boolean).join(' ');
    label='Line up correction';
  }
  writeText(el('lessonCue'),cue);
  writeText(action,label);action.hidden=!label;
}
function storyCorrection(){
  const s=flight.pos,left=flight.limit-flight.time;
  const hit=flight.forecast.hits[flight.hitIndex];
  for(const i of rackOrder){
    if(!(flight.mask&(1<<i)))continue;
    const candidates=[];
    if(flight.soft && (hit ? !Flight.softEnough(hit.speed,flight.soft) : Flight.inside(s.p,flight.pose))){
      const magnitude=norm(s.v)-(Flight.captureLimit(flight.soft)-.012);
      if(magnitude>0)candidates.push(scale(unit(s.v),-magnitude));
    }else{
      for(const f of [.75,.9,.6,.45,.3])for(const fraction of [.85,.55,0]){
        candidates.push(Flight.transfer(s,scale(Flight.nearest(s.p,flight.pose),fraction),left*f,flight.mode));
      }
    }
    for(const dv of candidates){
      const command=Flight.command(dv,i,flight.mask);
      const next=Flight.applyCommand(s,command,flight.mask);
      const contacts=Flight.entries(next,left,flight.mode,Flight.inside(s.p,flight.pose)&&flight.misses>0,flight.soft,flight.pose);
      if(contacts.some(entry=>Flight.canGrab(entry,flight.soft)))return command;
    }
  }
  // Story reloads the battery. Aim its strongest impulse toward an intercept,
  // then plan the next pitch from the resulting measured coast.
  if(flight.story && left>0){
    const dv=Flight.transfer(s,Flight.nearest(s.p,flight.pose),left*.8,flight.mode);
    return {...Flight.command(dv,5,flight.mask),power:100,partial:true};
  }
}
function stageLessonPitch(partial=false){
  flight.stagedPitch={yaw,pitch,tool:selected,power,time:flight.time,partial};
}
function lessonAction(){
  if(!flight.story || flight.lesson===null || !canPitch())return;
  if(!sync()||flight.done)return;
  if(!flight.throws && flight.lesson===2){
    const [az,elev]=Flight.angles(flight.pos.p);
    setView(Flight.direction(az+14,elev));choose(5);changePower(95);stageLessonPitch();
  }else if(flight.checkAt!==null){
    advance(Math.max(0,flight.checkAt-flight.time));
  }else{
    const h=flight.forecast.hits[flight.hitIndex];
    if(h && Flight.canGrab(h,flight.soft)){
      advance(Math.max(0,h.t-flight.age)+1e-7);
    }else{
      freezeClock();
      const c=storyCorrection();
      if(c){
        choose(c.tool);changePower(c.power);setView(Flight.direction(c.az,c.el));
        stageLessonPitch(c.partial);
      }
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
  flight.lesson=null;flight.checkAt=null;flight.stagedPitch=null;flight.story=false;flight.skippedGuidance=true;
  el('away').hidden=el('toStation').hidden=true;el('storyTag').hidden=true;el('lesson').hidden=true;
  invalidateInput();if(!running)pause();
  setMsg('Guidance off. Each tool has one release left. This rescue counts as assisted. Retry for a manual score.');updateRack();instruments();
};
