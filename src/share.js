const Replays=(()=>{
  const defaults={mode:'Straight-Line',soft:false,story:false};
  function parse(value,rules=defaults){
    let code=value.trim(),mode=rules.mode,soft=rules.soft,story=rules.story;
    if(code.startsWith('Fastball 3D · ')&&code.includes('#seed='))code=code.slice(code.lastIndexOf('#seed='));
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
    const match=/^(D-)?([\da-f]{1,8})$/i.exec(code);
    if(!match)return null;
    const number=parseInt(match[2],16);
    return {seed:match[1]?'D-'+hex(number):number,mode,soft,story};
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
  function updateAddress(active){
    if(!['file:','http:','https:'].includes(location.protocol))return;
    const hasSeed=new URLSearchParams(location.hash.slice(1)).has('seed');
    const hash=active.index===3?fragment(active):'';
    if((!hash&&!hasSeed)||location.hash===hash)return;
    const url=new URL(location.href);url.hash=hash;
    try{history.replaceState(history.state,'',url.href);}catch{/* Some local viewers isolate history. */}
  }
  function openHash(hash){
    if(!new URLSearchParams(hash.slice(1)).has('seed'))return false;
    const replay=parse(hash);
    const needsConfirmation=flight&&((started&&!flight.done)||el('setup').open);
    for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
    if(replay&&!needsConfirmation){
      start(3,replay.mode,replay.soft,replay.seed,replay.story);
    }else{
      if(!flight)start(0,'Straight-Line',false);
      updateAddress(flight); // Cancel keeps the current flight and its address.
      openSetup();el('scenario').value='3';el('seed').value=hash;updateSetup();
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
  return Replays.copy(text+'\nCan you beat my flight?\n'+Replays.link(flight),el('cardStatus'),'Challenge copied.');
};
el('saveCard').onclick=async()=>{
  const image=new Image(),svg=el('cardArt').querySelector('svg');
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}));
  const filename='Fastball-3D-'+seedLabel(flight.seed)+'.png';
  try{
    image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=svg.viewBox.baseVal.width*2;canvas.height=svg.viewBox.baseVal.height*2;
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const a=document.createElement('a');a.download=filename;a.href=canvas.toDataURL('image/png');a.click();
    el('cardStatus').textContent='PNG download started.';
  }catch{el('cardStatus').textContent='Image export is unavailable here. You can screenshot this card or copy the challenge.';}
  finally{URL.revokeObjectURL(url);}
};
