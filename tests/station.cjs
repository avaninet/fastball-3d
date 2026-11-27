const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'../src',name+'.js'),'utf8');
const {Station,Flight}=vm.compileFunction(source('physics')+source('station')+'\nreturn {Station,Flight};')();
const byName=new Map(Station.parts.map(part=>[part.name,part]));
const links=new Map(Station.parts.map(part=>[part.name,[]]));
const inside=(part,p)=>part.faces.every(f=>Flight.dot(f.normal,p)<=f.plane+1e-8);

// Sample a patch of each specified mechanical interface on both sides of
// the mating plane. Mere edge contact or overlapping bounding boxes can pass
// a centre-only test even when a beam floats next to a curved hull.
function joint(a,b,axis,point,direction=1){
  const before=byName.get(a),after=byName.get(b);
  assert.ok(before&&after,a+' / '+b);
  for(const u of [-.045,0,.045])for(const v of [-.045,0,.045]){
    const left=point.slice(),right=point.slice();
    left[(axis+1)%3]+=u;right[(axis+1)%3]+=u;
    left[(axis+2)%3]+=v;right[(axis+2)%3]+=v;
    left[axis]-=direction*.0001;right[axis]+=direction*.0001;
    assert.ok(inside(before,left)&&inside(after,right),a+' must meet '+b+' at '+point);
  }
  links.get(a).push(b);links.get(b).push(a);
}
joint('lower hull','lower collar',2,[0,0,-1.72]);
joint('lower collar','core hull',2,[0,0,-1.50]);
joint('core hull','upper collar',2,[0,0,1.50]);
joint('upper collar','upper hull',2,[0,0,1.72]);
joint('upper hull','marked end',2,[0,0,5.55]);
joint('core hull','hatch mount',1,[0,-1.12,.28],-1);
joint('hatch mount','hatch',1,[0,-1.32,.28],-1);
for(const side of [-1,1]){
  const suffix=side<0?' -X ':' +X ';
  for(const [bay,apothem,z] of [['lower',.74,-3.75],['upper',.82,3.75]]){
    const prefix=bay+suffix;
    joint(bay+' hull',prefix+'truss',0,[side*apothem,0,z],side);
    joint(prefix+'truss',prefix+'hinge',0,[side*1.60,0,z],side);
    joint(prefix+'hinge',prefix+'array',0,[side*1.82,0,z],side);
  }
  const prefix='core'+suffix;
  joint('core hull',prefix+'socket',0,[side*1.12,0,0],side);
  joint(prefix+'socket',prefix+'housing',0,[side*1.36,0,0],side);
  joint(prefix+'housing',prefix+'boom',0,[side*2.16,0,0],side);
  joint(prefix+'boom',prefix+'radiator',0,[side*2.95,0,0],side);
}
const reached=new Set();
function visit(name){
  if(reached.has(name))return;
  reached.add(name);
  links.get(name).forEach(visit);
}
visit('core hull');
assert.equal(reached.size,Station.parts.length,'Every part needs a documented joint to the assembly');
for(const part of Station.parts){
  for(const f of part.faces)for(const vertex of f.points){
    assert.ok(inside(part,vertex),'convex outward face planes on '+part.name);
    assert.ok(Flight.inside(vertex),'part outside grab envelope: '+part.name);
  }
}
console.log(Station.parts.length+' station parts connected; all mating patches and convex surfaces verified.');

for(const pose of Flight.poses.slice(1)){
  const world=pose.world;
  const p=world([4,-4,2]),bar=Flight.nearest(p,pose);
  assert.ok(Flight.norm(Flight.sub(bar,world([4,-1.6,2])))<1e-10);
  assert.ok(Math.abs(Flight.clearance(p,pose)-2.4)<1e-10);
  assert.ok(Station.crosses(world([0,-4,0]),world([0,4,0]),pose));
  assert.ok(!Station.crosses(world([4,-4,1.6]),world([4,4,1.6]),pose));
  for(const mode of ['Straight-Line','Orbital'])for(const axis of [0,1,2]){
    const point=[0,0,0],velocity=[0,0,0];
    point[axis]=-Flight.half[axis];velocity[axis]=.075;
    const contact={p:world(point),v:world(velocity)};
    const initial=Flight.motion(contact,-23,mode);
    const hit=Flight.entries(initial,80,mode,false,true,pose)[0];
    assert.ok(hit && Math.abs(hit.t-23)<1e-7 && Math.abs(hit.speed-.075)<1e-9);
  }
  // A tangent to the two faces meeting at this edge touches at one instant.
  const graze={p:world([5,-3.6,0]),v:world([.05,.05,0])};
  assert.ok(Math.abs(Flight.entries(graze,100,'Straight-Line',false,true,pose)[0].t-40)<1e-7);
  // Start inside, a fraction too fast. Orbital acceleration lowers the true
  // relative speed through the selected limit before the suit leaves the box.
  for(const rule of [true,'firm']){
    const speed=Flight.captureLimit(rule);
    const atLimit={p:[.6,0,.2],v:[-speed,0,0]};
    const before=Flight.motion(atLimit,-2,'Orbital');
    assert.ok(Flight.inside(before.p,pose) && !Flight.softEnough(Flight.norm(before.v),rule));
    const [slowdown]=Flight.entries(before,5,'Orbital',true,rule,pose);
    assert.ok(slowdown && Math.abs(slowdown.t-2)<1e-6 && Flight.canGrab(slowdown,rule));
  }
}
