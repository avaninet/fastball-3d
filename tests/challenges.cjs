const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Catalog=require('../studies/catalog-data.cjs');
const {F,modes}=require('../studies/random-dodgeball.cjs');
const {rescue}=require('../studies/curate-drift.cjs');
const root=path.join(__dirname,'..');
const Challenge=Function('Catalog',fs.readFileSync(path.join(root,'src/challenge.js'),'utf8')+';return Challenge')(Catalog);

// Rows, ordering and pose permissions all contribute to the meaning of an F1 code.
for(const [file,expected] of [
  ['drift-v1.bin','62776880055c1278998c526d6813fdb687f3fff82ae16d2d84e5a2653270b559'],
  ['dodgeball-v1.bin','a9c951dee9e26cd9b7b078d70fe8ac081c4d3531805c8fe2fa2ea57bd56cd1e7']
]){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets',file))).digest('hex'),expected);
}
assert.equal(Catalog.mask(4,0),5397);
const example={index:5,seed:2560,poseId:16,mode:'Orbital',soft:true,story:false,startingAids:{preview:false,coach:false}};
const code=Challenge.encode(example);
assert.equal(code,'F1B-5011G7');
assert.deepEqual(Challenge.decode('https://example.test/#seed='+code.toLowerCase()),example);
assert.deepEqual(Challenge.decode('https://example.test/'+'long/'.repeat(120)+'#seed='+code),example);
assert.deepEqual(Challenge.decode('Flight card '.repeat(60)+'\n#seed='+code),example);
for(const bad of ['F1B-5011G8','F2B-5011G7','F1B-5011','DB2-00500007',
  Challenge.encode({...example,index:4}),Challenge.encode({...example,poseId:17}),
  Challenge.encode({...example,seed:4096}),Challenge.encode({...example,index:3,startingAids:{coach:true}})]){
  assert.equal(Challenge.decode(bad),null,bad);
}

// Both versions address the same catalog rows. F2 selects a sight-only start.
for(const index of [0,1,2,3,4,5])for(const story of [false,true]){
  const base={...example,index,seed:index===3||index===5?2560:0,poseId:0,story};
  const manual={...base,startingAids:{manual:true,preview:false,coach:false}};
  const encoded=Challenge.encode(manual);
  assert.match(encoded,/^F2/);
  assert.deepEqual(Challenge.decode('#seed='+encoded),manual);
  assert.equal(Challenge.decode(Challenge.encode({...manual,startingAids:{manual:true,preview:true}})),null);
}
let codes=0;
for(let index=0;index<6;index++){
  const count=index===3||index===5?Catalog.count:1;
  for(let seed=0;seed<count;seed++){
    const mask=Catalog.mask(index,seed);
    assert.ok(mask,'every row offers at least one tilt');
    for(const pose of F.poses){
      const entry={index,seed,poseId:pose.id,mode:'Straight-Line',soft:false,story:false,startingAids:{preview:false,coach:false}};
      if(pose.id && !(mask&(1<<(pose.id-1)))){
        assert.equal(Challenge.decode(Challenge.encode(entry)),null);
        continue;
      }
      for(const mode of modes)for(const soft of [false,'firm',true])for(const story of [false,true])
        for(const preview of [false,true])for(const coach of index<4?[false]:[false,true]){
          Object.assign(entry,{mode,soft,story,startingAids:{preview,coach}});
          const decoded=Challenge.decode(Challenge.encode(entry));
          assert.ok(decoded && decoded.index===index && decoded.seed===seed && decoded.poseId===pose.id &&
            decoded.mode===mode && decoded.soft===soft && decoded.story===story &&
            decoded.startingAids.preview===preview && decoded.startingAids.coach===coach);
          codes++;
        }
    }
  }
}
const openings=new Set();
for(let row=0;row<Catalog.count;row++){
  const base=Catalog.drift(row),mask=Catalog.mask(3,row);
  assert.ok([...base.p,...base.v].every(Number.isFinite));
  openings.add(JSON.stringify([base.p,base.v]));
  for(const story of [true,false])for(const mode of modes){
    const state=F.opening(3,row,story);
    assert.ok(rescue(state,mode,story,-1).win,'Soft drift return / '+[row,story,mode]);
    for(const pose of F.poses){
      if(pose.id && !(mask&(1<<(pose.id-1))))continue;
      assert.equal(F.entries(state,600,mode,false,false,pose).length,0,'unpowered drift catch / '+[row,story,mode,pose.id]);
    }
  }
}
assert.equal(openings.size,4096);
console.log(codes+' valid challenge codes round-tripped. All 4,096 drift rows qualify in both models and inventories.');
