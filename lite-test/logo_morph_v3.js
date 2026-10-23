// Isolated morph test, no change to STUDIO camera handlers.
(()=>{
const $=id=>document.getElementById(id), slider=$('logoV2Slider'),num=$('logoV2Num'),status=$('logoV2Status');
let frame=0;
function k(){return window.xyzMorphKrpano || window.krpano || window.k || document.getElementById('pano')?.krpano || null;}
function apply(t){const p=Math.max(0,Math.min(1,t)); slider.value=Math.round(p*100);num.textContent=Math.round(p*100)+'%';
 const x=k();if(!x||typeof x.set!=='function'){status.textContent='krpano ещё не готов';return;}
 try{x.set('image.splats.fx_power',$('logoDepthFlip').checked?2:1);x.set('image.splats.fx_progress',p);x.set('image.splats.fx_mode',p>0?9:0);status.textContent=p>0?'Пространственный morph · режим 9':'Исходная модель';}
 catch(e){status.textContent='Ошибка: '+e.message;}}
function reset(){cancelAnimationFrame(frame);apply(0);}
$('logoV2Go').addEventListener('click',()=>{cancelAnimationFrame(frame);const start=performance.now();function tick(now){let a=Math.min(1,(now-start)/6600);let p;if(a<.46){const q=a/.46;p=q*q*(3-2*q);}else if(a<.56){p=1;}else{const q=(a-.56)/.44;p=1-q*q*(3-2*q);}apply(p);if(a<1)frame=requestAnimationFrame(tick);else reset();}frame=requestAnimationFrame(tick)});
$('logoV2Reset').addEventListener('click',reset);
$('logoDepthFlip').addEventListener('change',()=>apply(Number(slider.value)/100));
slider.addEventListener('input',()=>{cancelAnimationFrame(frame);apply(Number(slider.value)/100)});
window.addEventListener('keydown',e=>{if(e.key==='Escape')reset()});
})();