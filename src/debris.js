// All dimensions are in metres. See reference/debris-assembly.md.
const Debris = (() => {
  const {add,sub,scale,norm,unit,motion} = Flight;
  const suitRadius = .45;
  const padding = .04;
  const warningLead = 65;
  function beam(center,half,tilt=0) {
    const c=Math.cos(tilt),s=Math.sin(tilt);
    const axes=[[c,0,s],[0,1,0],[-s,0,c]];
    const corners=Array.from({length:8},(_,i)=>axes.reduce((p,axis,k)=>
      add(p,scale(axis,(i&(1<<k)?1:-1)*half[k])),center));
    const faces=[];
    for(let k=0;k<3;k++)for(const sign of [-1,1]){
      const a=1<<((k+1)%3),b=1<<((k+2)%3),v=sign>0?1<<k:0;
      const vertices=[v,v^a,v^a^b,v^b].map(i=>corners[i]);
      faces.push({vertices,normal:scale(axes[k],sign),tone:[[1,3],[0,2],[2,4]][k][sign>0?1:0]});
    }
    function closest(p){
      const x=p[0]-center[0],y=p[1]-center[1],z=p[2]-center[2];
      const u=Flight.clamp(c*x+s*z,-half[0],half[0]),w=Flight.clamp(c*z-s*x,-half[2],half[2]);
      return [center[0]+c*u-s*w,center[1]+Flight.clamp(y,-half[1],half[1]),center[2]+s*u+c*w];
    }
    const edges=[];
    for(let i=0;i<8;i++)for(const bit of [1,2,4]){
      if(i&bit)continue;
      const a=corners[i],b=corners[i|bit];
      const adjacent=faces.filter(f=>f.vertices.includes(a)&&f.vertices.includes(b));
      edges.push({a,b,adjacent});
    }
    function visibleEdges(eye){
      const facing=new Set(faces.filter(f=>Flight.dot(sub(eye,f.vertices[0]),f.normal)>0));
      const silhouette=[],creases=[];
      for(const edge of edges){
        const [a,b]=edge.adjacent;
        if(facing.has(a)&&facing.has(b))creases.push(edge);
        else if(facing.has(a)||facing.has(b))silhouette.push(edge);
      }
      return {silhouette,creases};
    }
    return {center,half,c,s,tilt,faces,edges,visibleEdges,closest};
  }
  function bentFrame(){
    // Counterclockwise X/Z skin. Both uprights meet the sill at z=-.44.
    // The bent right upright shares its slanted inner and outer folds with
    // both skins. Extruding the whole outline removes all buried end caps.
    const profile=[[-.96,-.72],[.93,-.72],[.70,.72],[.44,.72],
      [.625,-.44],[-.70,-.44],[-.70,.72],[-.96,.72]];
    const halfDepth=.17;
    const skin=y=>profile.map(([x,z])=>[x,y,z]);
    const front=skin(halfDepth),back=skin(-halfDepth);
    const caps=[{vertices:front.slice().reverse(),normal:[0,1,0],tone:2},{vertices:back,normal:[0,-1,0],tone:1}];
    const walls=profile.map(([x,z],i)=>{
      const j=(i+1)%profile.length,dx=profile[j][0]-x,dz=profile[j][1]-z;
      const normal=unit([dz,0,-dx]);
      return {normal,
        vertices:[front[i],front[j],back[j],back[i]],tone:normal[2]>.5?4:normal[0]>.5?3:0};
    });
    // Build a painter ordering from the walls' actual planes once. A long
    // wall's midpoint depth cannot determine which arm occludes the other.
    function partition(faces){
      if(!faces.length)return null;
      for(const wall of faces){
        const ahead=[],behind=[];
        let splits=false;
        for(const other of faces){
          if(other===wall)continue;
          const side=point=>Flight.dot(sub(point,wall.vertices[0]),wall.normal);
          const a=side(other.vertices[0]),b=side(other.vertices[1]);
          if(Math.min(a,b)<-1e-8 && Math.max(a,b)>1e-8){splits=true;break;}
          (Math.max(a,b)>1e-8?ahead:behind).push(other);
        }
        if(!splits)return {wall,ahead:partition(ahead),behind:partition(behind)};
      }
      throw Error('Frame profile needs a wall split');
    }
    const tree=partition(walls);
    function ordered(eye){
      const visible=[];
      function visit(node){
        if(!node)return;
        const nearSide=Flight.dot(sub(eye,node.wall.vertices[0]),node.wall.normal)>0;
        visit(nearSide?node.behind:node.ahead);
        if(nearSide)visible.push(node.wall);
        visit(nearSide?node.ahead:node.behind);
      }
      visit(tree);
      if(eye[1]>halfDepth)visible.push(caps[0]);
      if(eye[1]<-halfDepth)visible.push(caps[1]);
      return visible;
    }
    return {faces:[...caps,...walls],ordered,tilt:0};
  }
  const pieces=[
    {name:'Service cover',short:'Cover',p:[5.745,-13.893,-1.026],v:[.08437,-.09644,.11298],
      colors:['#465663','#657882','#89999b','#adbbb9','#d2d9ce'],
      mesh:beam([0,0,0],[.93,.085,.51],.10)},
    {name:'Bent equipment frame',short:'Frame',p:[13.476,-2.030,5.822],v:[-.02001,-.03837,.03659],
      colors:['#46494d','#74665c','#99887a','#b6a596','#ddd0b9'],
      mesh:bentFrame()}
  ];
  // DB1 replay contract. These incident states, draw order and arithmetic
  // reproduce the catalog's full-precision centres and velocities.
  function seededPieces(seed){
    const rng=Flight.seedStream(seed),offset=width=>(2*rng()-1)*width;
    return pieces.map((base,i)=>{
      const horizon=i===0?77:270;
      const displacement=[offset(2.2),offset(2.8),offset(1.3)];
      const jitter=[offset(.003),offset(.003),offset(.002)];
      const encounterTime=horizon+offset(i===0?6:18);
      const v=add(scale(sub(scale(base.v,horizon),displacement),1/encounterTime),jitter);
      return {...base,p:add(base.p,displacement),v};
    });
  }
  // Fit the collision box in the piece's own axes. The visor and all flight
  // predictions share this one cached box, including the frame's open centre.
  for(const body of pieces){
    const tilt=body.mesh.tilt,c=Math.cos(tilt),s=Math.sin(tilt);
    const vertices=body.mesh.faces.flatMap(face=>face.vertices.map(([x,y,z])=>[c*x+s*z,y,c*z-s*x]));
    const lo=[0,1,2].map(i=>Math.min(...vertices.map(v=>v[i])));
    const hi=[0,1,2].map(i=>Math.max(...vertices.map(v=>v[i])));
    const [x,y,z]=scale(add(lo,hi),.5);
    const half=scale(sub(hi,lo),.5).map(h=>h+padding);
    body.box=beam([c*x-s*z,y,s*x+c*z],half,tilt);
  }
  // Store the stamped stiffeners, handle and latch markings once in mesh space.
  const cover=pieces[0].mesh;
  for(const face of cover.faces.filter(f=>Math.abs(f.normal[1])>.99)){
    const y=face.normal[1]*(cover.half[1]+.002);
    const point=(x,z)=>[.62*(cover.c*x-cover.s*z),y,.62*(cover.s*x+cover.c*z)];
    const marks=[];
    const line=(x,z,u,w,color,width)=>marks.push({a:point(x,z),b:point(u,w),color,width});
    for(const z of [-.47,.12]){
      line(-1.24,z,1.24,z,'#344652',2.5);
      line(-1.24,z+.035,1.24,z+.035,'#b7c7c6',1);
    }
    for(const x of [-1.29,1.18]){
      line(x,.54,x+.11,.54,'#e8be78',3.3);
      line(x,-.64,x+.11,-.64,'#e8be78',3.3);
    }
    line(-.26,.42,.26,.42,'#283b46',3.6);
    for(const x of [-.26,.26])line(x,.42,x,.54,'#c3ceca',2);
    face.marks=marks;
  }
  function gapAt(p,body){
    const q=body.box.closest(p);
    return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2])-suitRadius;
  }
  // Relative motion obeys the same linear equations as the two world states.
  // A bound on speed bounds how much the suit-to-box gap can change inside
  // an interval. Search early intervals first so accelerated clocks cannot
  // skip a thin rail or report a later contact as the first one.
  function encounter(s,body,epoch,end,mode){
    const origin=motion(body,epoch,mode);
    const rel={p:sub(s.p,origin.p),v:sub(s.v,origin.v)};
    const [vx,vy,vz]=rel.v,n=Flight.n,x=rel.p[0],z=rel.p[2];
    const speed=mode==='Straight-Line'?norm(rel.v):Math.hypot(
      Math.hypot(3*n*x+2*vy,vx),Math.hypot(2*vx,4*vy+6*n*x)+Math.abs(3*vy+6*n*x),Math.hypot(n*z,vz));
    const gap=t=>gapAt(motion(rel,t,mode).p,body);
    let tNear=0,nearest=gap(0),hit=nearest<=0?0:Infinity;
    function search(a,da,b,db){
      if(db<nearest){nearest=db;tNear=b;}
      const duration=b-a,lower=Math.max(-suitRadius,(da+db-speed*duration)/2);
      const possibleContact=a<hit && lower<=0;
      if(!possibleContact && lower>=nearest-.012)return;
      if(duration<=.001 || speed<1e-12){
        if(possibleContact)hit=Math.min(hit,a);
        return;
      }
      const m=(a+b)/2,dm=gap(m);
      if(dm<=0)hit=Math.min(hit,m);
      search(a,da,m,dm);search(m,dm,b,db);
    }
    if(end>0 && speed>1e-12)search(0,nearest,end,gap(end));
    return {body,gap:nearest,tNear,t:hit};
  }
  function forecast(s,epoch,end,mode,bodies=pieces){
    const approaches=bodies.map(body=>encounter(s,body,epoch,end,mode));
    const first=approaches.filter(a=>Number.isFinite(a.t)).sort((a,b)=>a.t-b.t)[0];
    const hit=first?{body:first.body,t:first.t,p:motion(s,first.t,mode).p,
      center:motion(first.body,epoch+first.t,mode).p}:null;
    if(hit)hit.contact=add(hit.center,hit.body.box.closest(sub(hit.p,hit.center)));
    const nearest=approaches.reduce((a,b)=>a.gap<b.gap?a:b);
    return {hit,nearest,approaches};
  }
  function avoidance(s,mask,mode,epoch,end,hazard,bodies=pieces){
    if(!mask)return null;
    const relative=sub(s.v,motion(hazard.body,epoch,mode).v);
    const dirs=[[0,0,-1],[0,0,1],[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],unit(relative)];
    const tools=Flight.gear.map((_,i)=>i).filter(i=>mask&(1<<i)).sort((a,b)=>Flight.impulse(a,mask)-Flight.impulse(b,mask));
    let best=null;
    for(const tool of tools){
      for(const dir of dirs){
        if(norm(dir)<.9)continue;
        const next=Flight.release(s,tool,100,dir,mask);
        // Verify the suggested pitch against both pieces, out to expiry. A
        // later throw to return to the bars is a separate player decision.
        const check=forecast(next,epoch,end,mode,bodies);
        if(check.hit || check.nearest.gap<.30)continue;
        const at=motion(next,Math.min(end,hazard.t+35),mode).p;
        const score=Math.min(check.nearest.gap,1.4)-.045*Flight.clearance(at);
        if(!best || score>best.score)best={tool,dir,score};
      }
      if(best)return best;
    }
    return null;
  }
  return {pieces,seededPieces,suitRadius,padding,warningLead,forecast,avoidance,gapAt};
})();
