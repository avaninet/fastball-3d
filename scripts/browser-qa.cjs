const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname,'..');
const runner = path.join(root,'qa-runner.html');
const page = fs.readFileSync(path.join(root,'index.html'),'utf8');
const tests = fs.readFileSync(path.join(root,'tests/browser-tests.js'),'utf8');

// A same-document frame sets the actual CSS viewport independently of Chromium's
// minimum desktop window width and the space taken by its headless window chrome.
const report = "parent.document.getElementById('report').textContent=JSON.stringify(JSON.parse(document.getElementById('qa-result').textContent));";
const inner = page.replace('</body>',()=>'<script>window.addEventListener("load",()=>{\n'+tests+'\n'+report+'\n});</script></body>');
const fixture = JSON.stringify(inner).replace(/</g,'\\u003c');
fs.writeFileSync(runner,`<!doctype html><meta charset="utf-8"><title>Fastball 3D browser checks</title>
<style>*{box-sizing:border-box}body{margin:0;background:#111;color:#eee}iframe{display:block;border:0}pre{white-space:pre-wrap}</style>
<iframe title="Test cockpit"></iframe><pre id="report"></pre><script>
const size=new URLSearchParams(location.search).get('viewport')?.match(/^(\\d+)x(\\d+)$/);
const frame=document.querySelector('iframe');
frame.style.width=size?size[1]+'px':'100vw';frame.style.height=size?size[2]+'px':'90vh';
frame.srcdoc=${fixture};
</script>`);
console.log('Open qa-runner.html for the in-page results.');
if(process.argv[2]){
  for(const [width,height] of [[1440,950],[1366,768],[390,844],[844,390]]){
    const profile=fs.mkdtempSync(path.join(os.tmpdir(),'fastball-qa-'));
    try{
      const url=pathToFileURL(runner);url.searchParams.set('viewport',width+'x'+height);
      const dom=execFileSync(process.argv[2],['--headless',...process.argv.slice(3),
        '--user-data-dir='+profile,'--dump-dom',url.href],{encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024,stdio:'pipe',windowsHide:true});
      const output=dom.match(/<pre id="report">([^<]*)<\/pre>/)?.[1];
      if(!output)throw Error(width+' missing test result');
      const {passed,errors,viewport,rects}=JSON.parse(output.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'));
      if(viewport[0]!==width||viewport[1]!==height)throw Error('Unexpected CSS viewport '+viewport);
      if(errors.length||!passed.length)throw Error(width+' '+errors.join('\n'));
      console.log(width+' × '+height+' · '+passed.length+' checks · CSS rectangles '+JSON.stringify(rects));
    }finally{
      try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});}catch{/* Chromium may still be releasing its temporary profile. */}
    }
  }
}
