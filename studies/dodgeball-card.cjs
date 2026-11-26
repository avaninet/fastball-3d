// Render an actual catalog flight through the game's flight-card code.
// Usage: node studies/dodgeball-card.cjs catalog.json example.svg [DB1-...]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {F,D,start,fly}=require('./random-dodgeball.cjs');
const [input,output,code='DB1-007C5282']=process.argv.slice(2);
if(!input||!output)throw Error('Supply the catalog and an output SVG');
const entry=JSON.parse(fs.readFileSync(input,'utf8')).entries.find(e=>e.code===code);
if(!entry)throw Error('Unknown catalog code '+code);
const bodies=D.pieces.map((base,i)=>({...base,...(i?entry.frame:entry.cover)}));
const run=fly(bodies,'Orbital');
if(!run.win)throw Error('Expected soft capture');
const flight={initial:{...start,name:'Random Dodgeball study'},pos:run.state,done:'capture',
  time:run.time,limit:600,mode:'Orbital',soft:true,seed:code,debrisPieces:bodies,
  finishedAt:new Date(),mask:run.mask,log:{releases:run.releases,fast:[]}};
const clockText=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
const env={Flight:F,Debris:D,Visor:{clockText},cockpitFonts:{sans:'Arial, sans-serif',mono:'Consolas, monospace'},
  seedLabel:s=>s,outcomes:{capture:'Grab bars secured'}};
const read=name=>fs.readFileSync(path.join(__dirname,'../src',name+'.js'),'utf8');
const log=vm.runInNewContext(read('readout')+read('log')+';FlightLog',env);
fs.writeFileSync(output,log.card(flight));
