// Build one 512-row chunk per layout. Concatenate in layout order.
const fs=require('node:fs'),path=require('node:path');
const {F,D,start,modes,fly,screen,survives,alternatives}=require('./random-dodgeball.cjs');
function robust(bodies,layout,pose,variant,mode,first,trials){
  let misses=0;
  for(let j=0;j<trials;j++)
    if(!survives(bodies,mode,first+j,layout,pose,variant) && ++misses>2)return false;
  return true;
}
function qualifiedRoute(bodies,layout,pose){
  const count=alternatives[layout]?.length??0;
  for(let variant=0;variant<=count;variant++){
    if(screen(bodies,layout,pose,variant)!=='accepted')continue;
    if(!modes.every(mode=>robust(bodies,layout,pose,variant,mode,0,16)))continue;
    if(pose.id && !modes.every(mode=>robust(bodies,layout,pose,variant,mode,400,32)))continue;
    // Alternate pitches change only the Orbital route. Check its margin
    // against a third set of draws before using it in the separate audit.
    if(variant && !robust(bodies,layout,pose,variant,'Orbital',13000,32))continue;
    return variant;
  }
  return -1;
}
function approvedMask(bodies,layout){
  let mask=0;
  for(const pose of F.poses.slice(1)){
    if(qualifiedRoute(bodies,layout,pose)>=0)mask|=1<<(pose.id-1);
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
    if(qualifiedRoute(bodies,layout,F.poses[0])<0)continue;
    const mask=approvedMask(bodies,layout);
    if(!mask)continue;
    const allowed=F.poses.slice(1).filter(p=>mask&(1<<(p.id-1)));
    const pose=allowed[accepted%allowed.length];
    const variant=qualifiedRoute(bodies,layout,pose);
    for(const [i,mode] of modes.entries()){
      minGap[i]=Math.min(minGap[i],D.forecast(start,0,90,mode,bodies).nearest.gap);
      for(let trial=5000;trial<5032;trial++){
        wins[i]+=Number(fly(bodies,mode,trial,layout,false,true,pose,variant).win);total[i]++;
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
function audit(layout,verifyAll=false){
  const catalog=require('./catalog-data.cjs'),wins=[0,0,0,0],rows=layout===null?1:512;
  let configurations=0,revised=0;
  for(let i=0;i<rows;i++){
    const row=layout===null?0:512*layout+i,mask=catalog.mask(layout===null?4:5,row);
    const bodies=layout===null?D.pieces:D.layoutPieces(catalog.debrisKey(row));
    const allowed=F.poses.slice(1).filter(p=>mask&(1<<(p.id-1)));
    const variants=new Map();
    function witness(pose){
      if(!variants.has(pose.id)){
        const variant=qualifiedRoute(bodies,layout,pose);
        if(variant<0)throw Error('No qualified route for '+[layout,row,pose.id]);
        variants.set(pose.id,variant);configurations++;if(variant)revised++;
      }
      return variants.get(pose.id);
    }
    if(verifyAll)for(const pose of [F.poses[0],...allowed])witness(pose);
    for(let j=0;j<16;j++){
      const pose=j%2?allowed[(i+(j>>1))%allowed.length]:F.poses[0];
      const trial=9000+(73*i+17*j)%256,variant=witness(pose);
      for(const story of [false,true])for(const [m,mode] of modes.entries())
        wins[2*Number(story)+m]+=Number(fly(bodies,mode,trial,layout,story,true,pose,variant).win);
    }
  }
  console.log(JSON.stringify({layout,rows,configurations,revised,n:rows*16,wins}));
}
const assets=path.join(__dirname,'../assets');
if(require.main===module){
  const flag=process.argv[2]??'--verify';
  if(['--audit','--verify'].includes(flag)){
    const family=process.argv[3];
    if(family!==undefined && !/^(fixed|[0-7])$/.test(family))throw Error('Choose fixed or a layout from 0 to 7.');
    if(family!==undefined)audit(family==='fixed'?null:Number(family),flag==='--verify');
    else for(const layout of ['fixed',...D.layouts.keys()]){
      // Isolate each layout's trajectory cache during a full catalog replay.
      require('node:child_process').execFileSync(process.execPath,[__filename,flag,String(layout)],{stdio:'inherit'});
    }
  }else if(/^[0-7]$/.test(flag) && process.argv.length===4)fs.writeFileSync(process.argv[3],generateLayout(Number(flag)));
  else if(flag==='--generate'){
    const data=D.layouts.map((_,i)=>generateLayout(i));
    fs.writeFileSync(path.join(assets,'dodgeball-v1.bin'),Buffer.concat(data));
    fs.writeFileSync(path.join(assets,'challenge-mask.json'),JSON.stringify(approvedMask(D.pieces,null))+'\n');
  }else throw Error('Use --verify, --audit or --generate.');
}
module.exports={approvedMask};
