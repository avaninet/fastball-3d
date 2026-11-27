'use strict';

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
  function validOpening(index,seed,tilt,manual,preview,coach){
    return Number.isInteger(index) && index>=0 && index<families.length &&
      Number.isInteger(seed) && seed>=0 && seed<Catalog.count && (!seed || index===3 || index===5) &&
      Number.isInteger(tilt) && tilt>=0 && tilt<=16 && (!tilt || !!(Catalog.mask(index,seed)&(1<<(tilt-1)))) &&
      (!manual || !(preview || coach)) && (!coach || index>=4);
  }
  function encode({index,seed,pose,poseId=0,mode,soft,story,startingAids={}}){
    const prefix=(startingAids.manual?'F2':'F1')+families[index],tilt=pose?.id??poseId;
    const {manual=false,preview=false,coach=false}=startingAids;
    if(!validOpening(index,seed,tilt,manual,preview,coach) ||
       (mode!=='Straight-Line' && mode!=='Orbital') || (soft!==false && soft!==true && soft!=='firm') ||
       [story,manual,preview,coach].some(flag=>typeof flag!=='boolean')){
      throw new RangeError('Invalid challenge settings');
    }
    const goal=soft==='firm'?1:soft?2:0;
    const bits=(seed<<11)|(tilt<<6)|(Number(mode==='Orbital')<<5)|(goal<<3)|
      (Number(story)<<2)|(Number(!!startingAids.preview)<<1)|Number(!!startingAids.coach);
    let payload='';
    for(let shift=20;shift>=0;shift-=5)payload+=alphabet[(bits>>>shift)&31];
    return prefix+'-'+payload+check(prefix+payload);
  }
  function token(value){
    if(typeof value!=='string')return '';
    const tail=value.slice(-512).toUpperCase(),at=tail.lastIndexOf('#SEED=');
    if(value.length>512 && (at<0 || !tail.slice(0,at).trim()))return '';
    const text=(at>=0?tail.slice(at+6):tail).trim();
    if(at>=0)return text.split(/[\s<>"']/)[0].replace(/[.,;:!?)\]]+$/,'');
    // A bare code may be pasted in a sentence. Reject ambiguous opening lists.
    const codes=text.match(/\bF[12][TLWDCB]-[A-Z0-9]{6}\b/g);
    return codes?.length===1?codes[0]:text.replace(/[.,;:!?)\]]+$/,'');
  }
  function isLegacy(value){
    const seed=token(value).split('&',1)[0];
    return /^(?:DB[12]-[\dA-F]{8}|(?:[DE]-)?[\dA-F]{1,8})$/.test(seed);
  }
  function decode(value){
    let code=token(value);
    if(!/^F[12][TLWDCB]-[A-Z0-9]{6}$/.test(code))return null;
    // Keep the L in the Lateral drift prefix. Only the base-32 digits have aliases.
    code=code.slice(0,4)+code.slice(4).replace(/O/g,'0').replace(/[IL]/g,'1');
    const prefix=code.slice(0,3),payload=code.slice(4,9);
    if(code[9]!==check(prefix+payload))return null;
    let bits=0;
    for(const c of payload){
      const digit=alphabet.indexOf(c);if(digit<0)return null;
      bits=bits*32+digit;
    }
    const index=families.indexOf(code[2]),seed=bits>>>11,poseId=(bits>>>6)&31,goal=(bits>>>3)&3;
    const coach=!!(bits&1),manual=prefix.startsWith('F2');
    if(goal===3 || !validOpening(index,seed,poseId,manual,!!(bits&2),coach))return null;
    return {index,seed,poseId,mode:bits&32?'Orbital':'Straight-Line',soft:goal===1?'firm':goal===2,
      story:!!(bits&4),startingAids:manual?{manual:true,preview:false,coach:false}:{preview:!!(bits&2),coach}};
  }
  return {encode,decode,isLegacy};
})();
