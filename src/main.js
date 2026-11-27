'use strict';

document.querySelector('link[rel="icon"]').href=document.querySelector('.brand img').src;
for(const node of document.querySelectorAll('[data-soft-limit]'))node.textContent=Flight.limit.toFixed(3);
for(const node of document.querySelectorAll('[data-firm-limit]'))node.textContent=Flight.captureLimit('firm').toFixed(3);
for(const [value,rule] of [['firm','firm'],['soft',true]]){
  el('captureRule').querySelector('[value="'+value+'"]').textContent=Readout.capture(rule);
}
el('envelopeSize').textContent=Flight.half.map(value=>2*value).join(' × ');
if(!Replays.openHash(location.hash))start(0,'Straight-Line',false);
window.addEventListener('hashchange',()=>Replays.openHash(location.hash));
requestAnimationFrame(frame);
