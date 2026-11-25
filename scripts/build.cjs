const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file, encoding) => fs.readFileSync(path.join(root, file), encoding);
let page = read('src/visor.html', 'utf8');
const parts = {
  COCKPIT_STYLE: read('src/cockpit.css', 'utf8'),
  LOG: read('src/log.js', 'utf8'),
  SHARE: read('src/share.js', 'utf8'),
  STORY: read('src/story.js', 'utf8'),
  PHYSICS: read('src/physics.js', 'utf8'),
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
fs.writeFileSync(path.join(root, 'index.html'), page);
console.log('Built index.html');
