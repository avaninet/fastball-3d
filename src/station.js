// Assembly dimensions and attachment map: reference/station-assembly.md.
const Station = (() => {
  const {dot,sub}=Flight;
  const parts=[],tolerance=1e-9;
  const steel=['#e4e2ce','#adb8b7','#76858b'],rail=['#d5c089','#a48c61','#6c675c'];
  const solar=['#d0a769','#364d69','#746247'],hatch=['#f0d69f','#d5b171','#8a7350'];

  function face(points,color,normal,details={}){
    return {points,color,normal,plane:dot(normal,points[0]),lines:[],edge:'#384950',...details};
  }
  function bounds(points){
    return {
      min:[0,1,2].map(axis=>Math.min(...points.map(p=>p[axis]))),
      max:[0,1,2].map(axis=>Math.max(...points.map(p=>p[axis])))
    };
  }
  function part(name,faces){
    const solid={name,faces,...bounds(faces.flatMap(f=>f.points))};
    parts.push(solid);
    return solid;
  }

  function panelSkin(points,isSolar){
    const columns=isSolar?8:5,rows=isSolar?5:3;
    const [x0,y,z0]=points[0],[x1,,z1]=points[2];
    const p=(u,v)=>[x0+(x1-x0)*u,y,z0+(z1-z0)*v];
    const grid=[[],[]],lines=[];
    for(let k=1;k<columns;k++)grid[0].push([p(k/columns,0),p(k/columns,1),isSolar?'#91a5b6':'#969e96']);
    for(let k=1;k<rows;k++)grid[1].push([p(0,k/rows),p(1,k/rows),isSolar?'#687f96':'#a4aaa0']);
    if(isSolar)lines.push([p(.5,0),p(.5,1),'#d5ab72',1.4]);
    return {grid,lines,divisions:[columns,rows],tones:isSolar?['#293f5a','#4c637f']:null,edge:isSolar?'#b6bdbb':'#edf0dd'};
  }
  function box(name,center,size,colors,panel=null){
    const [x,y,z]=center,[w,d,h]=size,faces=[];
    const p=(i,j,k)=>[x+i*w/2,y+j*d/2,z+k*h/2];
    for(const k of [-1,1]){
      faces.push(face([p(-1,-1,k),p(1,-1,k),p(1,1,k),p(-1,1,k)],colors[k>0?0:2],[0,0,k]));
      const side=[p(-1,k,-1),p(1,k,-1),p(1,k,1),p(-1,k,1)];
      faces.push(face(side,colors[1],[0,k,0],panel?panelSkin(side,panel==='solar'):{}));
      faces.push(face([p(k,-1,-1),p(k,1,-1),p(k,1,1),p(k,-1,1)],colors[2],[k,0,0]));
    }
    return part(name,faces);
  }
  // Twelve facets put a flat mounting face on both X and Y. Size the hull
  // by its apothem so the same dimension can start a beam exactly on a face.
  function moduleZ(name,z0,z1,apothem,marked=false){
    const shades=['#d8ddcf','#b6beb7','#939e99','#808c8e','#7c8789','#8e9b9b',
      '#aeb7af','#d4dacd','#ebedde','#f0eee1','#e3e4d9','#cbd0c7'];
    const step=2*Math.PI/shades.length,radius=apothem/Math.cos(step/2),faces=[],ends=[[],[]];
    function ring(i,z){
      const a=(i-.5)*step;return [radius*Math.cos(a),radius*Math.sin(a),z];
    }
    for(let i=0;i<shades.length;i++){
      const next=(i+1)%shades.length,at=t=>z0+(z1-z0)*t;
      const lines=[.14,.86].map(t=>[ring(i,at(t)),ring(next,at(t)),'#737f80',1]);
      const stripes=marked?[[.19,.35],[.57,.73]].map(([a,b])=>[
        ring(i,at(a)),ring(next,at(a)),ring(next,at(b)),ring(i,at(b))
      ]):[];
      faces.push(face([ring(i,z0),ring(next,z0),ring(next,z1),ring(i,z1)],shades[i],
        [Math.cos(i*step),Math.sin(i*step),0],{lines,stripes,edge:null,tones:[shades[i],shades[next]]}));
      ends[0].push(ring(i,z0));ends[1].push(ring(i,z1));
    }
    faces.push(face(ends[0],'#8b9694',[0,0,-1]));
    const stripes=marked?[-.21,.12].map(x=>[[x,-.27,z1],[x+.10,-.27,z1],[x+.10,.27,z1],[x,.27,z1]]):[];
    faces.push(face(ends[1],'#e4e3d5',[0,0,1],{stripes}));
    return part(name,faces);
  }

  // Siblings occupy disjoint intervals on this axis. This is checked once at
  // construction and gives the cameras an exact painter's order at any bearing.
  function row(axis,...children){
    children.sort((a,b)=>a.min[axis]-b.min[axis]);
    for(let i=1;i<children.length;i++){
      if(children[i-1].max[axis]>children[i].min[axis]+tolerance)throw Error('Station parts overlap on axis '+axis);
    }
    return {axis,children,...bounds(children.flatMap(c=>[c.min,c.max]))};
  }
  function arm(name,side,z){
    const prefix=name+(side<0?' -X ':' +X ');
    return (label,start,end,depth,height,colors,panel)=>box(prefix+label,
      [side*(start+end)/2,0,z],[end-start,depth,height],colors,panel);
  }
  function solarBay(name,z0,z1,apothem,armZ){
    const hull=moduleZ(name+' hull',z0,z1,apothem),wings=[];
    for(const side of [-1,1]){
      const mount=arm(name,side,armZ);
      wings.push(mount('truss',apothem,1.60,.22,.20,rail),mount('hinge',1.60,1.82,.30,.34,steel),
        mount('array',1.82,6.70,.148,3.50,solar,'solar'));
    }
    return row(0,hull,...wings);
  }
  const coreApothem=1.12,core=moduleZ('core hull',-1.50,1.50,coreApothem);
  const equipmentBay=row(1,core,
    box('hatch mount',[0,-(coreApothem+1.32)/2,.28],[.42,1.32-coreApothem,.48],steel),
    box('hatch',[0,-1.43,.28],[1.12,.22,.86],hatch));
  const radiators=[];
  for(const side of [-1,1]){
    const mount=arm('core',side,0);
    radiators.push(mount('socket',coreApothem,1.36,.40,.62,rail),mount('housing',1.36,2.16,.92,1.12,steel),
      mount('boom',2.16,2.95,.24,.24,steel),mount('radiator',2.95,6.70,.148,1.55,steel,'radiator'));
  }
  const assembly=row(2,
    solarBay('lower',-5.55,-1.72,.74,-3.75),
    moduleZ('lower collar',-1.72,-1.50,.58),
    row(0,equipmentBay,...radiators),
    moduleZ('upper collar',1.50,1.72,.64),
    solarBay('upper',1.72,5.55,.82,3.75),
    moduleZ('marked end',5.55,6.40,.53,true));

  function forEachVisibleFace(eye,draw){
    function visit(node){
      if(node.faces){
        for(const f of node.faces)if(dot(f.normal,eye)>f.plane+tolerance)draw(f);
        return;
      }
      const {axis,children}=node;
      // On each side of the eye, visit the farthest slab first. A ray can
      // reach only one side before it reaches the slab containing the eye.
      let i=0;
      while(i<children.length && children[i].max[axis]<=eye[axis])visit(children[i++]);
      for(let j=children.length-1;j>=i;j--)visit(children[j]);
    }
    visit(assembly);
  }

  // Clip the segment against each convex part's actual rendered face planes.
  // The capture envelope has a separate gameplay meaning and includes open gaps.
  function crosses(from,to){
    if(Flight.half.some((h,i)=>Math.min(from[i],to[i])>h || Math.max(from[i],to[i])<-h))return false;
    const delta=sub(to,from);
    return parts.some(solid=>{
      if(solid.min.some((lo,i)=>Math.max(from[i],to[i])<lo-tolerance || Math.min(from[i],to[i])>solid.max[i]+tolerance))return false;
      let enter=0,leave=1;
      for(const f of solid.faces){
        const gap=f.plane-dot(f.normal,from),step=dot(f.normal,delta);
        if(Math.abs(step)<tolerance){
          if(gap < -tolerance)return false;
        }else{
          if(step>0)leave=Math.min(leave,gap/step);else enter=Math.max(enter,gap/step);
          if(enter>leave+tolerance)return false;
        }
      }
      return true;
    });
  }
  return {parts,forEachVisibleFace,crosses};
})();
