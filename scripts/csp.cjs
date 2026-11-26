const {createHash} = require('node:crypto');

// HTML parsing normalizes line endings before the browser computes a CSP hash.
function sourceHash(source) {
  const normalized = source.replace(/\r\n?/g, '\n');
  return "'sha256-" + createHash('sha256').update(normalized).digest('base64') + "'";
}

module.exports = {sourceHash};
