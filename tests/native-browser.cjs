// Run against a local ChromeDriver. Exercise the browser's own Space activation
// and image decoder on the standalone distribution, in a disposable session.
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

const endpoint = 'http://127.0.0.1:9515';
async function request(method, route, body) {
  const response = await fetch(endpoint + route, {
    method,
    headers: {'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const {value} = await response.json();
  if (!response.ok || value?.error) throw Error(value?.message || response.statusText);
  return value;
}

async function main() {
  const {sessionId} = await request('POST', '/session', {capabilities: {alwaysMatch: {
    browserName: 'chrome', 'goog:chromeOptions': {args: ['--headless', '--disable-gpu']}
  }}});
  const session = '/session/' + sessionId;
  const post = (route, body) => request('POST', session + route, body);
  const read = script => post('/execute/sync', {script: 'return ' + script, args: []});
  async function button(selector, action) {
    const element = await post('/element', {using: 'css selector', value: selector});
    const id = element['element-6066-11e4-a52e-4f735466cecf'];
    if (action === 'space') {
      await post('/element/' + id + '/value', {text: ' ', value: [' ']});
    } else {
      await post('/element/' + id + '/click', {});
    }
  }

  try {
    await post('/url', {url: pathToFileURL(path.resolve(__dirname, '../index.html')).href});
    await button('#showPreview', 'space');
    assert.equal(await read("el('showPreview').checked"), true);
    for (const label of ['Pause', 'Resume', 'Pause']) {
      await button('#pause', 'space');
      assert.equal(await read("el('pause').textContent"), label);
    }
    const slider=await post('/element',{using:'css selector',value:'#power'});
    const offset=await read('Math.round(el("power").getBoundingClientRect().width*.2)');
    const mouse=actions=>post('/actions',{actions:[{type:'pointer',id:'power-drag',parameters:{pointerType:'mouse'},actions}]});
    const move=x=>({type:'pointerMove',origin:slider,x,y:0,duration:60});
    await mouse([move(-offset),{type:'pointerDown',button:0}]);
    assert.equal(await read('power'),35);
    await mouse([move(offset)]);
    assert.deepEqual(await read('[power,el("power").valueAsNumber,el("powerValue").textContent]'),[75,75,'75%']);
    await mouse([{type:'pointerUp',button:0}]);
    assert.equal(await read('power'),75);
    await post('/actions',{actions:[{type:'key',id:'cockpit',actions:[
      {type:'keyDown',value:'\uE012'},{type:'keyUp',value:'\uE012'}]}]});
    assert.equal(await read('power'),70,'focused slider arrow moves one stop');
    const touch=actions=>post('/actions',{actions:[{type:'pointer',id:'power-touch',parameters:{pointerType:'touch'},actions}]});
    await touch([move(offset),{type:'pointerDown',button:0},move(-offset)]);
    assert.equal(await read('power'),35,'touch drag snaps while the finger is down');
    await touch([{type:'pointerUp',button:0}]);
    assert.equal(await read('power'),35);
    const bearing=await read('Flight.direction(yaw,pitch)');
    async function tap(id){
      const origin=await post('/element',{using:'css selector',value:'#'+id});
      await touch([{type:'pointerMove',origin,x:0,y:0},{type:'pointerDown',button:0},{type:'pointerUp',button:0}]);
    }
    await tap('turnAft');
    assert.ok(await read('Flight.dot(Flight.direction(yaw,pitch),'+JSON.stringify(bearing)+')<-.999999'));
    await post('/actions',{actions:[{type:'key',id:'cockpit',actions:[{type:'keyDown',value:'v'},{type:'keyUp',value:'v'}]}]});
    assert.ok(await read('Flight.dot(Flight.direction(yaw,pitch),'+JSON.stringify(bearing)+')>.999999'));
    await tap('tool5');
    assert.equal(await read("el('tool5').querySelector('small').textContent"),await read("(Flight.impulse(5,flight.mask)*power/100).toFixed(3)+' m/s'"));
    await tap('throw');
    assert.equal(await read('flight.throws'),1,'touch releases the selected tool once');

    for (const [slot,id] of ['power','clockRate','showPreview'].entries()) {
      await button('#'+id, 'click');
      assert.equal(await read('document.activeElement.id'), id);
      const throws = await read('flight.throws'), power = await read('el("power").valueAsNumber');
      const keys = [String(slot+1), power===100?'[':']', '\uE007'];
      await post('/actions', {actions: [{type: 'key', id: 'cockpit', actions:
        keys.flatMap(value=>[{type:'keyDown',value},{type:'keyUp',value}])}]});
      assert.equal(await read('flight.throws'), throws+1);
      assert.equal(await read('flight.log.releases.at(-1).tool'), await read('rackOrder['+slot+']'));
      assert.equal(await read('flight.log.releases.at(-1).power'), power+(power===100?-5:5));
    }
    await button('#manual', 'space');
    await button('#guide summary', 'space');
    assert.equal(await read("document.querySelector('#guide details').open"), true);
    await button('#guide .primary', 'space');
    await button('#new', 'space');
    await button('#storyMode', 'space');
    assert.equal(await read("el('storyMode').checked"), true);
    await button('#setup .dialogFoot .close', 'space');
    assert.equal(await read("el('setup').open"), false);

    const exportResult = await post('/execute/async', {
      script: `const done=arguments[0];
        (async () => {
          start(5,'Orbital',true,2560,false,null,{preview:true,coach:true},16);pause();
          // Exercise both clipboard outcomes without modifying the host clipboard.
          let copied;
          Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
            writeText:async text=>{copied=text;}
          }});
          await copyReplay(flight,el('message'));
          const success=copied===Replays.link(flight);
          navigator.clipboard.writeText=async()=>{throw Error('Clipboard unavailable')};
          await copyReplay(flight,el('message'));
          const fallback=!running && el('copyDialog').open && el('copyText').value===copied &&
            el('message').textContent.includes('paused');
          el('copyDialog').close();advance(flight.limit);updateLossDebrief(lossDebriefAt);
          el('openShareCard').click();
          let png;
          HTMLAnchorElement.prototype.click=function(){png=this.href};
          await el('saveCard').onclick();
          done({success,fallback,png:png?.startsWith('data:image/png;base64,iVBORw0KGgo')});
        })().catch(error=>done({error:String(error)}));`,
      args: []
    });
    assert.deepEqual(exportResult, {success: true, fallback: true, png: true});
    const snapshot = '({code:Challenge.encode(flight), suit:flight.initial, pose:flight.pose.axes, ' +
      'debris:flight.debrisPieces.map(body=>[body.p,body.v]), aids:flight.startingAids})';
    const sender = await read(snapshot);
    const link = await read('Replays.link(flight)');
    await post('/url', {url: 'about:blank'});
    await post('/url', {url: pathToFileURL(path.resolve(__dirname, '../index.html')).href + link});
    assert.deepEqual(await read(snapshot), sender);
    assert.equal(await read('started'), false);
    console.log('Native keyboard, clipboard fallback, PNG export and fresh challenge load passed.');
  } finally {
    await request('DELETE', session);
  }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
