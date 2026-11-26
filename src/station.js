const Station = (() => {
  const {add,scale}=Flight;
  const faces=[],solids=[];
  const axes=[[1,0,0],[0,1,0],[0,0,1]];
  // Five opposing pairs of planes describe the ten sides of a hull module.
  const radialPlanes=Array.from({length:5},(_,i)=>{
    const angle=(i+.5)*Math.PI/5;
    return [Math.cos(angle),Math.sin(angle),0];
  });
  function face(points,color,{normal,lines=[],edge='#384950',...material}){
    const center=scale(points.reduce(add),1/points.length);
    faces.push({points,center,color,lines,edge,normal,plane:Flight.dot(normal,center),...material});
  }
  function box(x,y,z,w,d,h,colors,panel=false) {
    const sizes=[w,d,h],center=[x,y,z];
    solids.push(axes.map((n,i)=>[n,center[i]-sizes[i]/2,center[i]+sizes[i]/2]));
    const p=(i,j,k)=>[x+i*w/2,y+j*d/2,z+k*h/2];
    for(const k of [-1,1]) {
      face([p(-1,-1,k),p(1,-1,k),p(1,1,k),p(-1,1,k)],colors[k>0?0:2],{normal:[0,0,k]});
      if(!panel)face([p(-1,k,-1),p(1,k,-1),p(1,k,1),p(-1,k,1)],colors[1],{normal:[0,k,0]});
      face([p(k,-1,-1),p(k,1,-1),p(k,1,1),p(k,-1,1)],colors[2],{normal:[k,0,0]});
    }
  }
  const steel=['#e4e2ce','#adb8b7','#76858b'],rail=['#d5c089','#a48c61','#6c675c'];
  function wing(x,z,w,h,solar) {
    const accent=solar?'#91a5b6':'#969e96', col=solar?'#364d69':'#d2d6c8';
    box(x,0,z,w,.148,h,solar?['#d0a769',col,'#746247']:steel,true);
    for(const side of [-1,1]) {
      const p=(a,b)=>[x+(a-.5)*w,.074*side,z+(b-.5)*h], lines=[];
      const columns=solar?8:5,rows=solar?5:3;
      const grid=[[],[]];
      for(let k=1;k<columns;k++)grid[0].push([p(k/columns,0),p(k/columns,1),accent]);
      for(let k=1;k<rows;k++)grid[1].push([p(0,k/rows),p(1,k/rows),solar?'#687f96':'#a4aaa0']);
      if(solar) lines.push([p(.5,0),p(.5,1),'#d5ab72',1.4]);
      face([p(0,0),p(1,0),p(1,1),p(0,1)],col,{
        lines,edge:solar?'#b6bdbb':'#edf0dd',normal:[0,side,0],
        grid,divisions:[columns,rows],tones:solar?['#293f5a','#4c637f']:null
      });
    }
  }
  function moduleZ(z0,z1,radius,marked=false) {
    const x=0,y=-.2,apothem=radius*Math.cos(Math.PI/10);
    solids.push([[axes[2],z0,z1],...radialPlanes.map(n=>{
      const center=x*n[0]+y*n[1];return [n,center-apothem,center+apothem];
    })]);
    const ring=(a,z,r=radius)=>[x+Math.cos(a)*r,y+Math.sin(a)*r,z];
    const shades=['#d8ddcf','#a1aaa9','#899391','#7c8587','#889593','#aeb7af','#dce1d6','#f0eee1','#e0e2d4','#c8cfc6'];
    const ends=[[],[]];
    for(let i=0;i<10;i++) {
      const a=i*Math.PI/5,b=(i+1)*Math.PI/5;
      const lines=[.14,.81,.9].map(t=>[ring(a,z0+(z1-z0)*t),ring(b,z0+(z1-z0)*t),'#737f80',1]);
      const stripes=marked?[[.19,.35],[.57,.73]].map(([lo,hi])=>{
        const z=z0+(z1-z0)*lo,end=z0+(z1-z0)*hi;
        return [ring(a,z),ring(b,z),ring(b,end),ring(a,end)];
      }):[];
      face([ring(a,z0),ring(b,z0),ring(b,z1),ring(a,z1)],shades[i],{
        lines,edge:null,normal:[Math.cos((a+b)/2),Math.sin((a+b)/2),0],tones:[shades[i],shades[(i+1)%10]],stripes
      });
      ends[0].push(ring(a,z0));ends[1].push(ring(a,z1));
    }
    face(ends[0],'#8b9694',{normal:[0,0,-1]});
    const stripes=marked?[-.21,.12].map(dx=>[[dx,-.27],[dx+.10,-.27],[dx+.10,.27],[dx,.27]].map(([a,b])=>[x+a,y+b,z1])):[];
    face(ends[1],'#e4e3d5',{stripes,normal:[0,0,1]});
  }
  box(0,.2,0,13.5,.38,.34,steel);
  box(0,.18,0,.42,.42,13.6,rail);
  for(const side of [-1,1]) {
    for(const lane of [-1,1]) {
      box(side*3.95,.13,lane*3.75,6,.23,.19,rail);
      wing(side*4.22,lane*3.75,4.9,3.5,true);
    }
    wing(side*4.8,0,3.65,1.55,false);
    box(side*1.78,-.26,0,1.45,1.13,1.3,steel);
  }
  moduleZ(-4.65,-1.62,.74);moduleZ(-1.5,1.54,1.15);moduleZ(1.65,4.5,.82);
  moduleZ(4.55,5.75,.53,true);box(0,-1.24,.28,1.13,.5,.86,['#f0d69f','#d5b171','#8a7350']);

  // Sweep against the same boxes and faceted hull used for drawing. The grab
  // envelope only rejects distant segments. Gaps between panels stay open.
  function crosses(from,to){
    if(Flight.half.some((h,i)=>Math.min(from[i],to[i])>h || Math.max(from[i],to[i])<-h))return false;
    const delta=Flight.sub(to,from);
    return solids.some(planes=>{
      let enter=0,leave=1;
      for(const [normal,lo,hi] of planes){
        const pos=Flight.dot(normal,from),step=Flight.dot(normal,delta);
        if(Math.abs(step)<1e-10){
          if(pos<lo || pos>hi)return false;
        }else{
          const a=(lo-pos)/step,b=(hi-pos)/step;
          enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));
          if(enter>leave)return false;
        }
      }
      return true;
    });
  }
  return {faces,crosses};
})();
