const Readout={
  signed(value,digits,plus=true){
    const rounded=Number(value.toFixed(digits));
    return (plus && rounded>=0?'+':'')+rounded.toFixed(digits);
  },
  heading(value,digits){
    const wrapped=((value%360)+360)%360;
    return (Number(wrapped.toFixed(digits))%360).toFixed(digits);
  },
  speed(value){
    const ordinary=value.toFixed(3);
    if(Number(ordinary)===Flight.limit && !Flight.softEnough(value)){
      const precise=value.toFixed(4);
      return Number(precise)>Flight.limit?precise:'>'+ordinary;
    }
    return ordinary;
  },
  clearance(value,digits=1){
    const rounded=value.toFixed(digits);
    return value>0 && Number(rounded)===0?'less than '+(10**-digits).toFixed(digits):rounded;
  },
  count(value,singular,plural=singular+'s'){return value+' '+(value===1?singular:plural);}
};

function orientation(az,el){
  const {direction,dot}=Flight;
  const forward=direction(az,el),right=direction(az-90,0),up=direction(az,el+90);
  const local=q=>[dot(q,right),dot(q,up),dot(q,forward)];
  return {forward,right,up,local};
}

// The displacement runs from the nearest grab bar to the predicted miss.
// Point the tool to that side so recoil pushes the suit back toward the bars.
function trimHint(displacement,az,elevation){
  if(Flight.norm(displacement)<1e-7)return '';
  const [right,up,forward]=orientation(az,elevation).local(Flight.unit(displacement));
  if(forward>.94)return 'Pitch straight ahead along the forward crosshair.';
  if(forward<-.94)return 'Aim almost straight behind your current view.';
  const threshold=.42*Math.max(Math.abs(right),Math.abs(up)),parts=[];
  if(Math.abs(up)>=threshold)parts.push(up>0?'up':'down');
  if(Math.abs(right)>=threshold)parts.push(right>0?'right':'left');
  const side=parts.join(' and ');
  return forward<-.25?'Turn '+side+' toward the space behind you.':'Aim '+side+' in the forward visor.';
}
