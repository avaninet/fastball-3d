const Challenge=(()=>{
  const alphabet='0123456789ABCDEFGHJKMNPQRSTVWXYZ',families='TLWDCB';
  // CRC-5, polynomial x^5+x^2+1, initial/final zero. Feed uppercase ASCII
  // prefix and payload MSB first, excluding the separator.
  function check(text){
    let crc=0;
    for(const c of text)for(let bit=7;bit>=0;bit--){
      const feedback=((crc>>4)^(c.charCodeAt(0)>>bit))&1;
      crc=((crc<<1)&31)^(feedback?5:0);
    }
    return alphabet[crc];
  }
  function encode({index,seed,pose,poseId=0,mode,soft,story,startingAids={}}){
    const prefix=(startingAids.manual?'F2':'F1')+families[index],tilt=pose?.id??poseId;
    const goal=soft==='firm'?1:soft?2:0;
    const bits=(seed<<11)|(tilt<<6)|(Number(mode==='Orbital')<<5)|(goal<<3)|
      (Number(story)<<2)|(Number(!!startingAids.preview)<<1)|Number(!!startingAids.coach);
    let payload='';
    for(let shift=20;shift>=0;shift-=5)payload+=alphabet[(bits>>>shift)&31];
    return prefix+'-'+payload+check(prefix+payload);
  }
  function decode(value){
    if(typeof value!=='string')return null;
    // The link is last on a copied flight card. Long page paths or card text
    // need only their tail examined to recover its fragment.
    let code=value.slice(-512).trim().toUpperCase();
    const at=code.lastIndexOf('#SEED=');
    if(value.length>512 && at<=0)return null;
    if(at>=0)code=code.slice(at+6).split(/[\s<>"']/)[0].replace(/[.,;:!?)\]]+$/,'');
    if(!/^F[12][TLWDCB]-[A-Z0-9]{6}$/.test(code))return null;
    const prefix=code.slice(0,3),payload=code.slice(4,9);
    if(code[9]!==check(prefix+payload))return null;
    let bits=0;
    for(const c of payload){
      const digit=alphabet.indexOf(c);if(digit<0)return null;
      bits=bits*32+digit;
    }
    const index=families.indexOf(code[2]),seed=bits>>>11,poseId=(bits>>>6)&31,goal=(bits>>>3)&3;
    const coach=!!(bits&1),manual=prefix.startsWith('F2');
    if((manual && (bits&3)) || seed>=Catalog.count || (index!==3&&index!==5&&seed!==0) || poseId>16 || goal===3 ||
      (coach&&index<4) || (poseId && !(Catalog.mask(index,seed)&(1<<(poseId-1)))))return null;
    return {index,seed,poseId,mode:bits&32?'Orbital':'Straight-Line',soft:goal===1?'firm':goal===2,
      story:!!(bits&4),startingAids:manual?{manual:true,preview:false,coach:false}:{preview:!!(bits&2),coach}};
  }
  return {encode,decode};
})();
