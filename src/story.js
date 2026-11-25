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
  if(i===0)el('brief').textContent='Capt. Tommi Dylan (she/they) broke Mach 10 in the classified SR-73. Today their tether parted and the prototype suit’s thruster valves stuck closed.';
  visor.focus({preventScroll:true});
}
function scheduleLessonCheck(){
  if(flight.lesson===null || flight.checked)return;
  const nearest=flight.forecast.near.t;
  let delay=nearest/2;
  if(flight.lesson===0 && flight.forecast.hits.length){
    // Stop when half the original clearance remains, including on a fast clock.
    const target=Flight.clearance(flight.initial.p)/2;
    let lo=0,hi=nearest;
    for(let i=0;i<32;i++){
      const mid=(lo+hi)/2;
      if(Flight.clearance(Flight.motion(flight.anchor,mid,flight.mode).p)>target)lo=mid;else hi=mid;
    }
    delay=hi;
  }
  if(flight.lesson===2 && flight.forecast.hits.length)delay=Math.max(0,nearest-18);
  flight.checkAt=flight.time+delay;
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
      'Choose Face away, then throw the 95% battery. Its heavier recoil covers this gap. Watch the tool leave the crosshair and the station approach in the aft camera. Saturday pitching practice finally pays off.',
      'Sideways drift carries across the station face. Try Face away and throw the 95% battery. Read the side and distance of the predicted miss before the course check.',
      'This approach crosses the bars above the soft limit. Line up the practice pitch, then press Throw. Compare range rate with relative speed.',
      'Repeat the first rescue’s Face away battery pitch at 95%. Watch the coast bend in the rotating frame and compare its nearest pass with the straight return.'
    ];
    cue=cues[i];if(i===2){label='Line up practice pitch';if(flight.linedUp)cue='The 95% battery is lined up. Press Throw, then read the predicted entry speed.';}
  }else if(!flight.checked){
    cue='Find the station in the aft camera. Read Current coast to see where your recoil leads. The clock pauses for one course check.';
    label='Coast to check';
  }else if(h && (!flight.soft || h.speed<=Flight.limit)){
    cue='The coast enters the full grab-bar envelope. Check the entry speed and keep the remaining tools aboard.';label='Coast to grab';
  }else if(h){
    cue='The grab will be too fast. A pitch along the measured drift slows the suit. Line up the brake, then throw. To experience a fast pass, resume without braking and coast clear for another entry.';
    label='Line up brake';
  }else if(Flight.inside(flight.pos.p)&&flight.misses){
    cue='Still flying through the bars. Resume to clear the envelope before setting up another grab.';
  }else{
    cue='Read which side you will miss on and compare the two views. A light pitch toward the miss can move your suit back toward the bars. Line up a correction, inspect its tool and power, then throw.';
    label='Line up correction';
  }
  if(!running && flight.prepared===flight.throws && flight.throws){cue='Correction staged. Read the selected tool, bearing and recoil, then press Throw to resume at 1×.';label='';}
  if(flight.noTrim){cue='No single remaining tool reaches a tested return from here. Aim a heavier pitch to reduce the miss, then check again.';label='';}
  if(flight.done)label='';
  el('lessonCue').textContent=cue;action.textContent=label;action.hidden=!label;
}
function storyCorrection(){
  const s=flight.pos,left=flight.limit-flight.time;
  const hit=flight.forecast.hits[flight.hitIndex];
  for(const [i] of Flight.gear.entries()){
    if(!(flight.mask&(1<<i)))continue;
    const candidates=[];
    if(hit && flight.soft && hit.speed>Flight.limit){
      const magnitude=norm(s.v)-.068;
      if(magnitude>0)candidates.push(scale(unit(s.v),-magnitude));
    }else{
      for(const f of [.75,.9,.6,.45,.3])for(const fraction of [.85,.55,0]){
        candidates.push(Flight.transfer(s,scale(Flight.nearest(s.p),fraction),left*f,flight.mode));
      }
    }
    for(const dv of candidates){
      const command=Flight.command(s,dv,i,flight.mask);
      const next=Flight.applyCommand(s,command,flight.mask);
      const entry=Flight.entries(next,left,flight.mode,Flight.inside(s.p)&&flight.misses>0)[0];
      if(entry && (!flight.soft||entry.speed<=Flight.limit))return command;
    }
  }
}
function lessonAction(){
  if(!flight.story || flight.lesson===null || !canPitch())return;
  sync();if(flight.done)return;
  if(!flight.throws && flight.lesson===2){
    const [az,elev]=Flight.angles(flight.pos.p);
    setView(Flight.direction(az+14,elev));choose(5);changePower(95);flight.linedUp=true;
  }else if(flight.checkAt!==null){
    advance(Math.max(0,flight.checkAt-flight.time));
  }else{
    const h=flight.forecast.hits[flight.hitIndex];
    if(h && (!flight.soft || h.speed<=Flight.limit)){
      advance(Math.max(0,h.t-flight.age)+1e-7);
    }else{
      freezeClock();
      const c=storyCorrection();
      if(c){choose(c.tool);changePower(c.power);setView(Flight.direction(c.az,c.el));flight.prepared=flight.throws;}
      else flight.noTrim=true;
    }
  }
  dirty=true;instruments();
}
el('storyEntry').onclick=()=>beginLesson(0);
el('replayLesson').onclick=()=>beginLesson(0);
el('nextLesson').onclick=()=>beginLesson(flight.lesson+1);
el('lessonAction').onclick=lessonAction;
el('skipLesson').onclick=()=>{
  if(!flight.story||flight.lesson===null||!canPitch())return;
  sync();if(flight.done)return;
  flight.lesson=null;flight.checkAt=null;flight.story=false;flight.limit=Flight.manualReserve;
  reseat(Flight.inside(flight.pos.p)&&flight.misses>0);
  el('assists').hidden=true;el('storyTag').hidden=true;el('lesson').hidden=true;
  invalidateInput();if(!running)pause();
  setMsg('Manual flight. The reserve now runs to 10:00 elapsed. Aim and release on the live clock.');updateRack();instruments();
};
start(0,'Straight-Line',false);requestAnimationFrame(frame);
