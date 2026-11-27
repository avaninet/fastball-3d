// Build one 512-row chunk per layout. Concatenate in layout order.
const fs=require('node:fs'),path=require('node:path');
const {F,D,start,modes,fly,screen}=require('./random-dodgeball.cjs');
function robust(bodies,layout,pose,first=0,trials=16,maxMisses=2){
  return modes.every(mode=>{
    let misses=0;
    for(let j=0;j<trials;j++)
      if(!fly(bodies,mode,first+j,layout,false,true,pose).win && ++misses>maxMisses)return false;
    return true;
  });
}
function approvedMask(bodies,layout){
  let mask=0;
  for(const pose of F.poses.slice(1)){
    if(screen(bodies,layout,pose)==='accepted' && robust(bodies,layout,pose) &&
      robust(bodies,layout,pose,400,32,2))mask|=1<<(pose.id-1);
  }
  return mask;
}
function generateLayout(layout){
  const data=Buffer.alloc(512*6),wins=[0,0],total=[0,0],minGap=[Infinity,Infinity];
  let accepted=0,poses=0,candidate=0;
  while(accepted<512){
    const key=layout*D.layoutStride+candidate++;
    if(candidate>D.layoutStride)throw Error('Layout exhausted');
    const bodies=D.layoutPieces(key);
    if(screen(bodies,layout)!=='accepted'||!robust(bodies,layout,F.poses[0]))continue;
    const mask=approvedMask(bodies,layout);
    if(!mask)continue;
    const allowed=F.poses.slice(1).filter(p=>mask&(1<<(p.id-1)));
    const pose=allowed[accepted%allowed.length];
    for(const [i,mode] of modes.entries()){
      minGap[i]=Math.min(minGap[i],D.forecast(start,0,90,mode,bodies).nearest.gap);
      for(let trial=5000;trial<5032;trial++){
        wins[i]+=Number(fly(bodies,mode,trial,layout,false,true,pose).win);total[i]++;
      }
    }
    poses+=allowed.length;
    data.writeUInt32LE(key,accepted*6);data.writeUInt16LE(mask,accepted*6+4);accepted++;
  }
  console.log(JSON.stringify({layout,accepted,candidate,poses,wins,total,minGap}));
  return data;
}
// Exercise the packed rows without changing them. Balance standard and tilted
// starts, vary the error draw across rows, and fly both inventory rules.
function audit(layout){
  const catalog=require('./catalog-data.cjs'),wins=[0,0,0,0],n=512*16;
  for(let i=0;i<512;i++){
    const row=512*layout+i,mask=catalog.mask(5,row);
    const bodies=D.layoutPieces(catalog.debrisKey(row));
    const allowed=F.poses.slice(1).filter(p=>mask&(1<<(p.id-1)));
    for(let j=0;j<16;j++){
      const pose=j%2?allowed[(i+(j>>1))%allowed.length]:F.poses[0];
      const trial=9000+(73*i+17*j)%256;
      for(const story of [false,true])for(const [m,mode] of modes.entries())
        wins[2*Number(story)+m]+=Number(fly(bodies,mode,trial,layout,story,true,pose).win);
    }
  }
  console.log(JSON.stringify({layout,n,wins}));
}
const assets=path.join(__dirname,'../assets');
if(require.main===module){
  if(process.argv[2]==='--audit'){
    if(process.argv[3]!==undefined)audit(Number(process.argv[3]));
    else D.layouts.forEach((_,layout)=>{audit(layout);});
  }else if(process.argv.length===4)fs.writeFileSync(process.argv[3],generateLayout(Number(process.argv[2])));
  else{
    const data=D.layouts.map((_,i)=>generateLayout(i));
    fs.writeFileSync(path.join(assets,'dodgeball-v1.bin'),Buffer.concat(data));
    fs.writeFileSync(path.join(assets,'challenge-mask.json'),JSON.stringify(approvedMask(D.pieces,null))+'\n');
  }
}
module.exports={approvedMask};
