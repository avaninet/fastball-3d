(() => {
  const passed=[],errors=[];
  const eq=(x,msg)=>{if(!x)throw Error(msg);};
  const test=(name,f)=>{try{f();passed.push(name);}catch(e){errors.push(name+' / '+e.stack);}};
  const click=id=>el(id).click();
  const set=(id,value)=>{el(id).value=value;el(id).dispatchEvent(new Event('input',{bubbles:true}));};
  const keys=(key,shiftKey=false,target=visor)=>target.dispatchEvent(new KeyboardEvent('keydown',{key,shiftKey,bubbles:true}));
  function configure(scenario,mode,soft=false) {
    click('new');el('scenario').value=scenario;el('scenario').dispatchEvent(new Event('change'));
    document.querySelector('input[name=model][value="'+mode+'"]').checked=true;
    el('soft').checked=soft;if(scenario===3)el('seed').value='00019919';
    el('setupForm').requestSubmit();
  }
  function aim(az,elv){
    const d=(az-yaw+540)%360-180;
    for(let j=0;j<Math.round(Math.abs(d)*4);j++)keys(d>0?'ArrowLeft':'ArrowRight',true);
    const e=elv-pitch;
    for(let j=0;j<Math.round(Math.abs(e)*4);j++)keys(e>0?'ArrowUp':'ArrowDown',true);
  }
  test('New flight / guide / clocks',()=>{
    eq(el('name').textContent==='Tether separation','opening');
    click('manual');eq(el('guide').open,'guide open');el('guide').querySelector('.close').click();
    click('pause');eq(running,'start');click('pause');eq(!running,'pause');click('pause');eq(running,'resume');
    configure(0,'Straight-Line');eq(!started&&!running,'staged after reset');
  });
  test('Default opening / camera / actual contact / retry',()=>{
    click('away');const v0=flight.pos.v.slice();const diff=Math.abs(Flight.dot(Flight.direction(yaw,pitch),unit(flight.pos.p))-1);eq(diff<1e-8,'reverse alignment');click('throw');
    eq(flight.throws===1 && !el('tool5').getAttribute('aria-pressed').includes('true'),'rack deduction');eq(norm(sub(v0,flight.pos.v))>.08,'normal release');
    eq(flight.forecast.hits.length,'default route reachable');advance(450);eq(flight.done==='capture'&&el('debrief').open,'contact');
    click('retry');eq(flight.mask===63&&flight.time===0,'retry');
  });
  const named=[
    [[[5,-61,15,94]],[[3,-46,-3,94]],[[5,-55,14,100],[2,-54,13,94]]],
    [[[5,-61,15,94]],[[3,-46,-3,94]],[[5,-54,14,100],[1,-55,13,82]]],
    [[[5,-43,13,99]],[[4,-38,-3,95]],[[5,-37,12,100],[3,-37,12,70]]],
    [[[5,-43,13,99]],[[4,-38,-3,95]],[[5,-34,12,100],[2,-35,12,82]]]
  ];
  for(let k=0;k<4;k++)for(let idx=0;idx<3;idx++)test('Named capture '+k+'/'+idx,()=>{
    configure(idx,k<2?'Straight-Line':'Orbital',!!(k%2));
    for(const [i,[tool,az,elv,pct]] of named[k][idx].entries()){
      if(i)advance(4);aim(az,elv);click('tool'+tool);set('power',pct);click('throw');
    }
    advance(450);eq(flight.done==='capture','reachable via ordinary aim and power controls');
    if(k%2)eq(norm(flight.pos.v)<=.080000001,'soft capture');
    click('retry');
  });
  test('Seed reuse / expiry / narrow viewport',()=>{
    configure(3,'Orbital',true);const p=flight.pos.p.join(',');click('pause');advance(450);
    eq(flight.done==='oxygen','out of oxygen');click('retry');eq(flight.pos.p.join(',')===p,'retry same seed');
    configure(3,'Straight-Line',false);eq(flight.pos.p.join(',')===p,'same state both modes');
    eq(document.documentElement.scrollWidth<=innerWidth+1,'horizontal overflow');
    for(const id of ['forward','aft','throw','tools'])eq(el(id).getBoundingClientRect().width>30,id+' dimensions');
  });
  test('Soft missed grab stays live, exit and recover using normal release',()=>{
    configure(0,'Straight-Line',true);flight.pos={p:[0,-6,0],v:[0,.116,0]};flight.mask=63^(1<<5)^(1<<3);reseat();
    advance(42);eq(flight.misses===1&&!flight.done&&Flight.inside(flight.pos.p),'fast crossing');advance(32);
    eq(!Flight.inside(flight.pos.p),'cleared aft face');
    click('prograde');click('tool4');set('power',100);click('throw');advance(4);
    click('prograde');click('tool2');set('power',100);click('throw');advance(3);
    setView([0,1,0]);click('tool1');set('power',90);click('throw');advance(350);
    eq(flight.done==='capture'&&flight.misses===1,'slower re-entry');click('retry');
  });
  test('Renderer and free aim',()=>{
    for(const [az,elv] of [[0,90],[144,-90],[-120,80],[160,-30],[0,0]]){
      Visor.render(visor,az,elv,flight);Visor.render(aft,az+180,-elv,flight,true);
    }
    const before=flight.pos.v.join(',');keys('ArrowLeft');keys('ArrowDown',true);eq(before===flight.pos.v.join(','),'no rotation impulse');
  });
  const out=document.createElement('pre');out.id='qa-result';out.textContent=JSON.stringify({passed,errors});document.body.append(out);
})();
