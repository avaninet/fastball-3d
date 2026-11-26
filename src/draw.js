const fontStyle=getComputedStyle(document.documentElement);
const cockpitFonts={sans:fontStyle.getPropertyValue('--sans').trim(),mono:fontStyle.getPropertyValue('--mono').trim()};
const Visor = (() => {
  const {add,sub,scale,dot,norm,unit,clamp}=Flight;
  const starRandom=Flight.seedStream(8180);
  const stars=Array.from({length:1500},()=>{
    const z=2*starRandom()-1,azimuth=2*Math.PI*starRandom(),radius=Math.sqrt(1-z*z);
    const brightness=starRandom();
    return {x:radius*Math.cos(azimuth),y:radius*Math.sin(azimuth),z,brightness,
      size:1.24+.59*brightness,color:brightness>.94?'#e4eff8':brightness>.72?'#c3d6e5':'#98afbf'};
  });
  const half=Flight.half,edges=[];
  for(let axis=0;axis<3;axis++)for(const j of [-1,1])for(const k of [-1,1]){
    const a=[0,0,0],b=[0,0,0];a[axis]=-half[axis];b[axis]=half[axis];
    a[(axis+1)%3]=b[(axis+1)%3]=j*half[(axis+1)%3];a[(axis+2)%3]=b[(axis+2)%3]=k*half[(axis+2)%3];edges.push([a,b]);
  }
  const near=.09;
  function camera(p,az,el,w,h,small) {
    const {forward,right,up,local}=orientation(az,el);
    const f=Math.min(w*(small?.64:.75),h*(small?.87:1.05));
    const world=q=>local(sub(q,p));
    const screen=q=>[w/2+f*q[0]/q[2],h/2-f*q[1]/q[2]];
    return {p,az,el,forward,right,up,f,local,world,screen};
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
  // Project the distance between opposite edges perpendicular to their length.
  // This keeps lighting fixed to the metal and measures actual grid spacing
  // even when a wing is nearly edge-on in the aft camera.
  function faceSpan(xy,axis){
    const a=xy[0],b=xy[axis===0?1:3],c=xy[2],d=xy[axis===0?3:1];
    const x=(a[0]+d[0])/2,y=(a[1]+d[1])/2;
    let dx=(b[0]+c[0])/2-x,dy=(b[1]+c[1])/2-y;
    const ex=d[0]-a[0]+c[0]-b[0],ey=d[1]-a[1]+c[1]-b[1],len2=ex*ex+ey*ey;
    if(len2>1e-6){
      const parallel=(dx*ex+dy*ey)/len2;
      dx-=ex*parallel;dy-=ey*parallel;
    }
    return {x,y,dx,dy,length:Math.hypot(dx,dy)};
  }
  function polygon(ctx,xy){
    ctx.beginPath();ctx.moveTo(...xy[0]);for(let i=1;i<xy.length;i++)ctx.lineTo(...xy[i]);ctx.closePath();
  }
  function station(ctx,cam) {
    Station.forEachVisibleFace(cam.p,face=>{
      const vertices=face.points.map(cam.world),whole=vertices.every(q=>q[2]>=near);
      const clipped=whole?vertices:clip(vertices);
      if(clipped.length<3)return;
      const xy=clipped.map(cam.screen);
      // A clipped polygon no longer has the four material corners.
      const across=whole&&(face.tones||face.grid)?faceSpan(xy,0):null;
      let fill=face.color;
      if(face.tones && across && across.length>=2){
        const {x,y,dx,dy}=across;
        fill=ctx.createLinearGradient(x,y,x+dx,y+dy);
        fill.addColorStop(0,face.tones[0]);fill.addColorStop(1,face.tones[1]);
      }
      polygon(ctx,xy);ctx.fillStyle=fill;ctx.fill();
      ctx.strokeStyle=face.edge??fill;ctx.lineWidth=.65;ctx.stroke();
      if(face.grid){
        const spans=[across,whole?faceSpan(xy,1):null];
        for(const [axis,lines] of face.grid.entries()){
          const spacing=spans[axis]?spans[axis].length/face.divisions[axis]:Infinity;
          if(spacing<=1)continue;
          const alpha=ctx.globalAlpha;
          if(spacing<2.5)ctx.globalAlpha=alpha*(spacing-1)/1.5;
          for(const [a,b,color] of lines)line3(ctx,cam,a,b,color,.65);
          if(spacing<2.5)ctx.globalAlpha=alpha;
        }
      }
      for(const [a,b,c,w] of face.lines)line3(ctx,cam,a,b,c,w||.65);
      if(face.stripes?.length){
        ctx.fillStyle='#d39c48';
        for(const stripe of face.stripes){
          const visible=clip(stripe.map(cam.world));
          if(visible.length>=3){polygon(ctx,visible.map(cam.screen));ctx.fill();}
        }
      }
    });
    for(const [a,b] of edges)line3(ctx,cam,a,b,'#8ce8b47a',.8);
    for(const [a,b] of edges)for(const k of [0,.94])
      line3(ctx,cam,add(a,scale(sub(b,a),k)),add(a,scale(sub(b,a),k+.06)),'#b6f4c5',1.35);
  }
  function captions(ctx,canvas,w,small) {
    const stage=canvas.closest('.hudStage'),view=canvas.getBoundingClientRect();
    const covers=small||!stage?[]:Array.from(stage.querySelectorAll('.metrics,.pitchPod,.aftPod'),p=>p.getBoundingClientRect());
    return (x,y,text,color,align='left')=>{
      ctx.font='600 12px '+cockpitFonts.sans;
      let left=0,right=w;
      for(const box of covers){
        if(view.top+y+3<=box.top||view.top+y-12>=box.bottom)continue;
        if(box.left<=view.left+1)left=Math.max(left,box.right-view.left+3);
        else right=Math.min(right,box.left-view.left-3);
      }
      if(x<left||x>right)return;
      const width=ctx.measureText(text).width,offset=align==='center'?width/2:0;
      if(width>right-left)return;
      x=clamp(x,left+offset,right-width+offset);
      ctx.textAlign=align;ctx.lineWidth=3.5;ctx.strokeStyle='#071018';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);
    };
  }
  // Measure from the suit in metres. A coast that curves back toward the
  // viewer should brighten again even though those samples are later in time.
  function depthWeight(range){return 14/(14+range);}
  function coastInk(weight,preview){
    if(preview)return 'rgb('+Math.round(163+77*weight)+','+Math.round(117+81*weight)+','+Math.round(214+41*weight)+')';
    return 'rgb('+Math.round(100+91*weight)+','+Math.round(172+82*weight)+','+Math.round(171+59*weight)+')';
  }
  function coastPath(ctx,cam,state,hit,small,preview){
    let previous=cam.world(state.pos.p),dashOffset=0;
    function segment(point){
      const current=cam.world(point);
      let a=previous,b=current;
      previous=current;
      if(a[2]<near&&b[2]<near){dashOffset=0;return;}
      if(a[2]<near)a=intersect(a,b);else if(b[2]<near)b=intersect(b,a);
      const start=cam.screen(a),end=cam.screen(b);
      const weight=(depthWeight(norm(a))+depthWeight(norm(b)))/2;
      ctx.lineDashOffset=dashOffset;
      stroke(ctx,start,end,coastInk(weight,preview),(small?1.1:1.4)+weight);
      dashOffset=(dashOffset+Math.hypot(end[0]-start[0],end[1]-start[1]))%10;
    }
    ctx.save();ctx.setLineDash(preview?[]:[5,5]);
    if(preview)ctx.lineCap='round';
    for(const {p,t} of state.forecast.path){
      if(hit&&t>=hit.t)break;
      if(t>state.age)segment(p);
    }
    if(hit)segment(hit.p);
    ctx.restore();
  }
  // From the suit, all points on a straight coast have one screen bearing.
  // Space curved arrows in pixels and retain one end-on mark on a flat projection.
  function courseGlyphs(cam,state,w,h,hit=state.forecast.hits[state.hitIndex]){
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
      heads.push({at,angle:Math.atan2(dy,dx),t,range:norm(q)});previous=at;
    }
    return {heads,visible,behind:dot(state.pos.v,cam.forward)<0};
  }
  function course(ctx,cam,state,small,w,h,label,preview=false) {
    if(!preview&&!state.time&&!state.throws)return;
    const m=state.forecast;
    const hit=preview&&state.soft?m.hits.find(entry=>Flight.softEnough(entry.speed)):m.hits[state.hitIndex];
    coastPath(ctx,cam,state,hit,small,preview);
    const {heads,visible,behind}=courseGlyphs(cam,state,w,h,hit??null);
    for(const {at,angle,range} of heads){
      const weight=depthWeight(range),length=(small?3.8:4.6)+(small?4:6)*weight;
      ctx.save();ctx.translate(...at);ctx.rotate(angle);
      ctx.beginPath();ctx.moveTo(-length,-length*.62);ctx.lineTo(0,0);ctx.lineTo(-length,length*.62);
      if(preview)ctx.closePath();
      ctx.lineJoin='round';ctx.lineWidth=3.4;ctx.strokeStyle='#0b1b22';ctx.stroke();
      ctx.lineWidth=1.4+.65*weight;ctx.strokeStyle=coastInk(weight,preview);
      if(preview){ctx.fillStyle=ctx.strokeStyle;ctx.fill();}
      ctx.stroke();
      ctx.restore();
    }
    if(preview){
      const pass=m.hits[0]||m.near,q=cam.world(pass.p);
      if(q[2]>=near){
        const [x,y]=cam.screen(q),r=3+3*depthWeight(norm(q));
        ctx.strokeStyle='#dfb3fd';ctx.lineWidth=1.7;ctx.beginPath();
        ctx.moveTo(x-r,y);ctx.lineTo(x+r,y);ctx.moveTo(x,y-r);ctx.lineTo(x,y+r);ctx.stroke();
      }
      if(!heads.length&&visible){
        const [x,y]=visible,end=hit||m.path.at(-1);
        const radius=8+4*depthWeight(norm(sub(end.p,state.pos.p)));
        ctx.beginPath();ctx.moveTo(x,y-radius);ctx.lineTo(x+radius,y);ctx.lineTo(x,y+radius);ctx.lineTo(x-radius,y);ctx.closePath();
        ctx.lineWidth=1.8;ctx.strokeStyle='#e1b3ff';ctx.stroke();
        label(x,clamp(y-radius-5,14,h-5),'AFTER THROW','#eed5ff','center');
      }else if(!visible){
        const where=behind?(small?'FORWARD':'AFT'):'OFF SCREEN';
        label(w/2,small?14:h/2-30,'PREVIEW '+where,'#eed5ff','center');
      }
      return;
    }
    if(!heads.length && visible){
      ctx.strokeStyle='#a2efd4';ctx.beginPath();ctx.arc(...visible,7,0,Math.PI*2);ctx.stroke();
      const lines=[small&&w<180?'END-ON':'COAST END-ON'];
      if(state.mode==='Straight-Line'){
        const range=norm(sub((hit||m.path.at(-1)).p,state.pos.p));
        const metres=range<.1?'<0.1':range.toFixed(range<10?1:0);
        lines.push(metres+' m '+(hit?'to contact':'at O₂ expiry'));
      }
      ctx.font='600 12px '+cockpitFonts.sans;
      const halfLabel=Math.min(w/2,Math.max(...lines.map(s=>ctx.measureText(s).width))/2+3);
      const x=clamp(visible[0],halfLabel,w-halfLabel),height=14*(lines.length-1);
      const below=visible[1]+22;
      const y=clamp(below+height<=h-4?below:visible[1]-13-height,13,h-4-height);
      lines.forEach((s,i)=>label(x,y+i*14,s,'#b4f7df','center'));
    }else if(!visible && norm(state.pos.v)>1e-7){
      const direction=behind?(small?'FORWARD':'AFT'):'OFF SCREEN';
      label(w/2,small?h-6:h/2+31,'COAST '+direction,'#b4f7df','center');
    }
    const pass=hit||Flight.coastPass(m,state.age);
    if(pass.t<state.age-.01)return;
    if(!hit)line3(ctx,cam,pass.p,pass.bar,'#f3b76a',1);
    const q=cam.world(pass.p);if(q[2]<near)return;
    const [x,y]=cam.screen(q);
    ctx.strokeStyle=hit && (!state.soft || Flight.softEnough(hit.speed))?'#97ecc6':'#ffc370';
    ctx.lineWidth=1.6;ctx.strokeRect(x-3.5,y-3.5,7,7);
    if(!small)label(x+9,y-6,hit?'CONTACT':'NEAREST PASS',ctx.strokeStyle);
  }
  function targetMarker(ctx,cam,canvas,w,h,small,label) {
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
    label(clamp(ex-x*19,15,w-15),clamp(ey-y*12+3,12,h-5),'STN','#dcffe9','center');
  }
  function drawStars(ctx,cam,w,h,state,sceneHeight){
    // Inertial bearings rotate into the station frame as it follows its orbit.
    const angle=state.mode==='Orbital'?-Flight.n*state.time:0,c=Math.cos(angle),s=Math.sin(angle);
    const cutoff=1-clamp(w*h/320000,.30,1);
    for(const star of stars){
      if(star.brightness<cutoff)continue;
      const x=c*star.x-s*star.y,y=s*star.x+c*star.y;
      if(x<=EarthSky.limbX)continue;
      const q=cam.local([x,y,star.z]);
      if(q[2]<=0)continue;
      const [px,py]=cam.screen(q);
      if(px<0||px>=w||py<0||py>=sceneHeight)continue;
      ctx.fillStyle=star.color;
      ctx.fillRect(px-star.size/2,py-star.size/2,star.size,star.size);
    }
  }
  function render(canvas,az,el,state,small=false,backdrop=null,preview=null) {
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    const ratio=Math.min(window.devicePixelRatio||1,1.75);
    const width=Math.round(w*ratio),height=Math.round(h*ratio);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    // On phones the rack sits below the aiming area. Extend the same projection
    // under it while keeping the reticle, lens and touch coordinates in place.
    const surface=backdrop?.clientHeight?backdrop:canvas,sceneHeight=surface.clientHeight;
    if(surface!==canvas&&(surface.width!==width||surface.height!==Math.round(sceneHeight*ratio))){
      surface.width=width;surface.height=Math.round(sceneHeight*ratio);
    }
    const ctx=surface.getContext('2d',{alpha:false});ctx.setTransform(ratio,0,0,ratio,0,0);
    const cam=camera(state.pos.p,az,el,w,h,small);
    EarthSky.draw(ctx,w,sceneHeight,h/2,cam);
    drawStars(ctx,cam,w,h,state,sceneHeight);
    const label=captions(ctx,canvas,w,small);
    station(ctx,cam);
    Equipment.draw(ctx,cam,w,sceneHeight,state.objects,small);
    if(preview)course(ctx,cam,preview,small,w,h,label,true);
    course(ctx,cam,state,small,w,h,label);
    const cx=w/2,cy=h/2,r=Math.min(w,h)*(small?.28:.34);
    const drift=cam.local(unit(state.pos.v));
    if(drift[2]>.15 && norm(state.pos.v)>1e-6){
      const [x,y]=cam.screen(drift);
      ctx.strokeStyle='#b0e6cc';ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.stroke();
      stroke(ctx,[x-9,y],[x-4,y],'#b0e6cc');stroke(ctx,[x+4,y],[x+9,y],'#b0e6cc');stroke(ctx,[x,y-8],[x,y-4],'#b0e6cc');
      if(!small && x>15&&x<w-55&&y>30&&y<h-24)label(x+12,y+4,'DRIFT','#b0e6cc');
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
    targetMarker(ctx,cam,canvas,w,h,small,label);
    if(surface!==canvas){
      const view=canvas.getContext('2d',{alpha:false});
      view.save();view.resetTransform();
      view.drawImage(surface,0,0,width,height,0,0,width,height);view.restore();
    }
  }
  function clockText(t){const s=Math.max(0,Math.floor(t+1e-7));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  return {render,camera,courseGlyphs,loadEarth:EarthSky.load,toolArt:Equipment.toolArt,clockText};
})();
