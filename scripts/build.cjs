const fs = require('node:fs');
const path = require('node:path');

const {sourceHash} = require('./csp.cjs');

const root = path.resolve(__dirname, '..');
const read = (file, encoding) => fs.readFileSync(path.join(root, file), encoding);
let page = read('src/visor.html', 'utf8');
const version = require('../package.json').version.replace(/\.0$/, '');
page = page.replaceAll('__VERSION__', version);
const parts = {
  READOUT: read('src/readout.js', 'utf8'),
  MAIN: read('src/main.js', 'utf8'),
  COCKPIT_STYLE: read('src/cockpit.css', 'utf8'),
  LOG: read('src/log.js', 'utf8'),
  SHARE: read('src/share.js', 'utf8'),
  STORY: read('src/story.js', 'utf8'),
  PHYSICS: read('src/physics.js', 'utf8'),
  EARTH_SKY: read('src/earth.js', 'utf8'),
  STATION: read('src/station.js', 'utf8'),
  EQUIPMENT: read('src/equipment.js', 'utf8'),
  DRAW: read('src/draw.js', 'utf8'),
  GAME: read('src/game.js', 'utf8'),
  PATCH: 'data:image/webp;base64,' + read('assets/mission-patch.webp', 'base64'),
  EARTH: 'data:image/webp;base64,' + read('assets/earth-horizon.webp', 'base64')
};
for (const [name, content] of Object.entries(parts)) {
  const token = '__' + name + '__';
  if (page.split(token).length !== 2) throw new Error('Expected one template marker ' + token);
  page = page.replace(token, () => content);
}
const scripts = [...page.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
const styles = [...page.matchAll(/<style>([\s\S]*?)<\/style>/g)];
page = page.replace('__SCRIPT_HASHES__', scripts.map(match => sourceHash(match[1])).join(' '))
           .replace('__STYLE_HASHES__', styles.map(match => sourceHash(match[1])).join(' '));
if (process.argv.includes('--check')) {
  if (!fs.readFileSync(path.join(root, 'index.html')).equals(Buffer.from(page))) {
    throw new Error('index.html is out of date. Run node scripts/build.cjs and include the rebuilt game.');
  }
  console.log('index.html matches its sources.');
} else {
  fs.writeFileSync(path.join(root, 'index.html'), page);
  console.log('Built index.html');
}
