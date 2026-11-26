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
  count(value,singular,plural=singular+'s'){return value+' '+(value===1?singular:plural);}
};
const Visor = (() => {
  const {add,sub,scale,dot,norm,unit,direction,clamp,rad}=Flight;
  const xyz=(x,y,z)=>[x,y,z], faces=[];
  function face(points,color,lines=[],edge='#384950') {faces.push({points,color,lines,edge,center:scale(points.reduce(add),1/points.length)});}
  function box(x,y,z,w,d,h,colors) {
    const p=(i,j,k)=>[x+i*w/2,y+j*d/2,z+k*h/2];
    for(const k of [-1,1]) {
      face([p(-1,-1,k),p(1,-1,k),p(1,1,k),p(-1,1,k)],colors[k>0?0:2]);
      face([p(-1,k,-1),p(1,k,-1),p(1,k,1),p(-1,k,1)],colors[1]);
      face([p(k,-1,-1),p(k,1,-1),p(k,1,1),p(k,-1,1)],colors[2]);
    }
  }
  const steel=['#e4e2ce','#adb8b7','#76858b'],rail=['#d5c089','#a48c61','#6c675c'];
  function wing(x,z,w,h,solar) {
    const accent=solar?'#91a5b6':'#969e96', col=solar?'#364d69':'#d2d6c8';
    box(x,0,z,w,.13,h,solar?['#d0a769',col,'#746247']:steel);
    for(const side of [-1,1]) {
      const p=(a,b)=>[x+(a-.5)*w,.074*side,z+(b-.5)*h], lines=[];
      for(let k=1;k<(solar?8:5);k++) lines.push([p(k/(solar?8:5),0),p(k/(solar?8:5),1),accent]);
      for(let k=1;k<(solar?5:3);k++) lines.push([p(0,k/(solar?5:3)),p(1,k/(solar?5:3)),solar?'#687f96':'#a4aaa0']);
      if(solar) lines.push([p(.5,0),p(.5,1),'#d5ab72',1.4]);
      face([p(0,0),p(1,0),p(1,1),p(0,1)],col,lines,solar?'#e4b778':'#edf0dd');
    }
  }
  function moduleZ(z0,z1,radius,x=0,y=-.2) {
    const ring=(a,z,r=radius)=>[x+Math.cos(a)*r,y+Math.sin(a)*r,z];
    const shades=['#d8ddcf','#a1aaa9','#899391','#7c8587','#889593','#aeb7af','#dce1d6','#f0eee1','#e0e2d4','#c8cfc6'];
    const ends=[[],[]];
    for(let i=0;i<10;i++) {
      const a=i*Math.PI/5,b=(i+1)*Math.PI/5;
      const lines=[.14,.81,.9].map(t=>[ring(a,z0+(z1-z0)*t),ring(b,z0+(z1-z0)*t),'#737f80',1]);
      face([ring(a,z0),ring(b,z0),ring(b,z1),ring(a,z1)],shades[i],lines,'#8b9596');
      ends[0].push(ring(a,z0));ends[1].push(ring(a,z1));
    }
    face(ends[0],'#8b9694');face(ends[1],'#e4e3d5');
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
  moduleZ(4.55,5.75,.53);box(0,-1.24,.28,1.13,.5,.86,['#f0d69f','#d5b171','#8a7350']);
  const limbAngle=66,limbX=-Math.cos(limbAngle*rad);
  const starRandom=Flight.seedStream(8180);
  const stars=Array.from({length:1500},()=>{
    const z=2*starRandom()-1,azimuth=2*Math.PI*starRandom(),radius=Math.sqrt(1-z*z);
    const brightness=starRandom();
    return {x:radius*Math.cos(azimuth),y:radius*Math.sin(azimuth),z,brightness,
      size:.95+.48*brightness,color:brightness>.94?'#a2b8c3':brightness>.72?'#768c99':'#586c79'};
  });
  const half=Flight.half,edges=[];
  for(let axis=0;axis<3;axis++)for(const j of [-1,1])for(const k of [-1,1]){
    const a=[0,0,0],b=[0,0,0];a[axis]=-half[axis];b[axis]=half[axis];
    a[(axis+1)%3]=b[(axis+1)%3]=j*half[(axis+1)%3];a[(axis+2)%3]=b[(axis+2)%3]=k*half[(axis+2)%3];edges.push([a,b]);
  }
  let atlas; const skyCache=new WeakMap(), acos=Array.from({length:2049},(_,i)=>Math.acos(i/1024-1)/rad);
  function loadEarth(img) {
    const c=document.createElement('canvas');c.width=980;c.height=327;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,c.width,c.height);
    atlas={w:c.width,h:c.height,data:ctx.getImageData(0,0,c.width,c.height).data};
  }
  function background(canvas,ctx,w,h,cam,drag) {
    const {forward,right,up,f}=cam, key=[w,h,cam.az,cam.el,!!atlas,drag].join('/');
    let cache=skyCache.get(canvas);
    if(cache?.key===key){ctx.drawImage(cache.c,0,0,w,h);return;}
    const c=cache?.c||document.createElement('canvas');
    c.width=Math.min(Math.ceil(w),drag?260:550);c.height=Math.max(1,Math.round(c.width*h/w));
    const bc=c.getContext('2d'),im=bc.createImageData(c.width,c.height),data=im.data;
    for(let j=0;j<c.height;j++) {
      const y=(h/2-(j+.5)*h/c.height)/f;
      const row=add(forward,scale(up,y));
      for(let i=0;i<c.width;i++) {
        const x=((i+.5)*w/c.width-w/2)/f,dx=row[0]+x*right[0],dy=row[1]+x*right[1],dz=row[2]+x*right[2];
        const cosine=-dx/Math.sqrt(1+x*x+y*y),index=(j*c.width+i)*4;
        let R=5,G=12,B=18;
        if(atlas && cosine>.07){
          const polar=acos[clamp(Math.round((cosine+1)*1024),0,2048)];
          const u=((Math.atan2(dz,dy)/(2*Math.PI)+1)%1);
          // A periodic reflection joins the two ends of the original horizon photograph.
          const tx=Math.min(atlas.w-1,Math.floor(Math.abs(2*u-1)*atlas.w));
          const limb=104+65*((tx/atlas.w-.5)*2)**2;
          const ty=limb+(limbAngle-polar)*6.3;
          if(ty>=0){
            const idx=4*(tx+atlas.w*clamp(Math.floor(ty),0,atlas.h-1)),blend=clamp(ty/36,0,1),fade=clamp((atlas.h-ty)/52,0,1);
            R+=(atlas.data[idx]*fade+3-R)*blend;G+=(atlas.data[idx+1]*fade+9-G)*blend;B+=(atlas.data[idx+2]*fade+14-B)*blend;
          }
        }
        data[index]=R;data[index+1]=G;data[index+2]=B;data[index+3]=255;
      }
    }
    bc.putImageData(im,0,0);skyCache.set(canvas,{key,c});ctx.drawImage(c,0,0,w,h);
  }
  const near=.09;
  function orientation(az,el){
    const forward=direction(az,el),right=direction(az-90,0),up=direction(az,el+90);
    const local=q=>[dot(q,right),dot(q,up),dot(q,forward)];
    return {forward,right,up,local};
  }
  function camera(p,az,el,w,h,small) {
    const {forward,right,up,local}=orientation(az,el);
    const f=Math.min(w*(small?.64:.75),h*(small?.87:1.05));
    const world=q=>local(sub(q,p));
    const screen=q=>[w/2+f*q[0]/q[2],h/2-f*q[1]/q[2]];
    return {az,el,forward,right,up,f,local,world,screen};
  }
  function intersect(a,b){return add(a,scale(sub(b,a),(near-a[2])/(b[2]-a[2])));}
  function clip(poly) {
    const out=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[(i+poly.length-1)%poly.length],b=poly[i];
      if((a[2]>=near)!==(b[2]>=near))out.push(intersect(a,b));
      if(b[2]>=near)out.push(b);
    }
    return out;
  }
  function stroke(ctx,a,b,color,width=1) {
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
  }
  function line3(ctx,cam,a,b,color,width) {
    let x=cam.world(a),y=cam.world(b); if(x[2]<near&&y[2]<near)return;
    if(x[2]<near)x=intersect(x,y);else if(y[2]<near)y=intersect(y,x);
    stroke(ctx,cam.screen(x),cam.screen(y),color,width);
  }
  function station(ctx,cam) {
    const sorted=faces.map(surface=>[cam.world(surface.center)[2],surface]).sort((a,b)=>b[0]-a[0]);
    for(const [,face] of sorted) {
      const clipped=clip(face.points.map(cam.world));
      if(clipped.length<3)continue;
      const xy=clipped.map(cam.screen);
      ctx.beginPath();ctx.moveTo(...xy[0]);for(const p of xy.slice(1))ctx.lineTo(...p);ctx.closePath();
      ctx.fillStyle=face.color;ctx.fill();ctx.strokeStyle=face.edge;ctx.lineWidth=.65;ctx.stroke();
      for(const [a,b,c,w] of face.lines)line3(ctx,cam,a,b,c,w||.65);
    }
    for(const [a,b] of edges)line3(ctx,cam,a,b,'#8ce8b47a',.8);
    for(const [a,b] of edges)for(const k of [0,.94])
      line3(ctx,cam,add(a,scale(sub(b,a),k)),add(a,scale(sub(b,a),k+.06)),'#b6f4c5',1.35);
  }
  function label(ctx,x,y,text,color,align='left') {
    ctx.font='600 12px "Segoe UI", Arial, sans-serif';ctx.textAlign=align;ctx.lineWidth=3.5;ctx.strokeStyle='#071018';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);
  }
  // From the suit, all points on a straight coast have one screen bearing.
  // Space curved arrows in pixels and retain one end-on mark on a flat projection.
  function courseGlyphs(cam,state,w,h){
    const hit=state.forecast.hits[state.hitIndex];
    const stop=hit?.t??state.forecast.path.at(-1).t;
    let previous=null,visible=null;
    const heads=[];
    for(const fraction of [.12,.30,.52,.74,.92]){
      const t=state.age+(stop-state.age)*fraction;
      const q=cam.world(Flight.motion(state.anchor,t,state.mode).p);
      if(q[2]<near){previous=null;continue;}
      const at=cam.screen(q);
      if(at[0]<8||at[0]>w-8||at[1]<15||at[1]>h-18){previous=null;continue;}
      visible=at;
      if(!previous){previous=at;continue;}
      const dx=at[0]-previous[0],dy=at[1]-previous[1];
      if(Math.hypot(dx,dy)<14)continue;
      heads.push({at,angle:Math.atan2(dy,dx),t});previous=at;
    }
    return {heads,visible,behind:dot(state.pos.v,cam.forward)<0};
  }
  function course(ctx,cam,state,small,w,h) {
    if(!state.time&&!state.throws)return;
    const m=state.forecast,hit=m.hits[state.hitIndex],end=hit?.t??Infinity;
    let last=state.pos.p;
    ctx.setLineDash([5,5]);
    for(const {p,t} of m.path)if(t>state.age && t<end){line3(ctx,cam,last,p,'#a2efd4',small?1.3:1.8);last=p;}
    if(hit)line3(ctx,cam,last,hit.p,'#a2efd4',1.6);
    ctx.setLineDash([]);
    const {heads,visible,behind}=courseGlyphs(cam,state,w,h);
    for(const {at,angle} of heads){
      ctx.save();ctx.translate(...at);ctx.rotate(angle);
      stroke(ctx,[-5,-3],[0,0],'#a2efd4',1.6);stroke(ctx,[0,0],[-5,3],'#a2efd4',1.6);
      ctx.restore();
    }
    if(!heads.length && visible){
      ctx.strokeStyle='#a2efd4';ctx.beginPath();ctx.arc(...visible,7,0,Math.PI*2);ctx.stroke();
      const caption=small&&w<180?'COAST':'COAST END-ON';
      label(ctx,clamp(visible[0],50,w-50),clamp(visible[1]+22,15,h-5),caption,'#b4f7df','center');
    }else if(!visible && norm(state.pos.v)>1e-7){
      const direction=behind?(small?'FORWARD':'AFT'):'OFF SCREEN';
      label(ctx,w/2,small?h-6:h/2+31,'COAST '+direction,'#b4f7df','center');
    }
    const pass=hit||m.near;
    if(pass.t<state.age-.01)return;
    if(!hit)line3(ctx,cam,pass.p,m.near.bar,'#f3b76a',1);
    const q=cam.world(pass.p);if(q[2]<near)return;
    const [x,y]=cam.screen(q);
    ctx.strokeStyle=hit && (!state.soft || Flight.softEnough(hit.speed))?'#97ecc6':'#ffc370';
    ctx.lineWidth=1.6;ctx.strokeRect(x-3.5,y-3.5,7,7);
    if(!small)label(ctx,x+9,y-6,hit?'CONTACT':'NEAREST PASS',ctx.strokeStyle);
  }
  function targetMarker(ctx,cam,canvas,w,h,small) {
    const q=cam.world([0,0,0]),xy=q[2]>near?cam.screen(q):null;
    if(xy && xy[0]>20 && xy[0]<w-20 && xy[1]>24 && xy[1]<h-20){
      if(small)return;
      const rect=canvas.getBoundingClientRect();
      const top=document.elementFromPoint(rect.left+xy[0],rect.top+xy[1]);
      if(!top?.closest('.pitchPod,.metrics,.aftPod,.lesson,.bearingReadout'))return;
    }
    let x=q[0],y=-q[1];if(Math.hypot(x,y)<.001){x=0;y=-1;}
    const len=Math.hypot(x,y);x/=len;y/=len;
    // Keep the forward cue within the open aiming area, clear of the corner panels.
    const t=Math.min((w/2-12)/(Math.abs(x)||.0001),(h/2-10)/(Math.abs(y)||.0001),small?Infinity:Math.min(w*.13,h*.19,92));
    const ex=w/2+x*t,ey=h/2+y*t,angle=Math.atan2(y,x);
    ctx.save();ctx.translate(ex,ey);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-5,-4);ctx.lineTo(-5,4);ctx.closePath();ctx.fillStyle='#a7dcc0';ctx.fill();ctx.restore();
    label(ctx,clamp(ex-x*19,15,w-15),clamp(ey-y*12+3,12,h-5),'STN','#dcffe9','center');
  }
  function drawStars(ctx,cam,w,h,state){
    // Inertial bearings rotate into the station frame as it follows its orbit.
    const angle=state.mode==='Orbital'?-Flight.n*state.time:0,c=Math.cos(angle),s=Math.sin(angle);
    const cutoff=1-clamp(w*h/320000,.20,1);
    for(const star of stars){
      if(star.brightness<cutoff)continue;
      const x=c*star.x-s*star.y,y=s*star.x+c*star.y;
      if(x<=limbX)continue;
      const q=cam.local([x,y,star.z]);
      if(q[2]<=0)continue;
      const [px,py]=cam.screen(q);
      if(px<0||px>=w||py<0||py>=h)continue;
      ctx.fillStyle=star.color;
      ctx.fillRect(px-star.size/2,py-star.size/2,star.size,star.size);
    }
  }
  function render(canvas,az,el,state,small=false) {
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    const ratio=Math.min(window.devicePixelRatio||1,1.75);
    if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);}
    const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(ratio,0,0,ratio,0,0);
    const cam=camera(state.pos.p,az,el,w,h,small);
    background(canvas,ctx,w,h,cam,!!(state.dragging||state.keyAiming));
    drawStars(ctx,cam,w,h,state);
    station(ctx,cam);course(ctx,cam,state,small,w,h);
    for(const obj of state.objects){
      const where=Flight.motion(obj.start,state.time-obj.time,state.mode).p,q=cam.world(where);if(q[2]<near)continue;
      const [x,y]=cam.screen(q),r=clamp(cam.f*.085/q[2],1.8,9);
      ctx.fillStyle='#e7b36c';ctx.fillRect(x-r,y-r/2,r*2,r);
    }
    const cx=w/2,cy=h/2,r=Math.min(w,h)*(small?.28:.34);
    const drift=cam.local(unit(state.pos.v));
    if(drift[2]>.15 && norm(state.pos.v)>1e-6){
      const [x,y]=cam.screen(drift);
      ctx.strokeStyle='#b0e6cc';ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.stroke();
      stroke(ctx,[x-9,y],[x-4,y],'#b0e6cc');stroke(ctx,[x+4,y],[x+9,y],'#b0e6cc');stroke(ctx,[x,y-8],[x,y-4],'#b0e6cc');
      if(!small && x>15&&x<w-55&&y>30&&y<h-24)label(ctx,x+12,y+4,'DRIFT','#b0e6cc');
    }
    if(!small){
      ctx.strokeStyle='#c1d7d530';ctx.lineWidth=.8;
      for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(cx,cy,r,i*Math.PI/2+.17,(i+1)*Math.PI/2-.17);ctx.stroke();}
      for(let i=0;i<48;i++){const a=i*Math.PI/24,k=i%4===0?6:2.5;stroke(ctx,[cx+Math.cos(a)*r,cy+Math.sin(a)*r],[cx+Math.cos(a)*(r+k),cy+Math.sin(a)*(r+k)],i%4===0?'#c8dcd885':'#849b9a55',.8);}
    }
    const span=small?8:17,inner=small?3:5;
    ctx.beginPath();
    for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]){
      ctx.moveTo(cx+x*inner,cy+y*inner);ctx.lineTo(cx+x*span,cy+y*span);
    }
    ctx.strokeStyle='#041018';ctx.lineWidth=4;ctx.stroke();
    ctx.strokeStyle='#70faff';ctx.lineWidth=2;ctx.stroke();
    targetMarker(ctx,cam,canvas,w,h,small);
  }
  function toolArt(canvas,i) {
    canvas.width=140;canvas.height=58;
    const c=canvas.getContext('2d');c.translate(70,30);c.rotate(-.16);
    function shape(pts,fill,edge='#738082'){c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=edge;c.lineWidth=1.2;c.stroke();}
    function rect(x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
    const silver='#bbc8c7',dark='#6c7776',amber='#cda366';
    if(i===0){rect(-27,-2,43,4,silver);shape([[5,-5],[24,-5],[28,-2],[27,4],[24,6],[5,5]],dark);rect(10,-4,12,2,amber);rect(-30,-4,6,8,silver);}
    if(i===1){rect(-3,-9,5,31,silver);shape([[-22,-11],[20,-11],[23,-7],[21,-4],[-22,-4],[-24,-8]],dark);rect(-19,-10,35,2,silver);rect(-4,16,7,5,amber);}
    if(i===2){shape([[-22,-7],[-14,-10],[17,-10],[24,-5],[24,5],[17,10],[-15,10],[-22,6]],silver);rect(-27,-4,6,8,dark);rect(-11,-9,6,18,amber);rect(8,-9,3,18,dark);}
    if(i===3){shape([[-24,-9],[-10,-15],[22,-11],[26,10],[17,14],[-25,9]],'#987950');shape([[-24,-9],[-10,-14],[23,-10],[12,-3],[-23,-4]],'#c7a675');rect(-9,-10,5,21,'#545457');rect(9,-8,4,21,'#545457');rect(-7,1,3,4,silver);}
    if(i===4){shape([[-8,-4],[3,-4],[0,14],[-4,19],[-13,15]],dark);shape([[-19,-14],[9,-14],[17,-8],[17,0],[8,5],[-17,1],[-22,-4]],amber);rect(15,-9,9,9,silver);rect(24,-6,10,3,dark);rect(-18,-13,13,5,'#696f69');rect(-15,15,17,6,'#a99c73');}
    if(i===5){shape([[-25,-9],[-13,-16],[25,-11],[25,7],[13,15],[-25,10]],dark);shape([[-25,-9],[-13,-15],[25,-11],[13,-4]],silver);shape([[13,-4],[25,-11],[25,8],[13,15]],'#7f8d8d');rect(-21,-5,28,4,amber);rect(-18,3,10,3,'#c2cbc8');}
    if(i===6){ // Spring-gate tether clip
      c.lineWidth=5;c.strokeStyle=silver;c.beginPath();c.ellipse(0,0,20,10,-.28,0,Math.PI*2);c.stroke();
      c.strokeStyle=amber;c.beginPath();c.moveTo(4,-11);c.lineTo(18,-6);c.stroke();
    }
    if(i===7){ // Hand lamp with a flared reflector and a ribbed grip
      rect(-23,-6,28,12,dark);for(const x of [-18,-12,-6])rect(x,-5,2,10,silver);
      shape([[4,-6],[18,-13],[23,-12],[23,12],[18,13],[4,6]],amber);rect(21,-11,4,22,'#dfeddb');
    }
    if(i===8){ // Protective camera housing and its recessed lens
      shape([[-24,-12],[13,-12],[23,-6],[23,12],[-24,12]],silver);rect(-19,-8,9,4,amber);
      c.fillStyle=dark;c.beginPath();c.arc(7,0,10,0,Math.PI*2);c.fill();
      c.fillStyle='#425c69';c.beginPath();c.arc(7,0,6,0,Math.PI*2);c.fill();
    }
  }
  function clockText(t){const s=Math.max(0,Math.floor(t+1e-7));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  return {render,camera,orientation,courseGlyphs,loadEarth,toolArt,clockText};
})();

// The displacement runs from the nearest grab bar to the predicted miss.
// Point the tool to that side so recoil pushes the suit back toward the bars.
function trimHint(displacement,az,elevation){
  if(Flight.norm(displacement)<1e-7)return '';
  const [right,up,forward]=Visor.orientation(az,elevation).local(Flight.unit(displacement));
  if(forward>.94)return 'Pitch straight ahead along the forward crosshair.';
  if(forward<-.94)return 'Aim almost straight behind your current view.';
  const threshold=.42*Math.max(Math.abs(right),Math.abs(up)),parts=[];
  if(Math.abs(up)>=threshold)parts.push(up>0?'up':'down');
  if(Math.abs(right)>=threshold)parts.push(right>0?'right':'left');
  const side=parts.join(' and ');
  return forward<-.25?'Turn '+side+' toward the space behind you.':'Aim '+side+' in the forward visor.';
}
