(()=>{'use strict';
const $=id=>document.getElementById(id);
// Real krpano loading progress. No random percentages.
const load=$('xyz70Loading'), num=$('xyz70Percent'), bar=$('xyz70Progress'), phase=$('xyz70Phase');
let viewer=null, loadClosed=false, gotProgress=false, progressAt=0;
function closeLoad(){if(loadClosed)return;loadClosed=true; num.textContent='100%';bar.style.width='100%';phase.textContent='Готово';load.classList.add('done'); document.documentElement.classList.remove('xyz-starting');
  setTimeout(()=>{load.style.display='none';},520);
}
function sample(){
 if(loadClosed)return;
 viewer=window.xyzMorphKrpano||window.krpano||null;
 if(window.__xyz70LoadError){phase.textContent='Ошибка загрузки сцены. Проверь PLY/сеть.';return;}
 if(viewer&&typeof viewer.get==='function'){
   const v=Number(viewer.get('progress.progress'));
   if(viewer.get('progress.progress')!=null&&Number.isFinite(v)&&v>=0&&v<=1){gotProgress=true;progressAt=Math.max(progressAt,Math.min(99,Math.floor(v*100)));}
   phase.textContent='Загрузка Gaussian-модели…';
 }
 if(window.__xyz70UIReady && (window.__xyz70Loaded || (gotProgress&&progressAt>=99&&viewer))) {closeLoad();return;}
 num.textContent=progressAt+'%'; bar.style.width=progressAt+'%';
}
const loop=setInterval(()=>{sample();if(loadClosed)clearInterval(loop);},120);
window.addEventListener('pagehide',()=>clearInterval(loop));
// Fallback for viewers where onloadcomplete isn't delivered but progress reports completion.

// Distinct screen-space ray travel. Does not alter krpano splats or camera.
const warp=$('xyz70Warp'),ctx=warp.getContext('2d',{alpha:true});
const wc=$('xyz70WarpCount'),ws=$('xyz70WarpSpeed'),wd=$('xyz70WarpDensity'),we=$('xyz70WarpEnabled');
const warpState=$('xyz70WarpState');
let active=false,stars=[],warpRAF=0,last=0,W=1,H=1,dpr=1;
const rand=(a,b)=>a+Math.random()*(b-a);
function resize(){W=innerWidth;H=innerHeight;dpr=Math.min(devicePixelRatio||1,1.5);warp.width=Math.round(W*dpr);warp.height=Math.round(H*dpr);warp.style.width=W+'px';warp.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0)}
function spawn(z0=null){const ang=rand(0,6.2831853),distance=rand(0,Math.hypot(W,H)*0.52);return {a:ang,r:z0===null?distance:z0,v:rand(.55,1.5),h:rand(180,230),alpha:rand(.5,1),width:rand(.45,1.35)}}
function relabel(){ $('xyz70WarpCountV').textContent=wc.value;$('xyz70WarpSpeedV').textContent=Number(ws.value).toFixed(1)+'×';$('xyz70WarpDensityV').textContent=wd.value+'%';warpState.textContent=active?'Активен':'Выкл.'}
function draw(now){if(!active)return;warpRAF=requestAnimationFrame(draw);
 const dt=Math.min(.050,((now-last)||16.66)/1000);last=now;
 ctx.clearRect(0,0,W,H);const cx=W*.5,cy=H*.5, speed=Number(ws.value),density=Number(wd.value)/100;
 const limit=Math.min(1200,Number(wc.value));const wanted=Math.round(limit*density);
 // Refill at center with gradual acceleration.
 if(stars.length<wanted){const add=Math.min(wanted-stars.length,Math.max(2,Math.ceil(90*dt*speed*density)));for(let i=0;i<add;i++)stars.push(spawn(rand(1,18)));}
 else if(stars.length>wanted)stars.length=wanted;
 const maxr=Math.hypot(W,H)*.65;
 ctx.globalCompositeOperation='lighter';
 for(const st of stars){const prev=st.r;st.r+=dt*(90+st.r*.7)*speed*st.v;
  if(st.r>maxr){Object.assign(st,spawn(rand(1,8)));continue}
  const x1=cx+Math.cos(st.a)*prev,y1=cy+Math.sin(st.a)*prev;
  const x2=cx+Math.cos(st.a)*st.r,y2=cy+Math.sin(st.a)*st.r;
  const shine=Math.min(1,st.r/Math.max(65,W*.35))*.8+.12;
  ctx.strokeStyle='hsla('+st.h+',100%,78%,'+(shine*st.alpha*.8)+')';ctx.lineWidth=st.width+(shine*.45);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
 }
 ctx.globalCompositeOperation='source-over';
}
function toggleWarp(on){if(on===active)return;active=!!on;we.checked=active;warp.style.display=active?'block':'none';
 if(!active){cancelAnimationFrame(warpRAF);warpRAF=0;stars=[];ctx.clearRect(0,0,W,H)}
 else {resize();last=performance.now();warpRAF=requestAnimationFrame(draw)}
 relabel();}
for(const c of [wc,ws,wd]) c.addEventListener('input',relabel);
we.addEventListener('change',()=>toggleWarp(we.checked));
window.addEventListener('resize',()=>{if(active)resize()});
relabel();
// Load prepared HYPERSPACE settings from standard v link; never autoplay STROBE.
try {
 const share=new URLSearchParams(location.search).get('v');
 const saved=share && typeof decodeState==='function'?decodeState(share):null;
 if(saved){
  if(Number.isFinite(Number(saved.hc70)))wc.value=String(Math.min(1200,Math.max(25,Number(saved.hc70))));
  if(Number.isFinite(Number(saved.hs70)))ws.value=String(Math.min(12,Math.max(.2,Number(saved.hs70))));
  if(Number.isFinite(Number(saved.hd70)))wd.value=String(Math.min(100,Math.max(5,Number(saved.hd70))));
  if(saved.h70 && !(document.documentElement.classList.contains('xyz-viewer-lite') && new URLSearchParams(location.search).get('fxui')==='0')) toggleWarp(true);
  relabel();
 }
} catch(err){console.warn('v70 settings restore:',err)}

// Short, off-by-default metallic flash. Do not auto-run from links.
const strobe=$('xyz70Strobe'),se=$('xyz70StrobeEnabled'),hz=$('xyz70StrobeHz'),bright=$('xyz70StrobeBrightness');
let strobbing=false,strobeRAF=0,strobeZero=0;
function showStrobeVals(){ $('xyz70StrobeHzV').textContent=Number(hz.value).toFixed(1)+' Гц';$('xyz70StrobeBrightnessV').textContent=bright.value+'%';$('xyz70StrobeState').textContent=strobbing?'Активен':'Выкл.';}
function flash(now){if(!strobbing)return;strobeRAF=requestAnimationFrame(flash);
 const period=1000/Number(hz.value),t=((now-strobeZero)%period)/period;
 // bright short pulse: a metallic/silver flash not a continuous white mask.
 const envelope=t<.09?Math.pow(Math.sin(Math.PI*t/.09),.55):0;
 strobe.style.opacity=String(envelope*(Number(bright.value)/100));
}
function toggleStrobe(on){ if(on && matchMedia('(prefers-reduced-motion:reduce)').matches){se.checked=false;window.alert('Строб отключён: в системе включено уменьшение анимации.');return;}
 strobbing=!!on;se.checked=strobbing; if(strobeRAF)cancelAnimationFrame(strobeRAF);strobeRAF=0;
 strobe.style.display=strobbing?'block':'none';strobe.style.opacity='0';
 if(strobbing){strobeZero=performance.now();strobeRAF=requestAnimationFrame(flash)}
 showStrobeVals();
}
se.addEventListener('change',()=>toggleStrobe(se.checked));
for(const x of [hz,bright])x.addEventListener('input',showStrobeVals);
showStrobeVals();
document.addEventListener('visibilitychange',()=>{if(document.hidden)toggleStrobe(false)});

// Honor main FX OFF switch without replacing existing effect infrastructure.
function refreshFx(){const off=$('toolEffects')?.classList.contains('off');warp.style.visibility=off?'hidden':'visible';strobe.style.visibility=off?'hidden':'visible';}
new MutationObserver(refreshFx).observe($('toolEffects'),{attributes:true,attributeFilter:['class']});refreshFx();

// UI bright borders ONLY while actions run.
const pulse=()=>{
 const apply=(id,on)=>{$(id)?.classList.toggle('xyz70-on',!!on)};
 apply('toolPlay',(($('toolPlay')?.textContent)||'').includes('STOP'));
 apply('toolTour',typeof tourPlaying!=='undefined'&&tourPlaying);
 apply('toolVideo',$('videoFloat')?.style.display!=='none');
 apply('toolMusic',!!$('musicEnabled')?.checked&&typeof musicAudio!=='undefined'&&!musicAudio.paused);
 apply('toolAxes',$('axesCanvas')?.style.display!=='none'&&!$('axesCanvas')?.classList.contains('hidden'));
 apply('toolEffects',!$('toolEffects').classList.contains('off'));
 apply('toolHome',false);apply('toolReset',false);
};
const uiPulse=setInterval(pulse,180);pulse();
window.addEventListener('pagehide',()=>{toggleWarp(false);toggleStrobe(false);clearInterval(uiPulse)});
})();
