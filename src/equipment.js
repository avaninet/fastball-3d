const Equipment = (() => {
  function makeSprite(i) {
    const canvas=document.createElement('canvas');
    canvas.width=160;canvas.height=112;
    const c=canvas.getContext('2d');c.scale(2,2);c.translate(40,28);c.rotate(-.16);
    function shape(pts,fill,edge='#738082'){c.beginPath();c.moveTo(...pts[0]);for(const p of pts.slice(1))c.lineTo(...p);c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle=edge;c.lineWidth=1.2;c.stroke();}
    function rect(x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
    const silver='#bbc8c7',dark='#6c7776',amber='#cda366';
    // Use the same oblique view of each tool at every distance. Distinctive
    // parts (the socket, gate, chuck and lens) carry the silhouette at small sizes.
    if(i===0){ // Socket driver, with a steel shaft and a recessed socket.
      rect(-25,-2,31,4,silver);
      shape([[4,-5],[10,-7],[24,-7],[29,-3],[28,4],[23,7],[9,6],[4,4]],dark);
      rect(10,-6,13,2,amber);rect(12,-1,10,2,'#919e9e');
      shape([[-30,-4],[-27,-6],[-21,-5],[-19,-2],[-20,4],[-27,5],[-30,3]],silver);
      rect(-29,-2,2,5,'#536163');
    }
    if(i===1){ // T-handle
      rect(-3,-9,5,30,silver);
      shape([[-22,-11],[20,-11],[23,-7],[21,-4],[-22,-4],[-24,-8]],dark);
      rect(-19,-10,35,2,silver);rect(-4,16,7,5,amber);rect(-2,20,4,3,silver);
    }
    if(i===2){ // Gas cartridge, valve neck at the left and a rolled base at the right.
      shape([[-18,-6],[-12,-10],[16,-10],[22,-7],[24,-2],[24,5],[20,10],[-12,10],[-18,6],[-21,3],[-21,-3]],silver);
      rect(-28,-3,8,6,dark);rect(-29,-5,3,10,silver);rect(-11,-9,6,18,amber);
      rect(-2,-7,16,2,'#d9e4e0');rect(18,-7,2,15,dark);
    }
    if(i===3){ // Wrench pouch with one open jaw showing above the flap.
      shape([[-3,-8],[1,-15],[-1,-19],[1,-23],[4,-19],[7,-19],[10,-23],[11,-18],[7,-14],[4,-7]],silver);
      shape([[-24,-9],[-10,-15],[22,-11],[26,10],[17,14],[-25,9]],'#987950');
      shape([[-24,-9],[-10,-14],[23,-10],[12,-3],[-23,-4]],'#c7a675');
      rect(-9,-10,5,21,'#545457');rect(9,-8,4,21,'#545457');rect(-7,1,3,4,silver);
    }
    if(i===4){ // Cordless drill with a separate trigger, grip, foot, chuck and bit.
      shape([[-9,-3],[2,-3],[-1,15],[-7,19],[-14,15]],dark);
      rect(0,2,5,4,'#c3ccca');
      shape([[-19,-14],[9,-14],[17,-8],[17,0],[8,5],[-17,1],[-22,-4]],amber);
      rect(15,-9,8,9,silver);rect(23,-7,3,5,dark);rect(26,-6,8,3,silver);
      for(const x of [-17,-13,-9])rect(x,-11,2,5,'#696f69');
      shape([[-16,13],[-1,15],[2,19],[1,22],[-18,19]],'#b29a65');
    }
    if(i===5){ // Spare battery with two exposed contacts on its top face.
      shape([[-25,-9],[-13,-16],[25,-11],[25,7],[13,15],[-25,10]],dark);
      shape([[-25,-9],[-13,-15],[25,-11],[13,-4]],silver);
      shape([[13,-4],[25,-11],[25,8],[13,15]],'#7f8d8d');
      rect(-11,-15,6,3,'#575e5c');rect(0,-14,6,3,'#575e5c');
      rect(-21,-5,28,4,amber);rect(-18,3,10,3,'#c2cbc8');
    }
    if(i===6){ // Asymmetric carabiner with a straight spring gate and hinge.
      c.lineCap='round';c.lineWidth=4.5;c.strokeStyle=silver;c.beginPath();
      c.moveTo(4,-12);c.bezierCurveTo(-5,-16,-25,-4,-23,5);
      c.bezierCurveTo(-22,12,-15,14,-8,11);c.lineTo(14,5);
      c.bezierCurveTo(23,3,23,-5,17,-8);c.stroke();
      c.strokeStyle=amber;c.lineWidth=3.5;c.beginPath();c.moveTo(4,-12);c.lineTo(17,-8);c.stroke();
      c.fillStyle=dark;c.beginPath();c.arc(5,-12,1.5,0,2*Math.PI);c.fill();
    }
    if(i===7){ // Hand lamp with a flared reflector and ribbed grip.
      rect(-23,-6,28,12,dark);for(const x of [-18,-12,-6])rect(x,-5,2,10,silver);
      shape([[4,-6],[18,-13],[23,-12],[23,12],[18,13],[4,6]],amber);
      rect(20,-11,4,22,'#dfeddb');rect(21,-7,2,14,'#b8d4d3');
    }
    if(i===8){ // Protective camera housing with a raised shutter and recessed lens.
      rect(-16,-15,9,4,dark);shape([[-24,-12],[13,-12],[23,-6],[23,12],[-24,12]],silver);
      rect(-19,-8,9,4,amber);
      c.fillStyle=dark;c.beginPath();c.arc(7,0,10,0,Math.PI*2);c.fill();
      c.fillStyle='#425c69';c.beginPath();c.arc(7,0,6,0,Math.PI*2);c.fill();
      c.fillStyle='#bdd0cf';c.beginPath();c.arc(5,-2,1.6,0,Math.PI*2);c.fill();
    }
    return canvas;
  }

  // Cache the same drawing for rack and flight. Distant shades can use a
  // smaller bitmap because they appear at only a few pixels across.
  const sprites=Flight.gear.map((_,i)=>{
    const original=makeSprite(i),shades=[original];
    for(let level=1;level<=4;level++){
      const tile=document.createElement('canvas');tile.width=80;tile.height=56;
      const ctx=tile.getContext('2d');ctx.drawImage(original,0,0,tile.width,tile.height);
      ctx.globalCompositeOperation='source-atop';ctx.fillStyle='rgba(9,16,21,'+(level*.12)+')';
      ctx.fillRect(0,0,tile.width,tile.height);shades.push(tile);
    }
    return shades;
  });
  function toolArt(canvas,i){
    const image=sprites[i][0];
    canvas.width=image.width;canvas.height=image.height;
    canvas.getContext('2d').drawImage(image,0,0);
  }

  const farRange=48;
  function launch(state,tool,power,aim){
    const {add,scale}=Flight;
    // The hand is ahead of and below the release-time visor. Both cameras see
    // one world position, including if the pilot immediately turns around.
    const hand=add(state.pos.p,add(scale(aim.forward,.72),add(scale(aim.up,-.18),scale(aim.right,.07))));
    if(Station.crosses(state.pos.p,hand,state.pose))return;
    const speed=Flight.gear[tool].speed*power/100;
    const start={p:hand,v:add(state.pos.v,scale(aim.forward,speed))};
    state.objects.push({tool,start,time:state.time,updated:state.time,p:hand,range:Flight.norm(Flight.sub(hand,state.pos.p)),hidden:false});
  }
  function advance(state){
    let count=0;
    for(const obj of state.objects){
      const now=state.time;
      if(now>obj.updated){
        const p=Flight.motion(obj.start,now-obj.time,state.mode).p;
        const range=Flight.norm(Flight.sub(p,state.pos.p));
        if(range>=farRange)continue;
        // Sweep thin panels between frames. Subdivide long Orbital jumps so a
        // fast clock or guided coast follows the bend through the station.
        let prev=obj.p,hit=false;
        if(state.mode==='Orbital'){
          for(let t=obj.updated+1;t<now;t++){
            const next=Flight.motion(obj.start,t-obj.time,state.mode).p;
            if(Station.crosses(prev,next,state.pose)){hit=true;break;}
            prev=next;
          }
        }
        if(hit||Station.crosses(prev,p,state.pose))continue;
        obj.p=p;obj.updated=now;obj.range=range;obj.hidden=Station.crosses(state.pos.p,p,state.pose);
      }
      state.objects[count++]=obj;
    }
    state.objects.length=count;
  }
  function draw(ctx,cam,w,h,objects,small){
    if(!objects.length)return;
    ctx.save();
    for(const obj of objects){
      if(obj.hidden)continue;
      const q=cam.world(obj.p);
      if(q[2]<.09)continue;
      // Ease the perspective size near the hand. Use one scale for both axes
      // so even a tool near the edge of the visor keeps its original silhouette.
      const span=.44*cam.f,width=span/(q[2]+span/(small?68:128));
      const [x,y]=cam.screen(q),fade=Flight.clamp((obj.range-2)/(farRange-2),0,1);
      const tile=sprites[obj.tool][Math.min(4,Math.floor(fade*5))],height=width*tile.height/tile.width;
      if(width<1||x+width/2<0||x-width/2>w||y+height/2<0||y-height/2>h)continue;
      ctx.globalAlpha=1-fade;
      ctx.drawImage(tile,x-width/2,y-height/2,width,height);
    }
    ctx.restore();
  }
  return {launch,advance,draw,toolArt};
})();
