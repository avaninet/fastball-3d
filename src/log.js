const FlightLog = (() => {
  const num = value => (+Number(value).toFixed(2)).toString();
  const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
  function reconstruct(flight) {
    const starts=[{time:0,p:flight.initial.p,v:flight.initial.v},...flight.log.releases];
    const segments=[];
    const bodies=flight.debrisPieces??[];
    const tracks=bodies.map((body,i)=>{
      const samples=Math.max(1,Math.ceil(flight.time/5));
      const points=Array.from({length:samples+1},(_,j)=>Flight.motion(body,flight.time*j/samples,flight.mode).p);
      return {name:body.short,color:i?'#d0a2ef':'#ff9852',dash:i?'2 4':'8 5',points,gap:Infinity,time:0};
    });
    let closest=Infinity;
    for(const [i,state] of starts.entries()){
      const end=starts[i+1]?.time??flight.time;
      const coast=Flight.forecast(state,Math.max(0,end-state.time),flight.mode,false,false,flight.pose);
      closest=Math.min(closest,coast.hits.length?0:coast.near.d);
      segments.push(coast.path.map(k=>({p:k.p,time:state.time+k.t})));
      if(tracks.length){
        const encounters=Debris.forecast(state,state.time,end-state.time,flight.mode,bodies);
        encounters.approaches.forEach((pass,j)=>{
          if(pass.gap<tracks[j].gap){
            tracks[j].gap=Math.max(0,pass.gap);
            tracks[j].time=state.time+pass.tNear;
          }
        });
      }
    }
    return {segments,closest,tracks};
  }

  // Both panels share their along-track origin, vertical origin and metres per pixel.
  function layout(segments,pose=Flight.poses[0]){
    let left=-Flight.half[1],right=Flight.half[1],bottom=-Flight.half[0],top=Flight.half[0];
    for(const segment of [...segments,pose.corners.map(p=>({p}))])for(const {p} of segment){
      left=Math.min(left,-p[1]);right=Math.max(right,-p[1]);
      bottom=Math.min(bottom,p[0],p[2]);top=Math.max(top,p[0],p[2]);
    }
    const scale=Math.min(344/Math.max(15,right-left),186/Math.max(15,top-bottom));
    const cx=222-(left+right)*scale/2,cy=126+(top+bottom)*scale/2;
    return {scale,cx,cy,project:(p,axis)=>[cx-p[1]*scale,cy-p[axis]*scale]};
  }
  function outline(corners,project){
    const points=corners.map(project).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    function chain(ordered){
      const result=[];
      for(const p of ordered){
        while(result.length>=2){
          const a=result.at(-2),b=result.at(-1);
          if((b[0]-a[0])*(p[1]-a[1])>(b[1]-a[1])*(p[0]-a[0]))break;
          result.pop();
        }
        result.push(p);
      }
      result.pop();return result;
    }
    return [...chain(points),...chain(points.reverse())].map(p=>p.map(num).join(',')).join(' ');
  }
  function distanceToSegment(p,a,b){
    const dx=b[0]-a[0],dy=b[1]-a[1],length2=dx*dx+dy*dy;
    const t=length2?Flight.clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length2,0,1):0;
    return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);
  }
  function releaseLabels(anchors,traces){
    const placed=[];
    const traceGap=p=>{
      let gap=Infinity;
      for(const trace of traces){
        for(let j=1;j<trace.length;j++)gap=Math.min(gap,distanceToSegment(p,trace[j-1],trace[j]));
      }
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
  function debrisPlot(tracks,id){
    if(!tracks.length)return '';
    const art=['<defs><clipPath id="'+id+'"><rect x="30" y="14" width="377" height="222"/></clipPath></defs><g clip-path="url(#'+id+')">'];
    for(const track of tracks){
      const xy=track.xy;
      art.push('<polyline class="debrisTrack" fill="none" stroke="'+track.color+'" stroke-width="1.7" stroke-dasharray="'+track.dash+'" points="'+xy.map(p=>p.map(num).join(',')).join(' ')+'"/>');
      // Place heads by visible path length so a long off-chart tail cannot
      // steal a track's only arrow. Leave a margin for each arrow's wings.
      const visible=[];
      let length=0;
      for(let i=1;i<xy.length;i++){
        const a=xy[i-1],b=xy[i],dx=b[0]-a[0],dy=b[1]-a[1];
        let lo=0,hi=1;
        for(const [v,d,min,max] of [[a[0],dx,37,400],[a[1],dy,21,229]]){
          if(!d){if(v<min||v>max)hi=-1;continue;}
          const t0=(min-v)/d,t1=(max-v)/d;
          lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));
        }
        if(hi<=lo)continue;
        const span=(hi-lo)*Math.hypot(dx,dy);
        if(span===0)continue;
        visible.push({a,dx,dy,lo,hi,span,start:length});
        length+=span;
      }
      const positions=length<5?[]:length<125?[.56]:[.30,.77];
      for(const fraction of positions){
        const at=length*fraction,seg=visible.find(s=>s.start+s.span>=at);
        const t=seg.lo+(seg.hi-seg.lo)*(at-seg.start)/seg.span;
        const x=seg.a[0]+seg.dx*t,y=seg.a[1]+seg.dy*t;
        const angle=Math.atan2(seg.dy,seg.dx)*180/Math.PI;
        art.push('<path class="debrisArrow" d="M 5 0 L -5 -4 L -3 0 L -5 4 Z" fill="'+track.color+'" stroke="#101a20" stroke-width="1.4" paint-order="stroke" transform="translate('+num(x)+' '+num(y)+') rotate('+num(angle)+')"/>');
      }
    }
    return art.join('')+'</g>';
  }
  function debrisKey(tracks){
    if(!tracks.length)return '';
    const rows=[];
    for(const [i,item] of [{name:'Tommi',color:'#99e1cc',dash:''},...tracks].entries()){
      const y=13+i*18;
      rows.push('<path d="M 0 '+y+' h 25" stroke="'+item.color+'" stroke-width="2" stroke-dasharray="'+(item.dash||'none')+'"/><path d="M 28 '+y+' l -7 -3 v 6 Z" fill="'+item.color+'"/>',
        '<text x="36" y="'+(y+4)+'" fill="'+item.color+'">'+item.name+'</text>');
      rows.push('<text x="300" y="'+(y+4)+'" text-anchor="end">'+(i?item.gap.toFixed(2)+' m':'Closest 3D suit–box gap')+'</text>',
        '<text x="416" y="'+(y+4)+'" text-anchor="end">'+(i?Readout.clock(item.time):'Flight time')+'</text>');
    }
    return '<g class="debrisKey" fill="#d5dcdf" font-size="13">'+rows.join('')+'</g>';
  }
  function plot(flight,segments,grid,axis,compact=false,tracks=[]){
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
    const corners=(flight.pose??Flight.poses[0]).corners;
    svg.push('<polygon class="grabEnvelope" points="'+outline(corners,point)+'" fill="#29493d" stroke="#91c4a4"/>');
    const debrisPaths=tracks.map(track=>({...track,xy:track.points.map(point)}));
    svg.push(debrisPlot(debrisPaths,(compact?'card':'log')+'Debris'+axis));
    const projected=segments.map(seg=>seg.map(k=>point(k.p)));
    const anchors=flight.log.releases.map(r=>point(r.p));
    // Card numbers match its first nine records. In a long full log, spread
    // numbered callouts over the flight and mark every other release with a dot.
    const count=Math.min(anchors.length,compact?9:16);
    const indices=Array.from({length:count},(_,i)=>compact||count===anchors.length?i:Math.round(i*(anchors.length-1)/(count-1)));
    const callouts=releaseLabels(indices.map(i=>anchors[i]),[...projected,...debrisPaths.map(track=>track.xy)]);
    for(const {anchor:[x,y],center:[lx,ly]} of callouts)svg.push(line(x,y,lx,ly,'#b3976c',.8));
    for(const xy of projected){
      svg.push('<polyline fill="none" stroke="#99e1cc" stroke-width="2" points="'+xy.map(p=>p.map(num).join(',')).join(' ')+'"/>');
      let last=xy[0],distance=0;
      for(const next of xy.slice(1)){
        const dx=next[0]-last[0],dy=next[1]-last[1];distance+=Math.hypot(dx,dy);
        if(distance>(tracks.length?42:33)){
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
  function pane(flight,segments,grid,axis,tracks){
    const name=axis===0?'Orbital plane · V-bar / R-bar':'Along-track / cross-track';
    return '<figure><figcaption>'+name+'</figcaption><svg viewBox="0 0 430 276" role="img" aria-label="'+name+' flight path, full grab envelope and numbered releases">'+plot(flight,segments,grid,axis,false,tracks)+'</svg></figure>';
  }
  function precise(t){
    const ms=Math.round(t*1000);
    return Readout.clock(Math.floor(ms/1000))+'.'+String(ms%1000).padStart(3,'0');
  }
  function resultReadout(flight){
    const rescued=flight.done==='capture';
    let budget;
    if(flight.skippedGuidance){
      budget='Assisted flight · compare throw count and speed';
    }else if(flight.story){
      budget='Unlimited tools · auto-reload';
    }else{
      const original=Flight.budgets[Flight.fullRack];
      const recovered=rescued?Flight.budgets[flight.mask]:0;
      const percent=(100*recovered/original).toFixed(1);
      budget='Δv brought home '+recovered.toFixed(3)+' / '+original.toFixed(3)+' m/s ('+percent+'%)';
    }
    return {
      budget,
      speed:(rescued?'Grab speed ':'Final relative speed ')+Readout.speed(Flight.norm(flight.pos.v),flight.soft)+' m/s'
    };
  }
  function card(flight){
    const {segments,closest,tracks}=reconstruct(flight);
    const date=new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(flight.finishedAt);
    const name=flight.initial.name??'Random drift',result=outcomes[flight.done];
    const seed=Challenge.encode(flight);
    const keyHeight=tracks.length?66:0;
    const rules=[flight.mode,flight.story?'Story':'Manual',Readout.capture(flight.soft),
      flight.pose?.id?flight.pose.label:''].filter(Boolean).join(' · ');
    const elapsed=precise(flight.time),oxygen=Readout.clock(Math.ceil(flight.limit-flight.time));
    const {budget,speed}=resultReadout(flight),releases=flight.log.releases;
    const clearance=flight.done==='capture'?'':'Closest approach flown '+Readout.clearance(closest,2)+' m';
    const passCount=flight.misses?Readout.count(flight.misses,'fast entry','fast entries'):'';
    const passDetails=[clearance,passCount].filter(Boolean).join('   ·   ');
    const recordY=529+keyHeight+(passDetails?20:0);
    const records=releases.slice(0,9).map((r,i)=>(i+1)+'.  '+Readout.clock(r.time)+'  '+Flight.gear[r.tool].name+'  '+r.power+'%');
    if(releases.length>9)records.push('10. ...and then some');
    const rows=Math.max(1,Math.min(5,records.length)),height=recordY+10+rows*17;
    const label=(x,y,text,size,color,attrs='')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'" '+attrs+'>'+escape(text)+'</text>';
    const description='Fastball 3D · AvaniNet · '+date+' · '+[name,seed].filter(Boolean).join(' ')+' · '+rules+'\n'+
      [result+' in '+elapsed,Readout.count(releases.length,'throw'),oxygen+' oxygen',budget,speed,Readout.aids(flight),clearance,passCount].filter(Boolean).join(' · ');
    const parts=['<svg xmlns="http://www.w3.org/2000/svg" width="470" height="'+height+'" viewBox="0 0 470 '+height+'" role="img" aria-labelledby="flightCardTitle flightCardDesc" font-family="'+escape(cockpitFonts.sans)+'">',
      '<title id="flightCardTitle">'+escape(name)+' · '+escape(result)+'</title><desc id="flightCardDesc">'+escape(description)+'</desc>',
      '<rect width="470" height="'+height+'" rx="9" fill="#101a20"/>',
      label(20,27,'FASTBALL 3D · AvaniNet',14,'#f7bc62','font-weight="bold" letter-spacing="1.8"'),label(450,27,date,13,'#c5d1d0','text-anchor="end"'),
      label(20,62,result,28,'#f4f1e8','font-weight="bold"'),label(20,84,[name,seed].filter(Boolean).join('  /  '),15,'#a8e4d0','font-family="'+escape(cockpitFonts.mono)+'"'),
      label(20,104,rules,13,'#c5d1d0'),'<rect x="12" y="115" width="446" height="309" rx="5" fill="#0b141b" stroke="#354046"/>',
      label(22,136,'Orbital plane · V-bar / R-bar',13,'#f4f1e8','font-weight="bold"'),
      '<g transform="translate(20 143)" font-family="'+escape(cockpitFonts.mono)+'">'+plot(flight,segments,layout(segments,flight.pose),0,true,tracks)+'</g>',
      tracks.length?'<g transform="translate(20 429)">'+debrisKey(tracks)+'</g>':'',
      label(20,446+keyHeight,budget,15,'#a8e4d0','font-weight="bold"'),label(20,466+keyHeight,speed,14,'#a8e4d0'),
      label(20,486+keyHeight,elapsed+' elapsed   ·   '+oxygen+' oxygen   ·   '+(flight.story?Readout.count(releases.length,'throw'):releases.length+'/'+Flight.gear.length+' tools used'),14,'#f4f1e8')];
    parts.push(label(20,506+keyHeight,Readout.aids(flight),13,'#c5d1d0'));
    if(passDetails)parts.push(label(20,526+keyHeight,passDetails,14,'#c5d1d0'));
    parts.push(label(20,recordY,'Release record',13,'#f7bc62','font-weight="bold"'));
    if(!releases.length)parts.push(label(20,recordY+19,'No tools released',12,'#c5d1d0'));
    records.forEach((text,i)=>parts.push(label(i<5?20:245,recordY+19+17*(i%5),text,12,'#d7dfe1')));
    return parts.join('')+'</svg>';
  }
  function show(flight){
    const {segments,closest,tracks}=reconstruct(flight),grid=layout(segments,flight.pose);
    const tools=Flight.gear.filter((_,i)=>flight.mask&(1<<i)).length;
    const result=outcomes[flight.done];
    const {budget,speed}=resultReadout(flight);
    el('logTitle').textContent=flight.initial.name+' · Flight log';
    el('logSummary').textContent=[result,flight.mode,Readout.capture(flight.soft),
      flight.pose?.id?flight.pose.label:'',
      flight.lesson===null&&!flight.skippedGuidance?'Challenge '+Challenge.encode(flight):'',precise(flight.time)+' elapsed',
      Readout.clock(Math.ceil(flight.limit-flight.time))+' oxygen',(flight.story||flight.skippedGuidance)?Readout.count(flight.throws,'throw'):tools+'/'+Flight.gear.length+' tools aboard',
      budget,speed,Readout.aids(flight),flight.done==='capture'?'':'Closest approach flown '+Readout.clearance(closest,2)+' m'].filter(Boolean).join('  ·  ');
    el('logPanes').innerHTML=[0,2].map(axis=>pane(flight,segments,grid,axis,tracks)).join('');
    const key=el('logDebrisKey');
    key.hidden=!tracks.length;
    key.innerHTML=tracks.length?'<svg viewBox="0 0 430 60" width="430" role="img" aria-label="Flight paths and closest three-dimensional gaps between the suit and each box">'+debrisKey(tracks)+'</svg>':'';
    el('logEvents').textContent=['Start 0:00',...flight.log.fast.map(h=>'Fast entry '+precise(h.time)+' at '+Readout.speed(h.speed,flight.soft)+' m/s'),result+' '+precise(flight.time)].join('  ·  ');
    const list=el('logThrows');list.replaceChildren();
    if(!flight.throws)list.textContent='No tools released.';
    for(const r of flight.log.releases){
      const item=document.createElement('li'),detail=document.createElement('small');
      const [az,elev]=Flight.angles(r.dir);
      item.textContent=precise(r.time)+' · '+Flight.gear[r.tool].name+' · '+r.power+'% · '+Readout.bearing(az,elev);
      detail.textContent='XYZ position ('+r.p.map(num).join(', ')+') m · velocity ('+r.v.map(v=>Readout.signed(v,4,false)).join(', ')+') m/s';
      item.append(detail);list.append(item);
    }
  }
  return {reconstruct,layout,show,card,resultReadout};
})();
