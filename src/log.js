const FlightLog = (() => {
  const num = value => (+Number(value).toFixed(2)).toString();
  const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
  function reconstruct(flight) {
    const starts=[{time:0,p:flight.initial.p,v:flight.initial.v},...flight.log.releases];
    const segments=[];
    let closest=Infinity;
    for(const [i,state] of starts.entries()){
      const end=starts[i+1]?.time??flight.time;
      const coast=Flight.forecast(state,Math.max(0,end-state.time),flight.mode);
      closest=Math.min(closest,coast.hits.length?0:coast.near.d);
      segments.push(coast.path.map(k=>({p:k.p,time:state.time+k.t})));
    }
    return {segments,closest};
  }

  // Both panels share their along-track origin, vertical origin and metres per pixel.
  function layout(segments){
    let left=-Flight.half[1],right=Flight.half[1],bottom=-Flight.half[0],top=Flight.half[0];
    for(const segment of segments)for(const {p} of segment){
      left=Math.min(left,-p[1]);right=Math.max(right,-p[1]);
      bottom=Math.min(bottom,p[0],p[2]);top=Math.max(top,p[0],p[2]);
    }
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
  function plot(flight,segments,grid,axis,compact=false){
    const {scale,cx,cy,project}=grid;
    const point=p=>project(p,axis), color=flight.done==='capture'?'#acdcb6':'#ffaa95';
    const svg=[];
    const line=(x1,y1,x2,y2,stroke,width=1)=>'<line x1="'+num(x1)+'" y1="'+num(y1)+'" x2="'+num(x2)+'" y2="'+num(y2)+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
    const label=(x,y,value,anchor='middle',fill='#afbfc4',size=11)=>'<text x="'+num(x)+'" y="'+num(y)+'" text-anchor="'+anchor+'" font-size="'+size+'" fill="'+fill+'">'+escape(value)+'</text>';
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
    const anchors=flight.log.releases.map(r=>point(r.p));
    // Card numbers match its first nine records. In a long full log, spread
    // numbered callouts over the flight and mark every other release with a dot.
    const count=Math.min(anchors.length,compact?9:16);
    const indices=Array.from({length:count},(_,i)=>compact||count===anchors.length?i:Math.round(i*(anchors.length-1)/(count-1)));
    const callouts=releaseLabels(indices.map(i=>anchors[i]),projected.flat());
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
    const numbered=new Set(indices);
    for(const [i,[x,y]] of anchors.entries()){
      if(!numbered.has(i))svg.push('<circle class="releaseDot" cx="'+num(x)+'" cy="'+num(y)+'" r="1.6" fill="#f2cc8e"><title>Throw '+(i+1)+'</title></circle>');
    }
    for(const [i,{anchor:[x,y],center:[lx,ly]}] of callouts.entries()){
      svg.push('<g class="releaseMark"><circle cx="'+num(x)+'" cy="'+num(y)+'" r="1.6" fill="#f2cc8e"/>',
        '<circle cx="'+num(lx)+'" cy="'+num(ly)+'" r="6" fill="#eac383"/>',
        label(lx,ly+3.2,indices[i]+1,'middle','#112027',9.5),'</g>');
    }
    for(const pass of flight.log.fast){
      const [x,y]=point(pass.p);svg.push(line(x-5,y-5,x+5,y+5,'#ffae74',2),line(x-5,y+5,x+5,y-5,'#ffae74',2));
    }
    const [ex,ey]=point(flight.pos.p);
    svg.push('<path d="M 0 -5 L 5 0 L 0 5 L -5 0 Z" fill="'+color+'" stroke="#172126" transform="translate('+num(ex)+' '+num(ey)+')"/>');
    svg.push(label(222,271,'← +Y along track (m)'),label(31,11,axis===0?'+X radial out (m) ↑':'+Z orbit normal (m) ↑','start'));
    return svg.join('');
  }
  function pane(flight,segments,grid,axis){
    const name=axis===0?'Orbital plane · V-bar / R-bar':'Along-track / cross-track';
    return '<figure><figcaption>'+name+'</figcaption><svg viewBox="0 0 430 276" role="img" aria-label="'+name+' flight path, full grab envelope and numbered releases">'+plot(flight,segments,grid,axis)+'</svg></figure>';
  }
  function precise(t){
    const ms=Math.round(t*1000);
    return Visor.clockText(Math.floor(ms/1000))+'.'+String(ms%1000).padStart(3,'0');
  }
  function resultReadout(flight){
    const rescued=flight.done==='capture';
    const original=Flight.budgets[Flight.fullRack];
    const recovered=rescued?Flight.budgets[flight.mask]:0;
    return {
      budget:flight.story?'Unlimited tools · auto-reload':'Δv brought home '+recovered.toFixed(3)+' / '+original.toFixed(3)+' m/s ('+(100*recovered/original).toFixed(1)+'%)',
      speed:(rescued?'Grab speed ':'Final relative speed ')+Readout.speed(Flight.norm(flight.pos.v))+' m/s'
    };
  }
  function card(flight){
    const {segments,closest}=reconstruct(flight);
    const date=new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(flight.finishedAt);
    const seed=seedLabel(flight.seed),result=outcomes[flight.done];
    const rules=[flight.mode,flight.story?'Story':'Manual',flight.soft?'Soft capture':'Any-speed capture'].join(' · ');
    const elapsed=precise(flight.time),oxygen=Visor.clockText(Math.ceil(flight.limit-flight.time));
    const {budget,speed}=resultReadout(flight),releases=flight.log.releases;
    const clearance=flight.done==='capture'?'':'Closest clearance '+Readout.clearance(closest,2)+' m';
    const passCount=flight.misses?Readout.count(flight.misses,'fast pass','fast passes'):'';
    const passDetails=[clearance,passCount].filter(Boolean).join('   ·   ');
    const recordY=509+(passDetails?20:0);
    const records=releases.slice(0,9).map((r,i)=>(i+1)+'.  '+Visor.clockText(r.time)+'  '+Flight.gear[r.tool].name+'  '+r.power+'%');
    if(releases.length>9)records.push('10. ...and then some');
    const rows=Math.max(1,Math.min(5,records.length)),height=recordY+10+rows*17;
    const label=(x,y,text,size,color,attrs='')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'" '+attrs+'>'+escape(text)+'</text>';
    const description='Fastball 3D · '+date+' · Random drift '+seed+' · '+rules+'\n'+
      [result+' in '+elapsed,Readout.count(releases.length,'throw'),oxygen+' oxygen',budget,speed,clearance,passCount].filter(Boolean).join(' · ');
    const parts=['<svg xmlns="http://www.w3.org/2000/svg" width="470" height="'+height+'" viewBox="0 0 470 '+height+'" role="img" aria-labelledby="flightCardTitle flightCardDesc" font-family="'+escape(cockpitFonts.sans)+'">',
      '<title id="flightCardTitle">Random drift · '+escape(result)+'</title><desc id="flightCardDesc">'+escape(description)+'</desc>',
      '<rect width="470" height="'+height+'" rx="9" fill="#101a20"/>',
      label(20,27,'FASTBALL 3D',14,'#f7bc62','font-weight="bold" letter-spacing="1.8"'),label(450,27,date,13,'#c5d1d0','text-anchor="end"'),
      label(20,62,result,28,'#f4f1e8','font-weight="bold"'),label(20,84,'Random drift  /  '+seed,15,'#a8e4d0','font-family="'+escape(cockpitFonts.mono)+'"'),
      label(20,104,rules,13,'#c5d1d0'),'<rect x="12" y="115" width="446" height="309" rx="5" fill="#0b141b" stroke="#354046"/>',
      label(22,136,'Orbital plane · V-bar / R-bar',13,'#f4f1e8','font-weight="bold"'),
      '<g transform="translate(20 143)" font-family="'+escape(cockpitFonts.mono)+'">'+plot(flight,segments,layout(segments),0,true)+'</g>',
      label(20,446,budget,15,'#a8e4d0','font-weight="bold"'),label(20,466,speed,14,'#a8e4d0'),
      label(20,486,elapsed+' elapsed   ·   '+oxygen+' oxygen   ·   '+(flight.story?Readout.count(releases.length,'throw'):releases.length+'/'+Flight.gear.length+' tools used'),14,'#f4f1e8')];
    if(passDetails)parts.push(label(20,506,passDetails,14,'#c5d1d0'));
    parts.push(label(20,recordY,'Release record',13,'#f7bc62','font-weight="bold"'));
    if(!releases.length)parts.push(label(20,recordY+19,'No tools released',12,'#c5d1d0'));
    records.forEach((text,i)=>parts.push(label(i<5?20:245,recordY+19+17*(i%5),text,12,'#d7dfe1')));
    return parts.join('')+'</svg>';
  }
  function show(flight){
    const {segments,closest}=reconstruct(flight),grid=layout(segments);
    const tools=Flight.gear.filter((_,i)=>flight.mask&(1<<i)).length;
    const result=outcomes[flight.done];
    const {budget,speed}=resultReadout(flight);
    el('logTitle').textContent=flight.initial.name+' · Flight log';
    el('logSummary').textContent=[result,flight.mode,flight.soft?'Soft ≤ '+Flight.limit.toFixed(3)+' m/s':'Any-speed capture',
      flight.index===3?'Seed '+seedLabel(flight.seed):'',precise(flight.time)+' elapsed',
      Visor.clockText(Math.ceil(flight.limit-flight.time))+' oxygen',flight.story?Readout.count(flight.throws,'throw'):tools+'/'+Flight.gear.length+' tools aboard',
      budget,speed,flight.done==='capture'?'':'Closest clearance '+Readout.clearance(closest,2)+' m'].filter(Boolean).join('  ·  ');
    el('logPanes').innerHTML=[0,2].map(axis=>pane(flight,segments,grid,axis)).join('');
    el('logEvents').textContent=['Start 0:00',...flight.log.fast.map(h=>'Fast entry '+precise(h.time)+' at '+Readout.speed(h.speed)+' m/s'),result+' '+precise(flight.time)].join('  ·  ');
    const list=el('logThrows');list.replaceChildren();
    if(!flight.throws)list.textContent='No tools released.';
    for(const r of flight.log.releases){
      const item=document.createElement('li'),detail=document.createElement('small');
      const [az,elev]=Flight.angles(r.dir);
      item.textContent=precise(r.time)+' · '+Flight.gear[r.tool].name+' · '+r.power+'% · HDG '+Readout.heading(az,2)+'° / EL '+num(elev)+'°';
      detail.textContent='XYZ position ('+r.p.map(num).join(', ')+') m · velocity ('+r.v.map(v=>Readout.signed(v,4,false)).join(', ')+') m/s';
      item.append(detail);list.append(item);
    }
  }
  return {reconstruct,layout,show,card,resultReadout};
})();
