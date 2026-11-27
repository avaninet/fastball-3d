const Replays=(()=>{
  const maxLength=512,parse=Challenge.decode;
  const fragment=replay=>'#seed='+Challenge.encode(replay);
  function link(replay,address=location.href){
    const url=new URL(address),hash=fragment(replay);
    // An offline friend can paste the fragment without a copy of the sender's file path.
    return /^https?:$/.test(url.protocol)?url.origin+url.pathname+hash:hash;
  }
  function hasSeed(hash){
    return /^#seed=/i.test(hash);
  }
  function updateAddress(active){
    if(!['file:','http:','https:'].includes(location.protocol))return;
    const hash=active.lesson===null && !active.skippedGuidance?fragment(active):'';
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
      start(replay.index,replay.mode,replay.soft,replay.seed,replay.story,null,replay.startingAids,replay.poseId);
    }else{
      if(!flight)start(0,'Straight-Line',false);
      updateAddress(flight); // Cancel keeps the current flight and its address.
      openSetup();
      if(replay)applySetup(replay);
      else{el('seed').value=hash.length<=maxLength?hash:'';loadSetupSeed();}
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
  return Replays.copy(link,status,link.startsWith('#')?'Challenge link copied. Paste it into New flight.':'Challenge link copied.');
}
el('copyCode').onclick=()=>{const r=loadSetupSeed();if(r)Replays.copy(Challenge.encode(r),el('seedPreview'),'Challenge code copied.');};
el('copySetupSeed').onclick=()=>{const replay=loadSetupSeed();if(replay)copyReplay(replay,el('seedPreview'));};
el('seedTag').onclick=()=>copyReplay(flight,el('message'));
el('copyEndSeed').onclick=()=>copyReplay(flight,el('endShareStatus'));
el('openShareCard').onclick=()=>{
  el('cardArt').innerHTML=FlightLog.card(flight);
  el('cardStatus').textContent='';el('shareCard').showModal();
};
el('copyChallenge').onclick=()=>{
  const text=el('cardArt').querySelector('desc').textContent;
  const challenge=flight.done!=='capture'?(flight.index===5?'Can you get Tommi past this debris and home?':'Can you get Tommi home from this drift?'):flight.story?'Can you make a gentler grab or get home in fewer throws?':'Can you bring home more Δv or make a gentler grab?';
  return Replays.copy(text+'\n'+challenge+'\n'+Replays.link(flight),el('cardStatus'),'Challenge copied.');
};
el('saveCard').onclick=async()=>{
  const image=new Image(),svg=el('cardArt').querySelector('svg');
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}));
  const filename='Fastball-3D-'+Challenge.encode(flight)+'.png';
  try{
    image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=svg.viewBox.baseVal.width*2;canvas.height=svg.viewBox.baseVal.height*2;
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const a=document.createElement('a');a.download=filename;a.href=canvas.toDataURL('image/png');a.click();
    el('cardStatus').textContent='PNG download started.';
  }catch{el('cardStatus').textContent='Image export is unavailable here. You can screenshot this card or copy the challenge.';}
  finally{URL.revokeObjectURL(url);}
};
