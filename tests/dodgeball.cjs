const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = id => html.match(new RegExp('<script id="'+id+'">([\\s\\S]+?)</script>'))[1];
const {F,D} = vm.runInNewContext(script('physics') + script('debris') + ';({F:Flight,D:Debris})');
const data=require('../studies/catalog-data.cjs');
const layoutCatalog=Array.from({length:data.count},(_,row)=>data.debrisKey(row));
const {approvedMask}=require('../studies/station-orientations.cjs');
const {screen}=require('../studies/random-dodgeball.cjs');
function checkFrozenTilts(mask,bodies,layout){
  assert.equal(mask & approvedMask(bodies,layout),mask,'every shipped tilt still qualifies');
}
checkFrozenTilts(data.mask(4,0),D.pieces,null);
for(let row=0;row<4096;row++){
  const id=layoutCatalog[row];
  assert.ok(data.mask(5,row)>0);
  if(row%512===0)checkFrozenTilts(data.mask(5,row),D.layoutPieces(id),Math.floor(id/D.layoutStride));
}
assert.equal(D.layouts.length,8);
assert.equal(layoutCatalog.length,4096);
assert.equal(new Set(layoutCatalog).size,4096);
const distinctStates=new Set();

for(const [layout,family] of D.layouts.entries()){
  const seeds=layoutCatalog.filter(id=>Math.floor(id/D.layoutStride)===layout);
  assert.equal(seeds.length,512,family.name);
  for(const seed of seeds){
    const bodies=D.layoutPieces(seed);
    const states=bodies.map(b=>[b.p,b.v]);
    distinctStates.add(JSON.stringify(states));

    assert.equal(screen(bodies,layout),'accepted',family.name+' / '+seed);
  }
}
assert.equal(distinctStates.size,4096);
const initial = F.opening(4,0,false);
assert.deepEqual(initial.p,F.opening(4,0,true).p);
const frameMesh=D.pieces[1].mesh;
assert.equal(frameMesh.faces.length,10,'two continuous skins and eight outside walls');
const edges=new Map();
for(const face of frameMesh.faces){
  for(const [i,a] of face.vertices.entries()){
    const b=face.vertices[(i+1)%face.vertices.length],edge=[a.join(','),b.join(',')].sort().join('/');
    edges.set(edge,(edges.get(edge)??0)+1);
    assert.ok(Math.abs(F.dot(F.sub(b,a),face.normal))<1e-8,'planar face');
  }
}
assert.ok([...edges.values()].every(n=>n===2),'every skin and wall shares its edge with exactly one face');
for(const eye of [[3,2,4],[-3,2,-4],[.5,-2,3],[0,0,-4]]){
  const ordered=frameMesh.ordered(eye);
  assert.equal(new Set(ordered).size,ordered.length);
  assert.equal(ordered.length,frameMesh.faces.filter(f=>F.dot(F.sub(eye,f.vertices[0]),f.normal)>0).length);
}
assert.ok(D.gapAt([0,0,.32],D.pieces[1])<0,'the frame box spans the open centre');
assert.ok(D.gapAt([-.82,0,.32],D.pieces[1])<0,'frame upright catches the suit');
for(const body of D.pieces){
  const box=body.box;
  assert.equal(box.edges.length,12);
  for(const edge of box.edges)assert.equal(edge.adjacent.length,2);
  const face=box.faces[3],eye=F.add(box.center,F.scale(face.normal,10));
  const headOn=box.visibleEdges(eye);
  assert.equal(headOn.silhouette.length,4,'head-on rim shows one rectangle');
  assert.equal(headOn.creases.length,0,'rear rectangle stays hidden');
  for(const sign of [-1,1]){
    const oblique=box.visibleEdges(F.add(box.center,[7*sign,5,-9]));
    assert.equal(oblique.silhouette.length,6);
    assert.equal(oblique.creases.length,3);
    assert.equal(new Set([...oblique.creases,...oblique.silhouette]).size,9,'no doubled strokes');
  }
  for(const face of box.faces){
    const furthest=Math.max(...body.mesh.faces.flatMap(f=>f.vertices.map(v=>F.dot(v,face.normal))));
    assert.ok(Math.abs(F.dot(face.vertices[0],face.normal)-furthest-.04)<1e-8,'4 cm from metal to every box face');
    const middle=F.scale(face.vertices.reduce(F.add,[0,0,0]),.25);
    assert.ok(Math.abs(D.gapAt(F.add(middle,F.scale(face.normal,D.suitRadius)),body))<1e-8,'box face matches suit contact');
  }
  const orbital=F.motion(body,200,'Orbital'),linear=F.motion(body,200,'Straight-Line');
  assert.ok(F.norm(F.sub(orbital.p,linear.p))>.2,'debris follows curved orbital motion');
}
for(const mode of ['Straight-Line','Orbital']){
  assert.equal(D.forecast(initial,0,600,mode).hit,null,'unpowered opening is clear of both pieces');
  const staged=F.motion(initial,12,mode);
  const first=F.command(F.transfer(staged,[3,0,3],420,mode),5,F.fullRack);
  for(const story of [false,true]){
    let mask=F.fullRack;
    const pitch=(s,c)=>{
      const next=F.applyCommand(s,c,mask);
      mask=F.rackAfterThrow(mask,c.tool,story);
      return next;
    };
    const direct=pitch(staged,first),cover=D.forecast(direct,12,588,mode).hit;
    assert.equal(cover.body,D.pieces[0]);
    const edge=D.gapAt(F.sub(cover.p,cover.center),cover.body);
    assert.ok(Math.abs(edge)<.002,'first contact at visible box plus suit radius');
    assert.ok(Math.abs(F.norm(F.sub(cover.p,cover.contact))-D.suitRadius)<.002,'cross is on box, one suit radius from centre');
    const side=pitch(F.motion(direct,24,mode),{tool:7,power:100,az:0,el:-90});
    const cross=D.forecast(side,36,564,mode).hit;
    assert.equal(cross.body,D.pieces[1]);
    assert.ok(cross.t>149,'room to finish the detour');
    const turn=F.motion(side,149,mode);
    const final=pitch(turn,F.command(F.transfer(turn,[3,0,3],275,mode),8,mask));
    for(const soft of [false,true]){
      const grab=F.entries(final,415,mode,false,soft).find(h=>!soft||F.softEnough(h.speed));
      assert.ok(grab && 185+grab.t<600);
      assert.equal(D.forecast(final,185,grab.t,mode).hit,null);
      console.log(mode,story?'Story':'Single-use',soft?'soft':'any', (185+grab.t).toFixed(2)+' s',grab.speed.toFixed(4)+' m/s');
    }
    for(const coast of [direct,side]){
      const t=coast===direct?12:36,warning=D.forecast(coast,t,600-t,mode).hit;
      const at=F.motion(coast,10,mode);
      const recomputed=D.forecast(at,t+10,590-t,mode).hit;
      assert.equal(recomputed.body,warning.body);
      assert.ok(Math.abs(warning.t-recomputed.t-10)<.003,'epoch-independent contact');
    }
  }
}
// An identical return pitch cuts across the frame if released 20 s too soon.
const mode='Straight-Line';
const a=F.applyCommand(F.motion(initial,12,mode),{tool:5,az:-62,el:14,power:100},511);
const b=F.applyCommand(F.motion(a,24,mode),{tool:7,az:-150,el:-75,power:100},479);
assert.equal(D.forecast(b,36,204,mode).hit,null);
const returnAt=t=>F.applyCommand(F.motion(b,t-36,mode),{tool:8,az:37,el:56,power:100},351);
assert.equal(D.forecast(returnAt(220),220,380,mode).hit.body,D.pieces[1]);
const grab=F.entries(returnAt(240),360,mode,false,true).find(h=>F.softEnough(h.speed));
assert.ok(grab && !D.forecast(returnAt(240),240,grab.t,mode).hit);

// In Orbital, trim the detour and coast through where the frame was 45 s
// earlier. Then turn back to the bars. All four legs use curved motion.
const orbital='Orbital';
const early=F.applyCommand(F.motion(initial,12,orbital),{tool:5,az:-39,el:12,power:100},511);
const detour=F.applyCommand(F.motion(early,24,orbital),{tool:7,az:0,el:-90,power:100},479);
assert.equal(D.forecast(detour,36,89,orbital).hit,null);
const slower=F.applyCommand(F.motion(detour,89,orbital),{tool:0,az:-135,el:42,power:100},351);
const cross=F.motion(slower,165,orbital);
assert.ok(F.norm(F.sub(cross.p,F.motion(D.pieces[1],245,orbital).p))<1.1);
assert.equal(D.forecast(slower,125,165,orbital).hit,null);
const home=F.applyCommand(cross,{tool:8,az:26,el:60,power:100},350);
const orbitalGrab=F.entries(home,310,orbital,false,true).find(h=>F.softEnough(h.speed));
assert.ok(orbitalGrab && !D.forecast(home,290,orbitalGrab.t,orbital).hit);
