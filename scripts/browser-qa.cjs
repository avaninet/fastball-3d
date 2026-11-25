const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tests = fs.readFileSync(path.join(root, 'tests/browser-tests.js'), 'utf8');
const runner = path.join(root, 'qa-runner.html');
fs.writeFileSync(runner, page.replace('</body>', () => '<script>' + tests + '</script></body>'));
console.log('Open qa-runner.html and read the result at the bottom of the page.');

// Pass a Chromium executable to also run the assertions at three window sizes.
if (process.argv[2]) {
  for (const size of ['1440,950', '1366,768', '390,844']) {
    const dom = execFileSync(process.argv[2], [
      '--headless', '--disable-gpu', '--disable-crash-reporter', '--window-size=' + size,
      '--virtual-time-budget=1200', '--dump-dom', ...process.argv.slice(3), pathToFileURL(runner).href
    ], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] });
    const result = dom.match(/<pre id="qa-result">([^<]+)<\/pre>/);
    if (!result) throw new Error(size + ' produced no browser test result');
    const { passed, errors } = JSON.parse(result[1]);
    if (errors.length || !passed.length) throw new Error(size + ' ' + JSON.stringify(errors));
    console.log(size + ' · ' + passed.length + ' browser checks passed');
  }
}
