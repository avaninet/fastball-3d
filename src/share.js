const Replays=(()=>{
  const defaults={mode:'Straight-Line',soft:false,story:false};
  const maxLength=512;
  function parse(value,rules=defaults){
    if(typeof value!=='string'||value.length>maxLength)return null;
    let code=value.trim(),mode=rules.mode,soft=rules.soft,story=rules.story;
    // A shared challenge may be embedded in a sentence or followed by prose.
    const fragmentStart=code.lastIndexOf('#seed=');
    if(fragmentStart>=0){
      code=code.slice(fragmentStart).split(/[\s<>"\x27]/,1)[0];
      let end=code.length;
      while(end && '.,;:!?)]'.includes(code[end-1]))end--;
      code=code.slice(0,end);
    }
    if(code.startsWith('#')||/^(https?|file):\/\//i.test(code)){
      let hash=code;
      if(!code.startsWith('#')){
        try{hash=new URL(code).hash;}catch{return null;}
      }
      const params=new URLSearchParams(hash.slice(1));
      code=params.get('seed')||'';
      mode=params.get('level')??defaults.mode;
      const goal=params.get('goal')??'none',assisted=params.get('story')??'0';
      if(!['Straight-Line','Orbital'].includes(mode)||!['none','soft'].includes(goal)||!['0','1'].includes(assisted))return null;
      soft=goal==='soft';story=assisted==='1';
    }
    if(/^DB[12]-/i.test(code)){
      const approved=code[2]==='2'?approvedDodgeballSeeds:legacyDodgeballSeeds;
      if(!/^DB[12]-[\da-f]{8}$/i.test(code)||!approved.has(parseInt(code.slice(4),16)))return null;
      return {seed:code.toUpperCase(),mode,soft,story};
    }
    const match=/^([DE]-)?([\da-f]{1,8})$/i.exec(code);
    if(!match)return null;
    const number=parseInt(match[2],16);
    return {seed:match[1]?match[1].toUpperCase()+hex(number):number,mode,soft,story};
  }
  function fragment(replay){
    const params=new URLSearchParams({seed:seedLabel(replay.seed),level:replay.mode});
    if(replay.soft)params.set('goal','soft');
    if(replay.story)params.set('story','1');
    return '#'+params;
  }
  function link(replay,address=location.href){
    const url=new URL(address),hash=fragment(replay);
    // An offline friend can paste the fragment without a copy of the sender's file path.
    return /^https?:$/.test(url.protocol)?url.origin+url.pathname+hash:hash;
  }
  function hasSeed(hash){
    return new URLSearchParams(hash.slice(1,maxLength+1)).has('seed');
  }
  function updateAddress(active){
    if(!['file:','http:','https:'].includes(location.protocol))return;
    const hash=isSeeded(active.index)?fragment(active):'';
    if((!hash&&!hasSeed(location.hash))||location.hash===hash)return;
    const url=new URL(location.href);url.hash=hash;
    try{history.replaceState(history.state,'',url.href);}catch{/* Some local viewers isolate history. */}
  }
  function openHash(hash){
    if(!hasSeed(hash))return false;
    const replay=parse(hash);
    const needsConfirmation=flight&&((started&&!flight.done)||el('setup').open);
    for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
    if(replay&&!needsConfirmation){
      start(seedScenario(replay.seed),replay.mode,replay.soft,replay.seed,replay.story);
    }else{
      if(!flight)start(0,'Straight-Line',false);
      updateAddress(flight); // Cancel keeps the current flight and its address.
      openSetup();setupScenarios.value=replay?String(seedScenario(replay.seed)):/#seed=DB[12]-/i.test(hash)?'5':'3';
      el('seed').value=hash.length<=maxLength?hash:'';updateSetup();loadSetupSeed();
    }
    return true;
  }
  async function copy(text,status,message){
    try{
      await navigator.clipboard.writeText(text);status.textContent=message;
    }catch{
      if(running){sync();if(!flight.done)freezeClock();}
      el('copyText').value=text;el('copyDialog').showModal();
      el('copyText').focus();el('copyText').select();
    }
  }
  return {parse,fragment,link,updateAddress,openHash,copy};
})();

function copyReplay(replay,status){
  const link=Replays.link(replay);
  return Replays.copy(link,status,link.startsWith('#')?'Replay copied. Paste it into Load seed in another copy of Fastball 3D.':'Replay link copied.');
}
el('copySetupSeed').onclick=()=>{const replay=loadSetupSeed();if(replay)copyReplay(replay,el('seedPreview'));};
el('seedTag').onclick=()=>copyReplay(flight,el('message'));
el('copyEndSeed').onclick=()=>copyReplay(flight,el('endShareStatus'));
el('openShareCard').onclick=()=>{
  el('cardArt').innerHTML=FlightLog.card(flight);
  el('cardStatus').textContent='';el('shareCard').showModal();
};
el('copyChallenge').onclick=()=>{
  const text=el('cardArt').querySelector('desc').textContent;
  if(flight.index===4)return Replays.copy(text,el('cardStatus'),'Flight summary copied.');
  const challenge=flight.done!=='capture'?(flight.index===5?'Can you get Tommi past this debris and home?':'Can you get Tommi home from this drift?'):flight.story?'Can you make a gentler grab or get home in fewer throws?':'Can you bring home more Δv or make a gentler grab?';
  return Replays.copy(text+'\n'+challenge+'\n'+Replays.link(flight),el('cardStatus'),'Challenge copied.');
};
el('saveCard').onclick=async()=>{
  const image=new Image(),svg=el('cardArt').querySelector('svg');
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}));
  const filename='Fastball-3D-'+(flight.index===4?'Dodgeball-Challenge':seedLabel(flight.seed))+'.png';
  try{
    image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=svg.viewBox.baseVal.width*2;canvas.height=svg.viewBox.baseVal.height*2;
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const a=document.createElement('a');a.download=filename;a.href=canvas.toDataURL('image/png');a.click();
    el('cardStatus').textContent='PNG download started.';
  }catch{el('cardStatus').textContent='Image export is unavailable here. You can screenshot this card or copy the challenge.';}
  finally{URL.revokeObjectURL(url);}
};
