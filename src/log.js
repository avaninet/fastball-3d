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
  function pane(flight,segments,grid,axis){
    const {scale,cx,cy,project}=grid;
    const point=p=>project(p,axis), color=flight.done==='capture'?'#acdcb6':'#ffaa95';
    const svg=[],labels=[];
    const line=(x1,y1,x2,y2,stroke,width=1)=>'<line x1="'+num(x1)+'" y1="'+num(y1)+'" x2="'+num(x2)+'" y2="'+num(y2)+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
    const label=(x,y,value,anchor='middle',fill='#afbfc4')=>'<text x="'+num(x)+'" y="'+num(y)+'" text-anchor="'+anchor+'" font-size="11" fill="'+fill+'">'+value+'</text>';
    const step=[1,2,5,10,20,50,100,200].find(s=>s*scale>=38)??500;
    for(let i=Math.ceil((30-cx)/(step*scale));cx+i*step*scale<407;i++){
      const x=cx+i*step*scale;svg.push(line(x,14,x,236,i?'#25323a':'#637782'),label(x,251,-i*step));
    }
    for(let i=Math.ceil((cy-232)/(step*scale));cy-i*step*scale>=14;i++){
      const y=cy-i*step*scale;svg.push(line(30,y,407,y,i?'#25323a':'#637782'),label(26,y+4,i*step,'end'));
    }
    const half=Flight.half;
    svg.push('<rect x="'+num(cx-half[1]*scale)+'" y="'+num(cy-half[axis]*scale)+'" width="'+num(2*half[1]*scale)+'" height="'+num(2*half[axis]*scale)+'" fill="#29493d" stroke="#91c4a4"/>');
    for(const seg of segments){
      const xy=seg.map(k=>point(k.p));
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
    for(const [i,r] of flight.log.releases.entries()){
      const [x,y]=point(r.p);
      // Move coincident release labels off the trace, preserving their precise anchors.
      const offsets=[[-10,-13],[12,-13],[-13,13],[13,13],[-29,0],[29,0],[-24,-23],[24,23]];
      const [dx,dy]=offsets.find(([a,b])=>labels.every(([u,v])=>Math.hypot(x+a-u,y+b-v)>16))??[0,-24];
      const lx=x+dx,ly=y+dy;labels.push([lx,ly]);
      svg.push(line(x,y,lx,ly,'#e6b771'),'<circle cx="'+num(lx)+'" cy="'+num(ly)+'" r="8" fill="#eac383"/>',label(lx,ly+4,i+1,'middle','#112027'));
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
