'use strict';

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
  const logFrame={left:30,right:407,top:14,bottom:236,cx:222,cy:126,fitWidth:344,fitHeight:186};
  const cardFrame={left:41,right:432,top:32,bottom:159,cx:238,cy:98,fitWidth:362,fitHeight:110};
  function layout(segments,pose=Flight.poses[0],frame=logFrame){
    let left=-Flight.half[1],right=Flight.half[1],bottom=-Flight.half[0],top=Flight.half[0];
    for(const segment of [...segments,pose.corners.map(p=>({p}))])for(const {p} of segment){
      left=Math.min(left,-p[1]);right=Math.max(right,-p[1]);
      bottom=Math.min(bottom,p[0],p[2]);top=Math.max(top,p[0],p[2]);
    }
    const scale=Math.min(frame.fitWidth/Math.max(15,right-left),frame.fitHeight/Math.max(15,top-bottom));
    const cx=frame.cx-(left+right)*scale/2,cy=frame.cy+(top+bottom)*scale/2;
    return {scale,cx,cy,project:(p,axis)=>[cx-p[1]*scale,cy-p[axis]*scale]};
  }
  function approachGrid(flight,segments,closest){
    const full=layout(segments,flight.pose,cardFrame);
    if(flight.done==='capture')return full;
    const radius=Math.max(30,closest+12);
    const approach=segments.map(segment=>segment.filter(sample=>Flight.clearance(sample.p,flight.pose)<=radius));
    if(!approach.some(segment=>segment.length))return full;
    const detail=layout(approach,flight.pose,cardFrame);
    return detail.scale>full.scale*1.6?{...detail,focused:true}:full;
  }
  function withinPlot([x,y],{left,right,top,bottom},pad=0){
    return x>=left+pad && x<=right-pad && y>=top+pad && y<=bottom-pad;
  }
  // Place the arrow at the actual intersection of the departing path and the plot edge.
  function exitArrow(a,b,frame){
    const dx=b[0]-a[0],dy=b[1]-a[1];
    const tx=dx?((dx>0?frame.right:frame.left)-a[0])/dx:Infinity;
    const ty=dy?((dy>0?frame.bottom:frame.top)-a[1])/dy:Infinity;
    const t=Math.min(tx,ty),angle=Math.atan2(dy,dx)*180/Math.PI;
    return '<path class="offChart" d="M 0 0 L -9 -4 L -9 4 Z" fill="#99e1cc" transform="translate('+
      num(a[0]+t*dx)+' '+num(a[1]+t*dy)+') rotate('+num(angle)+')"/>';
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
  function releaseLabels(anchors,traces,frame){
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
        if(lx<frame.left+8||lx>frame.right-7||ly<frame.top+9||ly>frame.bottom-8)continue;
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
  function debrisPlot(tracks,id,frame){
    if(!tracks.length)return '';
    const {left,right,top,bottom}=frame;
    const art=['<defs><clipPath id="'+id+'"><rect x="'+left+'" y="'+top+'" width="'+(right-left)+'" height="'+(bottom-top)+'"/></clipPath></defs><g clip-path="url(#'+id+')">'];
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
        for(const [v,d,min,max] of [[a[0],dx,left+7,right-7],[a[1],dy,top+7,bottom-7]]){
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
        '<text x="416" y="'+(y+4)+'" text-anchor="end">'+(i?precise(item.time):'Flight time')+'</text>');
    }
    return '<g class="debrisKey" fill="#d5dcdf" font-size="13">'+rows.join('')+'</g>';
  }
  const alongTrackLabel='← +Y along track (m)';
  const projectionLabels={
    0:{title:'Orbital plane · V-bar / R-bar',vertical:'+X radial out ↑ (m)'},
    2:{title:'Along-track / cross-track',vertical:'+Z orbit normal ↑ (m)'}
  };
  function plot(flight,segments,grid,axis,compact=false,tracks=[],crossing=null){
    const {scale,cx,cy,project}=grid;
    const frame=compact?cardFrame:logFrame;
    const {left,right,top,bottom}=frame;
    const point=p=>project(p,axis), color=flight.done==='capture'?'#acdcb6':'#ffaa95';
    const svg=[];
    const line=(x1,y1,x2,y2,stroke,width=1)=>'<line x1="'+num(x1)+'" y1="'+num(y1)+'" x2="'+num(x2)+'" y2="'+num(y2)+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
    const label=(x,y,value,anchor='middle',fill='#afbfc4',size=11)=>'<text x="'+num(x)+'" y="'+num(y)+'" text-anchor="'+anchor+'" font-size="'+size+'" fill="'+fill+'">'+escape(value)+'</text>';
    const magnitude=10**Math.floor(Math.log10(38/scale));
    const step=magnitude*([1,2,5,10].find(k=>k*magnitude*scale>=38)??10);
    for(let i=Math.ceil((left-cx)/(step*scale));cx+i*step*scale<right;i++){
      const x=cx+i*step*scale;svg.push(line(x,top,x,bottom,i?'#25323a':'#637782'),label(x,bottom+15,-i*step));
    }
    for(let i=Math.ceil((cy-bottom+4)/(step*scale));cy-i*step*scale>=top;i++){
      const y=cy-i*step*scale;svg.push(line(left,y,right,y,i?'#25323a':'#637782'),label(left-5,y+4,i*step,'end'));
    }
    if(grid.focused)svg.push(`<defs><clipPath id="approach${axis}"><rect x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"/></clipPath></defs><g clip-path="url(#approach${axis})">`);
    const corners=(flight.pose??Flight.poses[0]).corners;
    svg.push('<polygon class="grabEnvelope" points="'+outline(corners,point)+'" fill="#29493d" stroke="#91c4a4"/>');
    const debrisPaths=tracks.map(track=>({...track,xy:track.points.map(point)}));
    svg.push(debrisPlot(debrisPaths,(compact?'card':'log')+'Debris'+axis,frame));
    const projected=segments.map(seg=>seg.map(k=>point(k.p)));
    const anchors=flight.log.releases.map(r=>point(r.p));
    // Card numbers match its first nine records. In a long full log, spread
    // numbered callouts over the flight and mark every other release with a dot.
    const count=Math.min(anchors.length,compact?9:16);
    const indices=Array.from({length:count},(_,i)=>compact||count===anchors.length?i:Math.round(i*(anchors.length-1)/(count-1)));
    const shown=indices.filter(i=>!grid.focused || withinPlot(anchors[i],frame,4));
    const callouts=releaseLabels(shown.map(i=>anchors[i]),[...projected,...debrisPaths.map(track=>track.xy)],frame);
    for(const {anchor:[x,y],center:[lx,ly]} of callouts)svg.push(line(x,y,lx,ly,'#b3976c',.8));
    for(const xy of projected){
      svg.push('<polyline fill="none" stroke="#99e1cc" stroke-width="2" points="'+xy.map(p=>p.map(num).join(',')).join(' ')+'"/>');
      let last=xy[0],distance=0;
      for(const next of xy.slice(1)){
        if(grid.focused && withinPlot(last,frame) && !withinPlot(next,frame))svg.push(exitArrow(last,next,frame));
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
    const numbered=new Set(shown);
    for(const [i,[x,y]] of anchors.entries()){
      if(!numbered.has(i))svg.push('<circle class="releaseDot" cx="'+num(x)+'" cy="'+num(y)+'" r="1.6" fill="#f2cc8e"><title>Throw '+(i+1)+'</title></circle>');
    }
    for(const [i,{anchor:[x,y],center:[lx,ly]}] of callouts.entries()){
      svg.push('<g class="releaseMark"><circle cx="'+num(x)+'" cy="'+num(y)+'" r="1.6" fill="#f2cc8e"/>',
        '<circle cx="'+num(lx)+'" cy="'+num(ly)+'" r="6" fill="#eac383"/>',
        label(lx,ly+3.2,shown[i]+1,'middle','#112027',9.5),'</g>');
    }
    for(const pass of flight.log.fast){
      const [x,y]=point(pass.p);svg.push(line(x-5,y-5,x+5,y+5,'#ffae74',2),line(x-5,y+5,x+5,y-5,'#ffae74',2));
    }
    if(crossing){
      const [x,y]=point(crossing.p);
      svg.push('<g class="crossingMark"><circle cx="'+num(x)+'" cy="'+num(y)+'" r="4.6" fill="#0c151b" stroke="#a4ddff" stroke-width="1.8"/><circle cx="'+num(x)+'" cy="'+num(y)+'" r="1.5" fill="#a4ddff"/></g>');
    }
    const [ex,ey]=point(flight.pos.p);
    svg.push('<path d="M 0 -5 L 5 0 L 0 5 L -5 0 Z" fill="'+color+'" stroke="#172126" transform="translate('+num(ex)+' '+num(ey)+')"/>');
    if(grid.focused)svg.push('</g>');
    if(!compact)svg.push(label(222,271,alongTrackLabel),label(31,11,projectionLabels[axis].vertical,'start'));
    return svg.join('');
  }
  function pane(flight,segments,grid,axis,tracks){
    const name=projectionLabels[axis].title;
    return '<figure><figcaption>'+name+'</figcaption><svg viewBox="0 0 430 276" role="img" aria-label="'+name+' flight path, full grab envelope and numbered releases">'+plot(flight,segments,grid,axis,false,tracks)+'</svg></figure>';
  }

  // The station's edges cut Y = 0 in a cross section. Its X extent tells us
  // whether the suit appears over the bars in the radial view at that time.
  function projectedPass(flight,segments){
    const pose=flight.pose??Flight.poses[0];
    const faceXs=[];
    for(let i=0;i<8;i++)for(const bit of [1,2,4]){
      if(i&bit)continue;
      const a=pose.corners[i],b=pose.corners[i|bit];
      if(a[1]===0)faceXs.push(a[0]);
      if(b[1]===0)faceXs.push(b[0]);
      if(a[1]*b[1]<0)faceXs.push(a[0]+(b[0]-a[0])*a[1]/(a[1]-b[1]));
    }
    const minX=Math.min(...faceXs),maxX=Math.max(...faceXs);
    for(const [i,points] of segments.entries()){
      const state=i?flight.log.releases[i-1]:flight.initial,start=points[0].time;
      for(const t of Flight.alongTrackCrossings(state,points.at(-1).time-start,flight.mode)){
        const p=Flight.motion(state,t,flight.mode).p;
        if(p[0]>=minX&&p[0]<=maxX&&!Flight.inside(p,pose))return {time:start+t,p,gap:Flight.clearance(p,pose)};
      }
    }
    return null;
  }
  function precise(t){
    const ms=Math.round(t*1000);
    return Readout.clock(Math.floor(ms/1000))+'.'+String(ms%1000).padStart(3,'0');
  }
  function resultReadout(flight){
    const rescued=flight.done==='capture';
    let budget,percent;
    if(flight.skippedGuidance){
      budget='Assisted flight · compare throw count and speed';
    }else if(flight.story){
      budget='Unlimited tools · auto-reload';
    }else{
      const original=Flight.budgets[Flight.fullRack];
      const recovered=rescued?Flight.budgets[flight.mask]:0;
      percent=(100*recovered/original).toFixed(1);
      budget='Δv brought home '+recovered.toFixed(3)+' / '+original.toFixed(3)+' m/s ('+percent+'%)';
    }
    return {
      budget,percent,
      speed:(rescued?'Grab speed ':'Final relative speed ')+Readout.speed(Flight.norm(flight.pos.v),flight.soft)+' m/s'
    };
  }
  function card(flight,wide=matchMedia('(min-width: 680px)').matches){
    const {segments,closest,tracks}=reconstruct(flight);
    const grid=approachGrid(flight,segments,closest),crossing=projectedPass(flight,segments);
    const won=flight.done==='capture',name=flight.initial.name,result=outcomes[flight.done];
    const date=new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(flight.finishedAt);
    const code=Challenge.encode(flight),capture=Readout.capture(flight.soft),aids=Readout.aids(flight);
    const releases=flight.log.releases,records=releases.slice(0,9);
    const elapsed=Readout.clock(flight.time),oxygen=Readout.clock(Math.ceil(flight.limit-flight.time));
    const {budget,speed,percent}=resultReadout(flight),speedValue=Readout.speed(Flight.norm(flight.pos.v),flight.soft)+' m/s';
    const inventory=flight.story?'Story · unlimited tools':releases.length+'/'+Flight.gear.length+' tools used';
    const clearance=won||flight.log.fast.length?'':'Closest approach flown '+Readout.clearance(closest,2)+' m';
    const fast=flight.log.fast,passCount=flight.misses?Readout.count(flight.misses,'fast entry','fast entries'):'';
    const pose=flight.pose?.id?flight.pose.label:'Station aligned';
    const summary=[result+' in '+elapsed,Readout.count(releases.length,'throw'),oxygen+' oxygen',
      budget,speed,aids,clearance,passCount].filter(Boolean).join(' · ');
    const description='Fastball 3D · AvaniNet · '+date+' · '+name+' '+code+' · '+
      [flight.mode,flight.story?'Story':'Single-use tools',capture,pose].join(' · ')+'\n'+summary;

    const width=wide?812:470,edge=width-20;
    const ink='#f3f0e7',muted='#becace',dim='#a7b7bc',mint='#a8e4d0',gold='#f2bf74',border='#34434b';
    const bold='font-weight="700"',end='text-anchor="end"',middle='text-anchor="middle"';
    const mono='font-family="'+escape(cockpitFonts.mono)+'"';
    const label=(x,y,value,size=14,color=ink,attrs='')=>
      `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${attrs}>${escape(value)}</text>`;
    const section=(x,y,title)=>label(x,y,title.toUpperCase(),11,dim,'font-weight="650" letter-spacing="1.05"');
    const rule=(x,y,right)=>`<path d="M${x} ${y}H${right}" stroke="${border}"/>`;
    const toolBadge=(x,y,i)=>`<circle cx="${x}" cy="${y}" r="6.4" fill="#eac383"/>`+
      label(x,y+3.4,i,10,'#112027',bold+' '+middle);
    const chartX=wide?17:14,chartTop=wide?105:125;
    const content=[label(20,26,'FASTBALL 3D · AvaniNet',14,gold,bold+' letter-spacing="1.1"'),
      label(edge,26,date,13,muted,end),label(19,60,result,30,ink,bold)];
    if(wide){
      content.push(label(edge,58,code,16,mint,mono+' '+end),label(20,84,[name,flight.mode,capture].join(' · '),14,muted));
    }else{
      content.push(label(20,84,name,15,mint,bold),label(edge,84,code,15,mint,mono+' '+end),
        label(20,105,flight.mode+' · '+capture,14,muted));
    }
    content.push(rule(20,chartTop-9,edge));
    for(const axis of [0,2]){
      const {title,vertical}=projectionLabels[axis];
      const y=chartTop+(axis===0?0:188);
      content.push(`<g class="cardPlot" data-axis="${axis}" transform="translate(${chartX} ${y})">`,
        '<rect width="442" height="180" rx="6" fill="#0c151b" stroke="'+border+'"/>',
        label(12,21,title,14.5,ink,bold),label(430,21,vertical,12,muted,end),
        '<g '+mono+'>'+plot(flight,segments,grid,axis,true,tracks,crossing)+'</g></g>');
    }
    const axisY=chartTop+386;
    content.push(label(chartX+221,axisY,(grid.focused?'Approach detail · full route in log · ':'')+alongTrackLabel,12,muted,middle));

    const left=wide?481:20,top=wide?120:axisY+29;
    const statusColor=won?'#b1e8c4':'#ffb29f';
    const scoredWin=won && percent!==undefined;
    content.push(scoredWin?label(left,top,'Δv BROUGHT HOME',11,dim,'font-weight="650" letter-spacing="1.05"'):section(left,top,won?'Grab speed':'Final relative speed'),
      label(left,top+32,scoredWin?percent+'%':speedValue,28,statusColor,bold),
      section(left,top+55,'Elapsed'),section(left+173,top+55,'Oxygen left'),
      label(left,top+77,elapsed,18,ink,mono),label(left+173,top+77,oxygen,18,ink,mono),
      rule(left,top+92,edge),section(left,top+112,'Equipment'),
      label(left,top+133,inventory,15,ink,bold),
      label(left,top+152,flight.story?'Auto-reload · '+Readout.count(releases.length,'throw'):budget,13.4,muted),
      label(left,top+173,aids,13.5,mint),label(left,top+193,pose,13,muted),
      rule(left,top+205,edge),section(left,top+224,'Release record'));
    if(scoredWin)content.push(label(edge,top+30,speed,13.5,muted,end));
    let y=top+244;
    for(const [i,r] of records.entries()){
      content.push('<g class="cardRelease">',toolBadge(left+7,y-4,i+1),
        label(left+23,y,Readout.clock(r.time),13.5,muted,mono),label(left+78,y,Flight.gear[r.tool].name),
        label(edge,y,r.power+'%',13.5,muted,mono+' '+end),'</g>');
      y+=21;
    }
    if(!records.length||records.length<releases.length){
      const extra=records.length?'+'+Readout.count(releases.length-records.length,'more throw')+' in flight log':'No tools released';
      content.push(label(left,y,extra,13.5,muted));y+=21;
    }
    if(tracks.length){
      content.push('<g class="debrisKey">',rule(left,y-7,edge),section(left,y+10,'Closest 3D suit–debris gap'));
      y+=31;
      for(const track of tracks){
        content.push(`<path d="M${left} ${y-4}h30" stroke="${track.color}" stroke-width="2" stroke-dasharray="${track.dash}"/>`,
          label(left+39,y,track.name),label(edge-83,y,track.gap.toFixed(2)+' m',13.5,track.color,mono+' '+end),
          label(edge,y,Readout.clock(track.time),13.5,muted,mono+' '+end));y+=21;
      }
      content.push('</g>');
    }
    if(fast.length){
      const pass=fast[0];
      content.push(rule(left,y-6,edge),section(left,y+11,passCount),
        label(left,y+32,(fast.length>1?'First at ':'')+Readout.clock(pass.time)+' · '+Readout.speed(pass.speed,flight.soft)+' m/s',14,'#ffc492'));
      y+=52;
    }
    if(crossing){
      content.push(rule(left,y-6,edge),`<circle cx="${left+6}" cy="${y+9}" r="4.6" stroke="#a4ddff" fill="none" stroke-width="1.7"/>`,
        label(left+20,y+14,'Pass at Y = 0',14,'#b4e2fc',bold),
        label(left,y+35,Readout.clock(crossing.time)+' · Z = '+Readout.signed(crossing.p[2],2)+' m',13.5,muted),
        label(left,y+54,Readout.clearance(crossing.gap,2)+' m clear of the bars',13.5,muted));
      y+=74;
    }
    if(clearance){content.push(label(left,y,clearance,13,muted));y+=21;}

    const legendY=Math.max(axisY+24,y+6);
    const height=legendY+20+(passCount&&!wide?20:0);
    content.push(rule(20,legendY-15,edge),`<g transform="translate(20 ${legendY})">`,
      '<path d="M0 0h22" stroke="#99e1cc" stroke-width="2"/>',label(29,4,'Tommi',12,muted),
      '<rect x="90" y="-3.5" width="7" height="7" stroke="#e9eada" fill="#0c151b"/>',label(105,4,'Start',12,muted),
      toolBadge(162,0,1),label(174,4,'Throw',12,muted),
      `<path d="M238 -5l5 5-5 5-5-5Z" fill="${won?'#acdcb6':'#ffaa95'}"/>`,label(250,4,'Finish',12,muted),
      '<rect x="307" y="-4" width="13" height="8" fill="#29493d" stroke="#91c4a4"/>',label(327,4,'Grab volume',12,muted));
    if(passCount)content.push(`<g transform="translate(${wide?440:0} ${wide?0:20})"><path d="M0 -3l7 7m-7 0 7-7" stroke="#ffae74" stroke-width="2"/>`,
      label(16,4,'Fast entry',12,muted),'</g>');
    content.push('</g>');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="flightCardTitle flightCardDesc" font-family="${escape(cockpitFonts.sans)}">`+
      '<title id="flightCardTitle">'+escape(name+' · '+result)+'</title><desc id="flightCardDesc">'+escape(description)+'</desc>'+
      `<rect x=".6" y=".6" width="${width-1.2}" height="${height-1.2}" rx="9" fill="#111d24" stroke="${border}"/>`+content.join('')+'</svg>';
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
