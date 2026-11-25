const FlightLog = (() => {
  const num = value => (+value.toFixed(2)).toString();
  function reconstruct(flight) {
    const starts=[{time:0,p:flight.initial.p,v:flight.initial.v},...flight.log.releases];
    const segments=[];
    let closest=Infinity;
    for(const [i,state] of starts.entries()){
      const end=starts[i+1]?.time??flight.time;
      const coast=Flight.forecast(state,Math.max(0,end-state.time),flight.mode);
      closest=Math.min(closest,coast.near.d);
      segments.push(coast.path.map(k=>({p:k.p,time:state.time+k.t})));
    }
    return {segments,closest};
  }

  // Both panels share their along-track origin, vertical origin and metres per pixel.
  function layout(segments){
    const points=segments.flat().map(k=>k.p);
    const extent=(values,minimum)=>[Math.min(-minimum,...values),Math.max(minimum,...values)];
    const [left,right]=extent(points.map(p=>-p[1]),Flight.half[1]);
    const [bottom,top]=extent(points.flatMap(p=>[p[0],p[2]]),Flight.half[0]);
    const scale=Math.min(344/Math.max(15,right-left),186/Math.max(15,top-bottom));
    const cx=222-(left+right)*scale/2,cy=126+(top+bottom)*scale/2;
    return {scale,cx,cy,project:(p,axis)=>[cx-p[1]*scale,cy-p[axis]*scale]};
  }
  function distanceToSegment(p,a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1],length2=dx*dx+dy*dy;
    const t=length2?Flight.clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length2,0,1):0;
    return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
  }
  function releaseLabels(anchors,trace){
    const placed=[];
    const traceGap=p=>{
      let gap=Infinity;
      for(let j=1;j<trace.length;j++)gap=Math.min(gap,distanceToSegment(p,trace[j-1],trace[j]));
      return gap;
    };
    for(const anchor of anchors){
      const [x,y]=anchor;
      let best,lowest=Infinity;
      // Try several rings so even nine pitches at the same spot can fan out.
      for(const radius of [25,36,48,64])for(let j=0;j<16;j++){
        const angle=(j-4)*Math.PI/8;
        const lx=x+radius*Math.cos(angle),ly=y+radius*Math.sin(angle);
        if(lx<38||lx>400||ly<23||ly>228)continue;
        const center=[lx,ly];
        let cost=radius+16*Math.max(0,12-traceGap(center));
        // Favor leaders that leave the path sideways instead of following it.
        cost+=3*Math.max(0,8-traceGap([(x+lx)/2,(y+ly)/2]));
        for(const old of placed){
          const gap=Math.hypot(lx-old.center[0],ly-old.center[1]);
          cost+=100*Math.max(0,16-gap);
          cost+=5*Math.max(0,8-distanceToSegment(old.center,anchor,center));
          cost+=5*Math.max(0,8-distanceToSegment(center,old.anchor,old.center));
        }
        if(cost<lowest){lowest=cost;best=center;}
      }
      placed.push({anchor,center:best});
    }
    return placed;
  }
  function pane(flight,segments,grid,axis){
    const {scale,cx,cy,project}=grid;
    const point=p=>project(p,axis), color=flight.done==='capture'?'#acdcb6':'#ffaa95';
    const svg=[];
    const line=(x1,y1,x2,y2,stroke,width=1)=>'<line x1="'+num(x1)+'" y1="'+num(y1)+'" x2="'+num(x2)+'" y2="'+num(y2)+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
    const label=(x,y,value,anchor='middle',fill='#afbfc4',size=11)=>'<text x="'+num(x)+'" y="'+num(y)+'" text-anchor="'+anchor+'" font-size="'+size+'" fill="'+fill+'">'+value+'</text>';
    const step=[1,2,5,10,20,50,100,200].find(s=>s*scale>=38)??500;
    for(let i=Math.ceil((30-cx)/(step*scale));cx+i*step*scale<407;i++){
      const x=cx+i*step*scale;svg.push(line(x,14,x,236,i?'#25323a':'#637782'),label(x,251,-i*step));
    }
    for(let i=Math.ceil((cy-232)/(step*scale));cy-i*step*scale>=14;i++){
      const y=cy-i*step*scale;svg.push(line(30,y,407,y,i?'#25323a':'#637782'),label(26,y+4,i*step,'end'));
    }
    const half=Flight.half;
    svg.push('<rect x="'+num(cx-half[1]*scale)+'" y="'+num(cy-half[axis]*scale)+'" width="'+num(2*half[1]*scale)+'" height="'+num(2*half[axis]*scale)+'" fill="#29493d" stroke="#91c4a4"/>');
    const projected=segments.map(seg=>seg.map(k=>point(k.p)));
    const callouts=releaseLabels(flight.log.releases.map(r=>point(r.p)),projected.flat());
    for(const {anchor:[x,y],center:[lx,ly]} of callouts)svg.push(line(x,y,lx,ly,'#b3976c',.8));
    for(const xy of projected){
      svg.push('<polyline fill="none" stroke="#99e1cc" stroke-width="2" points="'+xy.map(p=>p.map(num).join(',')).join(' ')+'"/>');
      let last=xy[0],distance=0;
      for(const next of xy.slice(1)){
        const dx=next[0]-last[0],dy=next[1]-last[1];distance+=Math.hypot(dx,dy);
        if(distance>33){
          const angle=Math.atan2(dy,dx)*180/Math.PI;
          svg.push('<path d="M -6 -3 L 0 0 L -6 3" fill="none" stroke="#c8ffed" stroke-width="2" transform="translate('+next.map(num).join(' ')+') rotate('+num(angle)+')"/>');
          distance=0;
        }
        last=next;
      }
    }
    const [startX,startY]=point(flight.initial.p);
    svg.push('<rect x="'+num(startX-4)+'" y="'+num(startY-4)+'" width="8" height="8" fill="#0b141b" stroke="#e9eada" stroke-width="2"/>');
    for(const [i,{anchor:[x,y],center:[lx,ly]}] of callouts.entries()){
      svg.push('<g class="releaseMark"><circle cx="'+num(x)+'" cy="'+num(y)+'" r="1.6" fill="#f2cc8e"/>',
        '<circle cx="'+num(lx)+'" cy="'+num(ly)+'" r="6" fill="#eac383"/>',
        label(lx,ly+3.2,i+1,'middle','#112027',9.5),'</g>');
    }
    for(const pass of flight.log.fast){
      const [x,y]=point(pass.p);svg.push(line(x-5,y-5,x+5,y+5,'#ffae74',2),line(x-5,y+5,x+5,y-5,'#ffae74',2));
    }
    const [ex,ey]=point(flight.pos.p);
    svg.push('<path d="M 0 -5 L 5 0 L 0 5 L -5 0 Z" fill="'+color+'" stroke="#172126" transform="translate('+num(ex)+' '+num(ey)+')"/>');
    svg.push(label(222,271,'← +Y along track (m)'),label(31,11,axis===0?'+X radial out (m) ↑':'+Z orbit normal (m) ↑','start'));
    const name=axis===0?'Orbital plane · V-bar / R-bar':'Along-track / cross-track';
    return '<figure><figcaption>'+name+'</figcaption><svg viewBox="0 0 430 276" role="img" aria-label="'+name+' flight path, full grab envelope and numbered releases">'+svg.join('')+'</svg></figure>';
  }
  function show(flight){
    const {segments,closest}=reconstruct(flight),grid=layout(segments);
    const precise=t=>{
      const ms=Math.round(t*1000);
      return Visor.clockText(Math.floor(ms/1000))+'.'+String(ms%1000).padStart(3,'0');
    };
    const tools=Flight.gear.filter((_,i)=>flight.mask&(1<<i)).length;
    const result=outcomes[flight.done];
    el('logTitle').textContent=flight.initial.name+' · Flight log';
    el('logSummary').textContent=[result,flight.mode,flight.soft?'Soft ≤ 0.080 m/s':'Any-speed capture',
      flight.index===3?'Seed '+seedLabel(flight.seed):'',precise(flight.time)+' elapsed',
      Visor.clockText(Math.ceil(flight.limit-flight.time))+' oxygen',tools+'/'+Flight.gear.length+' tools aboard',
      flight.done==='capture'?'Entry '+Flight.norm(flight.pos.v).toFixed(3)+' m/s':'Closest clearance '+closest.toFixed(2)+' m'].filter(Boolean).join('  ·  ');
    el('logPanes').innerHTML=[0,2].map(axis=>pane(flight,segments,grid,axis)).join('');
    el('logEvents').textContent=['Start 0:00',...flight.log.fast.map(h=>'Fast entry '+precise(h.time)+' at '+h.speed.toFixed(3)+' m/s'),result+' '+precise(flight.time)].join('  ·  ');
    const list=el('logThrows');list.replaceChildren();
    if(!flight.throws)list.textContent='No tools released.';
    for(const r of flight.log.releases){
      const item=document.createElement('li'),detail=document.createElement('small');
      const [az,elev]=Flight.angles(r.dir);
      item.textContent=precise(r.time)+' · '+Flight.gear[r.tool].name+' · '+r.power+'% · HDG '+num((az+360)%360)+'° / EL '+num(elev)+'°';
      detail.textContent='XYZ position ('+r.p.map(num).join(', ')+') m · velocity ('+r.v.map(v=>v.toFixed(4)).join(', ')+') m/s';
      item.append(detail);list.append(item);
    }
  }
  return {reconstruct,layout,show};
})();
