(() => {
  const passed=[],errors=[],rects={};
  const eq=(v,msg)=>{if(!v)throw Error(msg);};
  const close=(a,b,tol=1e-7)=>eq(Math.abs(a-b)<tol,a+' ≠ '+b);
  const click=id=>el(id).click();
  const set=(id,value)=>{el(id).value=value;el(id).dispatchEvent(new Event('input',{bubbles:true}));};
  const keys=(key,shiftKey=false,target=visor,repeat=false)=>target.dispatchEvent(new KeyboardEvent('keydown',{key,shiftKey,repeat,bubbles:true,cancelable:true}));
  const pointer=(target,type,id,x=20,y=20)=>target.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:id%2?'mouse':'touch',clientX:x,clientY:y,bubbles:true,button:0,detail:type==='click'?1:0,cancelable:true}));
  function test(name,fn){
    try{fn();passed.push(name);}catch(e){errors.push(name+' / '+e.stack);}
    for(const d of document.querySelectorAll('dialog[open]'))d.close();
  }
  function enterLesson(id){
    click(id);if(el('confirmRescue').open)click('replaceFlight');
  }
  function configure(index,mode,soft=false,story=false){
    click('new');el('scenario').value=index;el('scenario').dispatchEvent(new Event('change'));
    document.querySelector('input[name=model][value="'+mode+'"]').checked=true;
    el('soft').checked=soft;if(index===3)el('seed').value='00019919';
    el('storyMode').checked=story;el('setupForm').requestSubmit();
  }
  function aim(az,elv){
    const d=(az-yaw+540)%360-180;
    for(let j=0;j<Math.round(Math.abs(d)*4);j++)keys(d>0?'ArrowLeft':'ArrowRight',true);
    const e=elv-pitch;
    for(let j=0;j<Math.round(Math.abs(e)*4);j++)keys(e>0?'ArrowUp':'ArrowDown',true);
  }
  test('Manual first pitch requires a live clock',()=>{
    const original=yaw;keys('ArrowLeft');click('away');click('throw');set('power',10);
    eq(yaw===original&&power===95&&!flight.throws&&!started,'staged input');
    click('pause');eq(running&&started,'begin');
    click('away');eq(original===yaw&&el('assists').hidden,'manual snap gated');
    keys('ArrowLeft');eq(yaw!==original,'live aim');keys('p');eq(!running,'P pause');keys('p',false,visor,true);eq(!running,'P held');
  });
  test('Mouse, touch and keyboard gestures cannot cross a pause',()=>{
    configure(0,'Straight-Line');
    pointer(visor,'pointerdown',8);pointer(visor,'pointermove',8,54,41);
    pointer(el('power'),'pointerdown',11);pointer(el('throw'),'pointerdown',7);keys('p');const before=[yaw,pitch,power,selected];
    pointer(visor,'pointermove',8,90,80);keys('ArrowLeft');keys('3');keys(']');keys('Enter');
    set('power',15);click('tool2');click('throw');eq(!flight.throws,'paused release');
    pointer(el('throw'),'pointerdown',9);keys('p');
    set('power',20);pointer(el('power'),'pointerup',11);set('power',25);
    pointer(visor,'pointerup',8,110,140);pointer(el('throw'),'pointerup',7);pointer(el('throw'),'click',7);
    pointer(el('throw'),'pointerup',9);pointer(el('throw'),'click',9);
    keys('ArrowLeft',false,visor,true);keys(']',false,visor,true);keys('Enter',false,visor,true);
    eq(JSON.stringify(before)===JSON.stringify([yaw,pitch,power,selected])&&!flight.throws,'held input crossed resume');
    pointer(el('throw'),'pointerdown',4);pointer(el('throw'),'pointerup',4);pointer(el('throw'),'click',4);pointer(el('throw'),'click',4);
    eq(flight.throws===1,'fresh click exactly once');
  });
  test('Guide, setup and hidden tab suspend controls',()=>{
    configure(1,'Orbital');
    for(const [button,dialog] of [['manual','guide'],['new','setup']]){
      pointer(visor,'pointerdown',3);click(button);const before=yaw;
      eq(!running&&el(dialog).open,'dialog');keys('p');throwTool();snap(flight.pos.v);eq(!flight.throws&&yaw===before,'action gate');
      el(dialog).querySelector('.close').click();eq(!running,'explicit resume');
      click('pause');pointer(visor,'pointerup',3,200,70);eq(before===yaw,'late pointer');
    }
    pointer(el('throw'),'pointerdown',5);
    Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
    eq(!running,'tab hidden');keys('p');delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));
    eq(!running,'tab return stays paused');click('pause');pointer(el('throw'),'pointerup',5);pointer(el('throw'),'click',5);eq(!flight.throws,'stale tab click');
  });
  test('Pause marks both cameras and highlights Resume',()=>{
    const flag=el('paused'),button=el('pause');
    function check(paused){
      eq((getComputedStyle(flag).display!=='none')===paused,'pause label visibility');
      eq((getComputedStyle(button).boxShadow!=='none')===paused,'resume glow');
      for(const canvas of [visor,aft]){
        eq((getComputedStyle(canvas).filter==='grayscale(1)')===paused,'camera '+canvas.id);
        const veil=getComputedStyle(canvas.parentElement,'::after');
        eq((veil.content!=='none')===paused,'bright veil '+canvas.id);
        if(paused)eq(veil.pointerEvents==='none','visor input passes through the overlay');
      }
      if(paused)eq(button.textContent==='Resume'&&parseFloat(getComputedStyle(flag).fontSize)>=28,'prominent pause label');
    }
    configure(0,'Straight-Line');check(false);keys('p');check(true);click('pause');check(false);
    enterLesson('storyEntry');check(false);click('away');click('throw');click('lessonAction');check(true);
    const r=visor.getBoundingClientRect(),midX=r.left+r.width/2,midY=r.top+r.height/2;
    eq(!el('pausedLineup').hidden&&flag.getBoundingClientRect().bottom<midY,'Story reticle stays clear');
    eq(document.elementFromPoint(midX,midY)===visor,'Story visor receives input');
    click('lessonAction');eq(flight.done==='capture','coast to debrief');check(false);
  });
  test('Cockpit rectangles, hit targets and keyboard focus',()=>{
    configure(0,'Straight-Line');scrollTo(0,0);
    for(const id of ['forward','aft','tool0','tool1','tool2','tool3','tool4','tool5','tool6','tool7','tool8','clockRate','power','throw','coast','advice','speedGauge','speedRef','pause']){
      const node=el(id),r=node.getBoundingClientRect();
      if(['forward','tool0','power','throw','advice'].includes(id))rects[id]=[r.x,r.y,r.width,r.height].map(Math.round);
      eq(r.width>=24&&r.height>0&&r.left>=0&&r.right<=innerWidth+.01&&r.top>=0&&r.bottom<=innerHeight+.01,id+' viewport '+JSON.stringify(r));
      if(!['aft','coast','advice','speedGauge','speedRef'].includes(id)){
        eq(r.height>=24&&node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),id+' hit target');
        node.focus();eq(document.activeElement===node&&scrollY===0,id+' keyboard focus scroll');
      }
    }
    eq(document.documentElement.scrollWidth<=innerWidth,'horizontal overflow');
    click('tool2');keys('ArrowLeft');set('power',73);click('throw');instruments();
    eq(el('tool2').disabled&&el('tool2').textContent.includes('Released')&&el('budget').textContent.includes(Flight.budgets[flight.mask].toFixed(3)),'rack budget');
    eq(el('advice').getBoundingClientRect().bottom<=innerHeight&&scrollY===0,'read coast');
  });
  test('Story bearings, paused lineup and historical battery',()=>{
    for(const mode of ['Straight-Line','Orbital']){
      configure(0,mode,false,true);eq(!running&&!started&&!el('assists').hidden,'Story staged');
      click('away');click('throw');eq(running&&flight.throws===1,'release starts Story');keys('p');
      keys('ArrowLeft');click('prograde');close(dot(Flight.direction(yaw,pitch),unit(flight.pos.v)),1);
      if(mode==='Straight-Line'){close(flight.forecast.hits[0].t,358.82173,.001);advance(flight.limit);eq(flight.done==='capture','baseline contact');click('retry');}
      else{close(flight.forecast.near.d,4.51749,.001);click('throw');eq(running&&flight.throws===2,'paused release resumes');}
    }
  });
  test('Tablet rack, landscape oxygen and narrow headers display complete labels',()=>{
    configure(0,'Straight-Line');
    const frame=window.frameElement,original=frame.style.cssText;
    const textRect=node=>{const range=document.createRange();range.selectNodeContents(node);return range.getBoundingClientRect();};
    try{
      for(const [w,h] of [[768,1024],[1024,768],[844,390],[360,640],[320,568]]){
        frame.style.width=w+'px';frame.style.height=h+'px';frame.getBoundingClientRect();
        const root=document.documentElement;
        eq(innerWidth===w&&root.scrollWidth<=innerWidth,'layout width at '+w+' actual '+root.scrollWidth);
        for(const b of document.querySelectorAll('.headerActions button'))eq(b.getBoundingClientRect().right<=root.clientWidth,'visible header button '+w);
        if(w===768||w===1024){
          for(const n of document.querySelectorAll('.tool b,.tool small')){
            eq(n.scrollWidth<=n.clientWidth+1&&textRect(n).right<=n.closest('button').getBoundingClientRect().right,'complete '+n.textContent+' at '+w);
          }
          const values=[...document.querySelectorAll('.velocity dd')].map(n=>n.getBoundingClientRect().top);
          eq(Math.max(...values)-Math.min(...values)<1,'aligned velocity values');
          click('tool0');click('throw');const released=el('tool0').querySelector('small');
          eq(released.textContent==='Released'&&released.scrollWidth<=released.clientWidth,'released label');
        }
        if(w===844){
          const oxygenLabel=el('oxygen').previousElementSibling;
          eq(textRect(oxygenLabel).right<=oxygenLabel.closest('.metrics').getBoundingClientRect().right,'full oxygen caption');
        }
      }
    }finally{frame.style.cssText=original;}
  });
  const named=[
    [[[5,-62,14,94]],[[3,-44,-5,99]],[[5,-55,13,100],[2,-56,12,96]]],
    [[[5,-62,14,94]],[[3,-44,-5,99]],[[5,-55,13,100],[1,-54,13,85]]],
    [[[5,-38,11,100]],[[5,-34,-6,85]],[[5,-32,11,100],[3,-31,10,78]]],
    [[[5,-38,11,100]],[[5,-34,-6,85]],[[5,-28,10,100],[2,-29,11,97]]]
  ];
  for(let k=0;k<4;k++)for(let idx=0;idx<3;idx++)test('Named capture '+k+'/'+idx,()=>{
    configure(idx,k<2?'Straight-Line':'Orbital',!!(k%2));
    for(const [i,[tool,az,elv,pct]] of named[k][idx].entries()){
      if(i)advance(4);aim(az,elv);click('tool'+tool);set('power',pct);click('throw');
    }
    advance(flight.limit);eq(flight.done==='capture','reachable via ordinary aim and power controls');
    if(k%2)eq(norm(flight.pos.v)<=.080000001,'soft capture');
    click('retry');
  });

  test('Seed reuse and expiry',()=>{
    configure(3,'Orbital',true);const p=flight.pos.p.join(',');advance(flight.limit);
    eq(flight.done==='oxygen','expiry');click('viewLog');eq(el('logSummary').textContent.includes('00019919')&&el('logThrows').textContent.includes('No tools'),'seeded log');
    el('flightLog').querySelector('.close').click();click('retry');eq(flight.pos.p.join(',')===p,'retry seed');
    configure(3,'Straight-Line');eq(flight.pos.p.join(',')===p,'same model-independent start');
  });
  function fixture(mode,soft,p,v){
    configure(0,mode,soft,true);
    flight.initial={...flight.initial,p:p.slice(),v:v.slice()};flight.pos={p:p.slice(),v:v.slice()};reseat();click('pause');
  }
  test('Read a cross-track miss in the log and both visor directions',()=>{
    fixture('Straight-Line',true,[0,-15,10],[0,.07,0]);
    for(const [az,e] of [[90,0],[-90,0],[70,12],[0,90],[160,-30]]){
      advance(.01);Visor.render(visor,az,e,flight);Visor.render(aft,az+180,-e,flight,true);
    }
    advance(flight.limit);const {segments,closest}=FlightLog.reconstruct(flight),grid=FlightLog.layout(segments);
    close(closest,3);const crossing=[0,0,10];close(grid.project(crossing,0)[1],grid.cy);
    eq(grid.project(crossing,2)[1]<grid.cy-7*grid.scale,'cross-track trace clears projected envelope');
    click('viewLog');eq(el('logPanes').querySelectorAll('svg').length===2&&el('logSummary').textContent.includes('3.00 m'),'log rendered');
  });
  test('Step through four playable lessons, with a light trim and a brake',()=>{
    enterLesson('storyEntry');scrollTo(0,0);
    for(const id of ['forward','tool5','power','throw','advice','lessonCue','skipLesson']){
      const r=el(id).getBoundingClientRect();eq(r.top>=0&&r.bottom<=innerHeight,id+' staged lesson viewport '+JSON.stringify(r));
    }
    for(let i=0;i<4;i++){
      eq(flight.lesson===i&&!started,'fresh lesson '+i);
      eq(el('oxygen').textContent==='10:00','full oxygen at the start of lesson '+i);
      click(i===2?'lessonAction':'away');click('throw');
      if(i===1||i===3)eq(!flight.forecast.hits.length&&flight.forecast.near.d>1,'oblique/curved miss');
      if(i===2)eq(flight.forecast.hits[0].speed>Flight.limit,'approach too fast');
      click('lessonAction');eq(flight.checked&&!running,'course check');
      if(i===0){const r=el('lessonAction').getBoundingClientRect();eq(r.top>=0&&r.bottom<=innerHeight,'halfway action visible');}
      if(i===0)close(Flight.clearance(flight.pos.p),Flight.clearance(flight.initial.p)/2,.0001);
      if(i>0){
        click('lessonAction');eq(flight.prepared===flight.throws,'staged correction '+i);
        if(i===1)eq(Flight.gear[selected].mass<=1.2,'light correction');
        if(i===2)eq(dot(Flight.direction(yaw,pitch),unit(flight.pos.v))>.999,'brake measured drift');
        click('throw');
      }
      click('lessonAction');eq(flight.done==='capture'&&el('endCopy').textContent.includes('Upmass Hero'),'lesson '+i+' outcome '+flight.done+' / '+el('endCopy').textContent+' / '+el('lessonCue').textContent);
      if(i<3)click('nextLesson');
    }
    click('retry');click('skipLesson');eq(!flight.story&&running&&el('lesson').hidden,'manual handover');
    click('manual');enterLesson('replayLesson');eq(flight.lesson===0 && !started,'replay');
  });
  function tick(seconds,multiplier){
    rate=multiplier;
    while(seconds>1e-9&&!flight.done){
      const dt=Math.min(seconds,multiplier/4);sync(lastTime+dt/multiplier*1000);seconds-=dt;
    }
  }
  test('A legacy mouse click consumes the matching completed gesture once',()=>{
    configure(0,'Straight-Line',false,true);
    const legacy=button=>button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
    function release(button,id){pointer(button,'pointerdown',id);pointer(button,'pointerup',id);}
    const tool=el('tool0'),button=el('throw');
    release(tool,2);legacy(tool);eq(selected===0,'touch id 2 selects a slot');
    release(el('away'),0);legacy(el('away'));close(dot(Flight.direction(yaw,pitch),unit(flight.pos.p)),1);
    release(button,0);legacy(button);legacy(button);eq(flight.throws===1,'mouse id 0, no replay');
    release(button,4);pointer(button,'click',1);eq(flight.throws===2,'touch click relabelled as mouse');
    release(button,6);click('pause');click('pause');legacy(button);
    eq(flight.throws===2,'gesture invalidated across pause and resume');
    release(tool,8);legacy(button);eq(flight.throws===2,'different target');
    enterLesson('storyEntry');click('away');click('throw');release(el('lessonAction'),2);legacy(el('lessonAction'));
    eq(flight.checked&&!running,'legacy tap on lesson action');
  });
  test('A brake inside the bars captures immediately, including with the last tool',()=>{
    for(const last of [false,true]){
      configure(0,'Straight-Line',true);
      const fire=(i,p,v)=>{choose(i);changePower(p);setView(v);click('throw');};
      fire(5,100,flight.pos.p);fire(4,100,flight.pos.p);advance(flight.forecast.hits[0].t+4);
      eq(flight.misses===1&&Flight.inside(flight.pos.p),'inside after the fast entry');
      if(last){
        [6,0,1,2,7,3].forEach((i,k)=>fire(i,10,[0,0,k%2?1:-1]));
        fire(8,100,flight.pos.v);
      }else{
        fire(8,100,flight.pos.v);
        if(!flight.done)fire(3,100,flight.pos.v);
      }
      eq(flight.done==='capture'&&Flight.softEnough(norm(flight.pos.v)),'grab on release');
      eq((flight.mask===0)===last&&flight.misses===1,'correct remaining gear and entry count');
      close(flight.time,flight.log.releases.at(-1).time);click('viewLog');
      eq(el('logSummary').textContent.includes('Grab speed'),'log shows actual grab speed');
      el('flightLog').close();el('debrief').close();
    }
  });
  test('Orbital coast slows inside the bars at the same instant on either clock',()=>{
    for(const speed of [1,30]){
      fixture('Orbital',true,[0,-1.61,1],[0,.005,.08]);flight.mask=0;
      const [entry,grab]=flight.forecast.hits;
      eq(entry.speed>.0801&&grab.t>40&&grab.t<45,'distinct fast entry and later grab');
      tick(10,speed);eq(flight.misses===1&&!flight.done,'empty rack can still coast to a grab');
      tick(50,speed);eq(flight.done==='capture','coast captured');
      close(flight.time,43.847571664,1e-6);close(norm(flight.pos.v),Flight.limit);
      el('debrief').close();
    }
  });
  test('First rescue protects a live flight and manual retry matches setup after skipping',()=>{
    configure(1,'Orbital');click('throw');const original=flight;
    for(const id of ['storyEntry','replayLesson']){
      if(id==='replayLesson')click('manual');
      click(id);eq(el('confirmRescue').open&&!running&&flight===original,'requires confirmation');
      el('confirmRescue').querySelector('.close').click();
      if(id==='replayLesson')el('guide').querySelector('.close').click();
      eq(flight===original&&flight.throws===1&&!running,'cancel preserves history and pause');
    }
    click('storyEntry');click('replaceFlight');eq(flight.lesson===0&&!started,'confirmed lesson');
    click('skipLesson');const position=flight.pos.p.slice();advance(600);click('retry');
    eq(running&&!flight.story&&norm(sub(flight.initial.p,position))>0,'manual retry uses standard geometry');
    const retried=JSON.stringify(flight.initial);click('new');el('setupForm').requestSubmit();
    eq(running&&JSON.stringify(flight.initial)===retried,'setup reproduces retry');
  });
  test('Boundary values, singles and replay labels agree with the flight',()=>{
    fixture('Straight-Line',true,[0,-3,0],[0,.0803,0]);instruments();
    eq(el('coast').textContent.includes('Fast')&&el('advice').textContent.includes('0.0803'),'fast preview');
    advance(flight.forecast.hits[0].t+.1);eq(el('message').textContent.includes('0.0803'),'fast entry');
    flight.pos.v=[-.00004,.000003,0];instruments();
    eq(el('velX').textContent==='+0.0000'&&!el('rate').textContent.startsWith('-0.000'),'rounded zero');
    eq(Readout.heading(-.001,2)==='0.00'&&Readout.heading(-720.001,2)==='0.00','wrapped rounded headings');
    eq(Readout.speed(.0800001)!=='0.080'&&Readout.speed(.08)==='0.080','threshold detail');
    eq(Readout.count(1,'fast pass','fast passes')==='1 fast pass'&&Readout.count(1,'throw')==='1 throw','singular');
    fixture('Straight-Line',true,[0,-1.7,0],[0,.09,0]);advance(2);
    choose(6);changePower(100);setView(flight.pos.v);click('throw');
    eq(flight.done==='capture','single brake after one fast entry');
    const card=document.createElement('div');card.innerHTML=FlightLog.card(flight);
    const challenge=card.querySelector('desc').textContent;
    eq(challenge.includes('1 throw ·')&&challenge.endsWith('1 fast pass'),'singular challenge text');
    el('debrief').close();
    configure(3,'Orbital');eq(el('seedTag').textContent.startsWith('Copy replay'),'correct action label');
    click('throw');advance(600);eq(el('advice').textContent.includes('1 tool released'),'singular coast');
  });
  test('Keyboard aim restores full detail and a real-time stall pauses at 30×',()=>{
    configure(0,'Straight-Line');
    let keyError=false;const onError=()=>{keyError=true;};
    window.addEventListener('error',onError);document.dispatchEvent(new Event('keydown'));window.removeEventListener('error',onError);
    eq(!keyError,'key-less event is ignored');
    keys('ArrowLeft');keys('ArrowLeft',false,visor,true);eq(flight.keyAiming,'fast sky while held');
    visor.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowLeft',bubbles:true}));
    eq(!flight.keyAiming&&dirty,'full-resolution repaint on release');
    set('clockRate',3);const before=flight.time;sync(lastTime+20000);
    eq(!running&&started&&!flight.done&&flight.time===before,'no lost oxygen in a stall');
    click('pause');sync(lastTime+100);close(flight.time,before+3,.02);
    lastTime=performance.now()-5000;click('pause');eq(!running,'button after a stall leaves flight paused');
  });
  test('Event records and replay agree at 1× and 30×',()=>{
    for(const scenario of ['fast return','orbital return','expiry']){
      const records=[];
      for(const speed of [1,30]){
        if(scenario==='fast return'){
          fixture('Straight-Line',true,[0,-6,0],[0,.116,0]);
          flight.mask=Flight.fullRack^(1<<5)^(1<<3);updateRack();
          tick(74,speed);eq(flight.misses===1&&!Flight.inside(flight.pos.p),'fast entry and exit');
          click('prograde');click('tool4');set('power',100);click('throw');tick(4,speed);
          click('prograde');click('tool2');set('power',100);click('throw');tick(3,speed);
          setView([0,1,0]);click('tool1');set('power',90);click('throw');
        }else if(scenario==='orbital return'){
          configure(0,'Orbital',true,true);setView(Flight.direction(-43,13));set('power',99);click('throw');
        }else configure(3,'Straight-Line');
        tick(flight.limit,speed);eq(flight.done===(scenario==='expiry'?'oxygen':'capture'),'result');
        const {segments}=FlightLog.reconstruct(flight);
        close(norm(sub(segments.at(-1).at(-1).p,flight.pos.p)),0,.00001);
        eq(flight.log.releases.length===flight.throws,'release count');
        flight.log.releases.forEach((r,i)=>{close(norm(sub(segments[i].at(-1).p,r.p)),0);close(segments[i].at(-1).time,r.time);});
        if(scenario==='fast return'){close(flight.log.fast[0].time,4.4/.116);close(flight.log.fast[0].speed,.116);}
        if(scenario==='orbital return'){
          const path=segments.at(-1),mid=path[Math.floor(path.length/2)].p;
          eq(norm(sub(mid,Flight.scale(Flight.add(path[0].p,path.at(-1).p),.5)))>.4,'visible orbital curvature');
        }
        click('viewLog');eq(el('logThrows').children.length===flight.throws,'readable release list');
        records.push([flight.time,...flight.log.releases.map(k=>k.time),...flight.log.fast.map(k=>k.time)]);
        el('flightLog').querySelector('.close').click();click('retry');
      }
      records[0].forEach((v,i)=>close(v,records[1][i],.06));
    }
  });

  test('Equivalent manual straight-back pitch on named and seeded starts',()=>{
    const seeds=Array.from({length:8},(_,i)=>104729+i);
    const trials=[...Flight.named.map((_,i)=>[i,0]),...seeds.flatMap(n=>[[3,n],[3,'D-'+hex(n)]])];
    for(const mode of ['Straight-Line','Orbital'])for(const [index,seed] of trials){
      start(index,mode,true,seed);click('pause');advance(12);
      const [az,elev]=Flight.angles(flight.pos.p);
      // A real visor drag, rounded to the fine-key grid, without Story bearings.
      const dx=Math.round(((az-yaw+540)%360-180)*4),dy=Math.round((elev-pitch)*4);
      const r=visor.getBoundingClientRect();
      const strokes=Math.ceil(Math.max(Math.abs(dx)/(r.width*.72),Math.abs(dy)/(r.height*.72),1));
      for(let j=0;j<strokes;j++){
        const sx=Math.round((j+1)*dx/strokes)-Math.round(j*dx/strokes),sy=Math.round((j+1)*dy/strokes)-Math.round(j*dy/strokes);
        const x=Math.floor(r.x+r.width*(sx>0?.14:.86)),y=Math.floor(r.y+r.height*(sy>0?.14:.86));
        if(Math.hypot(sx,sy)<=3){aim(az,elev);break;}
        pointer(visor,'pointerdown',12,x,y);pointer(visor,'pointermove',12,x+sx,y+sy);pointer(visor,'pointerup',12,x+sx,y+sy);
      }
      click('throw');const release=flight.log.releases[0];
      eq(dot(release.dir,unit(release.p))>.99998,'manual angular tolerance');
      close(norm(sub(release.v,Flight.release(Flight.motion(flight.initial,release.time,mode),5,95,release.dir,Flight.fullRack).v)),0,.000001);
      const projected=flight.forecast.hits.find(h=>h.speed<=Flight.limit);
      advance(flight.limit);eq(flight.done===(projected?'capture':'oxygen'),'coast matches actual result');el('debrief').close();
    }
  });
  test('Seed generation, playback and log preserve the drift family',()=>{
    configure(3,'Straight-Line');click('new');click('reroll');const seed=el('seed').value;
    eq(/^D-[0-9A-F]{8}$/.test(seed)&&el('seed').checkValidity(),'generated seed format');
    el('seed').value='d-19919';el('setupForm').requestSubmit(el('setupForm').querySelector('[value="manual"]'));
    eq(flight.seed==='D-00019919','canonical D seed');
    eq(flight.pos.p.join(',')===Flight.opening(3,'D-00019919',false).p.join(','),'replayed new geometry');
    const v=flight.pos.v.join(',');advance(flight.limit);click('viewLog');eq(el('logSummary').textContent.includes('D-00019919'),'seed in log');
    el('flightLog').querySelector('.close').click();click('retry');eq(v===flight.pos.v.join(','),'D retry');
  });
  test('Copy, load and open shared scenarios with the original rules',()=>{
    const source={seed:'D-00019919',mode:'Orbital',soft:true,story:true};
    const hash='#seed=D-00019919&level=Orbital&goal=soft&story=1';
    const web=Replays.link(source,'https://example.test/games/3d/index.html');
    eq(web==='https://example.test/games/3d/index.html'+hash,'Alpha-style URL');
    eq(Replays.link(source,'file:///somewhere/index.html')===hash,'portable offline replay');
    for(const seed of [0,0xffffffff,'D-00000000','D-FFFFFFFF'])
      for(const mode of ['Straight-Line','Orbital'])for(const soft of [true,false])for(const story of [true,false]){
        const rules={seed,mode,soft,story},decoded=Replays.parse(Replays.fragment(rules));
        eq(JSON.stringify(rules)===JSON.stringify(decoded),'seed and rules round trip');
      }
    eq(Replays.parse('19',source).story&&Replays.parse('19',source).seed===25,'bare code keeps rules');
    start(0,'Straight-Line',false);
    eq(Replays.openHash(hash)&&!started&&flight.index===3&&flight.soft&&flight.story,'open directly, staged');
    const ref=Flight.opening(3,source.seed,true);
    eq(flight.initial.p.join()===ref.p.join()&&flight.initial.v.join()===ref.v.join(),'same position and velocity');
    click('pause');advance(12);const current=flight;
    Replays.openHash('#seed=42&level=Straight-Line');
    eq(el('setup').open&&flight===current&&!running,'in-flight link prompts');
    el('setup').querySelector('.close').click();eq(flight===current&&flight.time>=12,'cancel keeps flight');
    click('new');el('seed').value='https://example.test/#seed=nope';click('loadSeed');
    eq(el('seed').getAttribute('aria-invalid')==='true'&&flight===current,'bad seed stays in setup');
    el('seed').value=web;click('loadSeed');
    eq(el('seed').value===source.seed&&el('seedPreview').textContent.includes('m/s')&&el('soft').checked&&el('storyMode').checked,'load link with settings');
    const savedCopy=Replays.copy;let copied;
    try{
      Replays.copy=text=>{copied=text;};click('copySetupSeed');
      eq(copied.endsWith(hash),'setup copy');
      el('setupForm').requestSubmit();click('seedTag');
      eq(copied.endsWith(hash)&&flight.initial.p.join()===ref.p.join(),'in-flight copy and replay geometry');
    }finally{Replays.copy=savedCopy;}
    for(const value of ['G','D-','D-123456789','#seed=','https://example.test/#seed=3&level=Typo'])eq(!Replays.parse(value),'invalid '+value);
  });
  test('Every random outcome offers a dated single-chart flight card',()=>{
    for(const ending of ['capture','oxygen','stranded']){
      configure(3,'Straight-Line',true,true);
      if(ending==='capture'){
        const c=storyCorrection();eq(!!c,'test route available');
        setView(Flight.direction(c.az,c.el));choose(c.tool);changePower(c.power);click('throw');advance(600);
      }else if(ending==='stranded'){
        click('toStation');for(const tool of rackOrder){choose(tool);click('throw');}
      }else{click('pause');advance(600);}
      eq(flight.done===ending&&el('debrief').open&&!el('debriefShare').hidden,'share after '+ending);
      eq(el('endSeed').textContent==='00019919','debrief seed');
      click('openShareCard');const art=el('cardArt'),date=new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(flight.finishedAt);
      eq(el('shareCard').open&&art.querySelectorAll('svg').length===1&&art.textContent.includes('V-bar / R-bar')&&!art.textContent.includes('cross-track'),'one orbital-plane chart');
      eq([date,seedLabel(flight.seed),outcomes[ending],flight.throws+'/'+Flight.gear.length+' tools used'].every(s=>art.textContent.includes(s)),'actual log and local completion date');
      eq(art.querySelectorAll('.releaseMark').length===flight.throws,'all real releases');
      const savedCopy=Replays.copy;let copied;
      try{
        Replays.copy=text=>{copied=text;};click('copyChallenge');
        eq(copied.includes(outcomes[ending])&&Replays.parse(copied).seed===flight.seed,'challenge text can load directly');
        el('shareCard').querySelector('.close').click();eq(el('debrief').open,'return to debrief');
        click('copyEndSeed');eq(copied.endsWith(Replays.fragment(flight)),'debrief replay');
      }finally{Replays.copy=savedCopy;}
      el('debrief').close();
    }
    configure(0,'Straight-Line');advance(600);eq(el('debriefShare').hidden,'named flight has no random seed');
  });
  test('Directional coast for closure, recession, a miss and an orbital bend',()=>{
    for(const [mode,position,velocity] of [
      ['Straight-Line',[0,-20,0],[0,.07,0]],['Straight-Line',[0,-20,0],[0,-.07,0]],
      ['Straight-Line',[2,-20,9],[.02,.08,.012]],['Orbital',[12,-19,8],[-.042,.058,-.015]]
    ]){
      fixture(mode,false,position,velocity);advance(.1);
      const [az,elev]=Flight.angles(velocity);
      const camera=(offset,small=false)=>Visor.camera(flight.pos.p,az+offset,offset===180?-elev:elev,640,320,small);
      const glyph=Visor.courseGlyphs(camera(0),flight,640,320);
      const reverse=Visor.courseGlyphs(camera(180,true),flight,640,320);
      eq(glyph.visible&&reverse.behind&&!reverse.visible,'bearing in forward and aft');
      if(mode==='Straight-Line')eq(!glyph.heads.length,'end-on fallback');
      else{
        eq(glyph.heads.length>0,'orbital arrowheads');const arrow=glyph.heads[0];
        const cam=camera(0),ahead=cam.screen(cam.world(Flight.motion(flight.anchor,arrow.t+.1,mode).p));
        eq(Math.cos(arrow.angle)*(ahead[0]-arrow.at[0])+Math.sin(arrow.angle)*(ahead[1]-arrow.at[1])>0,'points to later time');
        const partial=Array.from({length:100},(_,i)=>camera(i-50)).find(cam=>{
          const inside=t=>{const p=cam.world(Flight.motion(flight.anchor,t,mode).p);const xy=cam.screen(p);return p[2]>0&&xy[0]>8&&xy[0]<632&&xy[1]>15&&xy[1]<302;};
          const horizon=flight.forecast.hits[0]?.t??flight.limit;
          return inside(horizon*.12)&&!inside(horizon*.92);
        });
        eq(partial&&Visor.courseGlyphs(partial,flight,640,320).visible,'track bends out of frame');
      }
      for(const small of [false,true]){
        const canvas=small?aft:visor;Visor.render(canvas,az,elev,flight,small);Visor.render(canvas,az+180,-elev,flight,small);
      }
      instruments();eq(el('rate').textContent[0]===(Flight.dot(unit(sub(position,Flight.nearest(position))),velocity)<0?'-':'+'),'signed range rate');
    }
  });

  test('Empty rack ends a missed flight at the last actual release',()=>{
    for(const mode of ['Straight-Line','Orbital'])for(const soft of [false,true]){
      configure(0,mode,soft,true);click('toStation');set('power',55);
      const sorted=[6,0,1,2,7,3,8,4,5];
      eq([...el('tools').children].map(b=>b.id).join()===sorted.map(i=>'tool'+i).join(),'ascending visible rack');
      for(const [slot,i] of sorted.entries()){
        const key=String(slot+1);keys(key);
        eq(selected===i&&el('tool'+i).querySelector('.hotkey').textContent===key,'number key selects displayed tool');
        click('throw');eq(flight.log.releases.at(-1).tool===i,'record preserves physical item');
      }
      eq(flight.mask===0&&flight.throws===9&&flight.done==='stranded'&&el('debrief').open,'immediate debrief on ninth throw');
      close(flight.time,flight.log.releases.at(-1).time);eq(flight.time<10,'no expiry wait');
      click('viewLog');eq(el('logSummary').textContent.includes('Out of tools')&&el('logSummary').textContent.includes('0/9'),'stranded log');
      eq(el('logThrows').children.length===9,'all releases in log');
      el('flightLog').close();click('retry');eq(flight.mask===Flight.fullRack&&!flight.done,'retry restores all nine');
    }
  });
  test('Last tool preserves a valid coast and records a final fast contact',()=>{
    for(const [soft,velocity,result] of [[true,.05,'capture'],[false,.12,'capture'],[true,.12,'stranded']]){
      fixture('Straight-Line',soft,[0,-8,0],[0,velocity,0]);
      flight.mask=1<<6;choose(6);setView([0,-1,0]);set('power',10);click('throw');
      eq(!flight.done&&flight.forecast.hits.length===1,'crossing stays live');
      const at=flight.forecast.hits[0].t;advance(flight.limit);eq(flight.done===result,'actual crossing');
      close(flight.time,flight.log.releases[0].time+at,.00001);
      eq(flight.misses===(soft&&velocity>.08?1:0),'fast entry retained');el('debrief').close();
    }
  });
  test('Ten-minute oxygen supply across flight modes, lessons and retries',()=>{
    for(const mode of ['Straight-Line','Orbital'])for(const story of [false,true])for(const soft of [false,true]){
      configure(3,mode,soft,story);
      eq(flight.limit===600&&el('oxygen').textContent==='10:00','fresh flight '+[mode,story,soft]);
    }
    enterLesson('storyEntry');click('pause');advance(450);instruments();
    eq(!flight.done&&el('oxygen').textContent==='2:30','First rescue continues past its former deadline');
    advance(150);
    eq(flight.done==='oxygen'&&flight.time===600&&el('oxygen').textContent==='0:00','Story expires at ten minutes');
    click('retry');
    eq(flight.lesson===0&&el('oxygen').textContent==='10:00','retry starts First rescue with full oxygen');
    click('pause');advance(60);click('skipLesson');
    eq(!flight.story&&el('oxygen').textContent==='9:00','manual handover preserves remaining oxygen');
  });
  test('Clock, speed gauge and XYZ telemetry',()=>{
    configure(0,'Straight-Line');eq(el('clockRate').type==='range','play speed slider');
    const slider=el('clockRate');
    eq(slider.min==='0'&&slider.max==='3'&&slider.step==='1','four detents');
    for(const [i,multiplier] of [1,10,20,30].entries()){
      set('clockRate',i);eq(rate===multiplier&&el('rateLabel').textContent===multiplier+'×','detent label');
      const time=flight.time;sync(lastTime+1000);close(flight.time-time,multiplier,.00001);
    }
    click('throw');eq(rate===1&&slider.value==='0','release resets to first stop');
    for(const soft of [true,false]){
      fixture('Straight-Line',soft,[5,-18,3],[-.011,.105,.023]);instruments();
      eq(el('speedGauge').classList.contains('over')===soft && el('speedRef').textContent.includes('0.080'),'threshold');
      eq(el('velX').textContent==='-0.0110'&&el('velY').textContent==='+0.1050'&&el('velZ').textContent==='+0.0230','signed axes');
      eq(el('suitMass').textContent===Flight.mass(flight.mask).toFixed(1)+' kg','mass');
    }
  });
  test('Backdrop dismisses only the active dialog',()=>{
    configure(0,'Straight-Line');
    const backdrop=d=>{
      const r=d.getBoundingClientRect(),x=r.left-1,y=r.top+2;
      pointer(d,'pointerdown',15,x,y);pointer(d,'pointerup',15,x,y);pointer(d,'click',15,x,y);
    };
    for(const [id,open] of [['guide','manual'],['setup','new']]){
      click(open);const d=el(id),r=d.getBoundingClientRect();
      pointer(d,'pointerdown',15,r.left+4,r.top+4);pointer(d,'click',15,r.left-1,r.top+3);
      eq(d.open,'inside press dragging out stays open');backdrop(d);eq(!d.open&&!running,'close while paused');
    }
    click('pause');advance(flight.limit);click('viewLog');backdrop(el('flightLog'));
    eq(!el('flightLog').open&&el('debrief').open,'back to debrief');backdrop(el('debrief'));eq(!el('debrief').open,'back to cockpit');
  });

  test('Miss hints follow the forward visor, including diagonals and depth',()=>{
    // At heading 0 the forward axis is +X, screen right is −Y, and up is +Z.
    eq(trimHint([0,-1,0],0,0).includes('right'),'right');
    eq(trimHint([0,-1,0],180,0).includes('left'),'left after half-turn');
    eq(trimHint([0,-1,1],0,0).includes('up and right'),'diagonal');
    eq(trimHint([0,0,1],0,90).includes('straight ahead'),'looking up at the throw');
    eq(trimHint([1,0,0],180,0).includes('behind'),'backward pitch');
    eq(trimHint([0,0,0],0,0)==='','no fabricated direction');
    for(const mode of ['Straight-Line','Orbital']){
      fixture(mode,false,[-20,0,10],[.08,0,0]);flight.story=false;
      setView([1,0,0]);advance(1);nav();
      eq(el('advice').textContent.includes('Aim up')&&el('advice').textContent.includes('forward visor'),'in-flight cue '+mode);
      const near=flight.forecast.near;
      setView(sub(near.p,near.bar));nav();
      eq(el('advice').textContent.includes('straight ahead'),'faces actual miss in '+mode);
    }
  });
  test('Nine closely spaced release labels clear the trace in both panes',()=>{
    for(const coincident of [false,true]){
      configure(2,'Orbital',true,true);click('toStation');set('power',30);
      for(const [n,tool] of rackOrder.entries()){
        if(n&&!coincident)advance(n<=3?30:1);
        choose(tool);click('throw');
      }
      eq(flight.done==='stranded','nine real releases');click('viewLog');
      for(const svg of el('logPanes').querySelectorAll('svg')){
        const marks=[...svg.querySelectorAll('.releaseMark')];
        const traces=[...svg.querySelectorAll('polyline')].map(p=>Array.from(p.points,v=>[v.x,v.y]));
        const prior=[];
        eq(marks.length===9,'all labels');
        for(const [i,mark] of marks.entries()){
          const [anchor,badge]=mark.querySelectorAll('circle'),x=badge.cx.baseVal.value,y=badge.cy.baseVal.value;
          eq(mark.textContent===String(i+1)&&badge.r.baseVal.value<=6,'small numbered badge');
          eq(Math.hypot(x-anchor.cx.baseVal.value,y-anchor.cy.baseVal.value)>24,'leader offset');
          eq(x>=38&&x<=400&&y>=23&&y<=228,'inside plot');
          eq(prior.every(([u,v])=>Math.hypot(x-u,y-v)>=14),'separate badges');prior.push([x,y]);
          for(const trace of traces)for(let j=1;j<trace.length;j++){
            const [a,b]=trace[j-1],[c,d]=trace[j],dx=c-a,dy=d-b;
            const f=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy||1),0,1);
            eq(Math.hypot(x-a-f*dx,y-b-f*dy)>8,'clear of coast');
          }
        }
      }
      el('flightLog').close();el('debrief').close();
    }
  });
  test('Guide and tutorial introduce recoil and the original mission',()=>{
    click('manual');const guide=el('guide').textContent;
    eq(['presumed lost','Newton’s third law','wrench','SR-73','next town'].every(s=>guide.includes(s)),'guide premise and backstory');
    eq(el('guide').querySelector('.credits p').textContent==='an AvaniNet game © 2026 // in honor of the legends of tgirl baseball','credit line');
    enterLesson('replayLesson');
    eq(['presumed lost','Newton’s third law','wrench','pushes you back','95%'].every(s=>el('lessonCue').textContent.includes(s)),'opening explanation and control');
    eq(el('brief').textContent.includes('Saturdays'),'character in opening');
  });
  const out=document.createElement('pre');out.id='qa-result';out.textContent=JSON.stringify({passed,errors,rects,viewport:[innerWidth,innerHeight]});document.body.append(out);
})();
