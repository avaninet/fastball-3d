document.querySelector('link[rel="icon"]').href=document.querySelector('.brand img').src;
for(const node of document.querySelectorAll('[data-soft-limit]'))node.textContent=Flight.limit.toFixed(3);
const [radial,depth,normal]=Flight.half.map(value=>2*value);
el('envelopeSize').textContent=[radial,normal,depth].join(' × ');
if(!Replays.openHash(location.hash))start(0,'Straight-Line',false);
window.addEventListener('hashchange',()=>Replays.openHash(location.hash));
requestAnimationFrame(frame);
