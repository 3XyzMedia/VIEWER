// Isolated morph test, no change to STUDIO camera handlers.
(()=>{
const $=id=>document.getElementById(id), slider=$('logoV2Slider'),num=$('logoV2Num'),status=$('logoV2Status');
// The model's own Gaussian splats are the sole particle system.
let frame=0;
// v19 MOBILE SAFE: no splatshader mode 9 on phones.
const neonMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints>0 && innerWidth<900);
const neon=document.getElementById('xyzMobileNeon19');
const neonSize=document.getElementById('mobileNeonSize'),neonDuration=document.getElementById('mobileNeonDuration');
let neonTimer=0,neonActive=false;
const brandNeon=document.getElementById('brand');
function collapseBrand(){
 if(!brandNeon)return;
 brandNeon.classList.remove('expanded');
 brandNeon.setAttribute('aria-expanded','false');
}
const qp=new URLSearchParams(location.search);
function nv(name, fallback, low, high){const n=Number(qp.get(name));return qp.has(name)&&Number.isFinite(n)?Math.min(high,Math.max(low,n)):fallback}
neonSize.value=String(nv('neonsize',1,.5,2));
neonDuration.value=String(nv('neonduration',4.2,1.5,9));
function neonLabels(){
 document.getElementById('mobileNeonSizeValue').textContent=Number(neonSize.value).toFixed(3)+'×';
 document.getElementById('mobileNeonDurationValue').textContent=Number(neonDuration.value).toFixed(1)+' с';
}
neonLabels();neonSize.addEventListener('input',neonLabels);neonDuration.addEventListener('input',neonLabels);
function stopNeon(){
 clearTimeout(neonTimer);neonTimer=0;neonActive=false;
 if(neonMobile)collapseBrand();
 if(neon){neon.classList.remove('on');neon.style.display='none'}
}
function playNeon(){
 if(!neonMobile||!neon)return;
 if(neonActive){stopNeon();return}
 clearTimeout(neonTimer);neonTimer=0;neonActive=false;
 const duration=Number(neonDuration.value);
 neon.style.setProperty('--neon-duration',duration+'s');
 neon.style.setProperty('--neon-scale',neonSize.value);
 neon.style.display='flex'; neon.classList.add('on');
 if(brandNeon){brandNeon.classList.add('expanded');brandNeon.setAttribute('aria-expanded','true');}
 neonActive=true;
 neonTimer=setTimeout(stopNeon, duration*1000+100);
}
if(neonMobile){
 document.getElementById('logoV2Go').addEventListener('click',e=>{
   e.preventDefault();e.stopImmediatePropagation();playNeon();
 },true);
 slider.disabled=true;slider.title='На смартфоне GPU MORPH отключён';
 status.textContent='Мобильный неон · безопасный режим';
 window.addEventListener('pagehide',stopNeon);
}

// v38: one krpano Gaussian geometry, no ThreeJS double layer. REAL LABEL 8K target table, tuned for readability and startup sanity.
// No second WebGL canvas and no desktop/mobile visual overlay.
// Restore exact XYZ orientation from SHARE. URL params override packed state.
const params = new URLSearchParams(location.search);
let packedAngles = null;
try {
  const t=params.get('v');
  if(t && t.startsWith('j')){
    let s=t.slice(1).replace(/-/g,'+').replace(/_/g,'/');
    while(s.length%4)s+='=';
    const parsed=JSON.parse(atob(s));
    if(Array.isArray(parsed.logoXYZ)&&parsed.logoXYZ.length===3) packedAngles=parsed.logoXYZ;
  }
}catch(_){}
function readAngle(axis,idx,fallback){
  const raw=params.get('morph'+axis.toLowerCase());
  const val=raw!==null?Number(raw):(packedAngles?Number(packedAngles[idx]):fallback);
  return Number.isFinite(val)?Math.max(0,Math.min(360,Math.round(val))):fallback;
}
const xSlider=$('logoXRotation'),ySlider=$('logoYRotation'),zSlider=$('logoZRotation'),zValue=$('logoZRotationValue');
const heightSlider=$('logoZOffset'),heightValue=$('logoZOffsetValue');
const offX=$('logoXOffset'),offY=$('logoYOffset');
const clampOff=v=>Number.isFinite(v)?Math.max(-150,Math.min(150,v)):0;
for(const [axis,slider] of [['x',offX],['y',offY]]){const p=params.get('morpho'+axis);slider.value=String(clampOff(p===null?0:Number(p)));$('logo'+axis.toUpperCase()+'OffsetValue').textContent=Number(slider.value).toFixed(1);}
function clampHeight(v){return Number.isFinite(v)?Math.max(-150,Math.min(150,v)):0;}
const heightParam=params.get('morphheight');
const packedHeight=(()=>{try{const t=params.get('v');if(!t||!t.startsWith('j'))return 0;
let s=t.slice(1).replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';
return Number(JSON.parse(atob(s)).logoZOffset)||0;}catch(_){return 0;}})();
heightSlider.value=String(clampHeight(heightParam===null?packedHeight:Number(heightParam)));
heightValue.textContent=Number(heightSlider.value).toFixed(1)+' ед.';
for(const [a,i,slider,defaultAngle] of [['X',0,xSlider,0],['Y',1,ySlider,0],['Z',2,zSlider,180]]){
  slider.value=String(readAngle(a,i,defaultAngle));
  $('logo'+a+'RotationValue').textContent=slider.value+'°';
}
window.xyzMorphSharedAngles=[Number(xSlider.value),Number(ySlider.value),Number(zSlider.value)];
function k(){return window.xyzMorphKrpano || window.krpano || window.k || document.getElementById('pano')?.krpano || null;}
function restoreSharedOrientation(){
  const q=new URLSearchParams(location.search);
  if(q.get('ui')!=='locked')return;
  for(const [axis,s] of [['x',xSlider],['y',ySlider],['z',zSlider]]){
    const raw=q.get('morph'+axis);
    if(raw===null)continue;
    const v=Number(raw);
    if(!Number.isFinite(v))continue;
    s.value=String(Math.max(0,Math.min(360,Math.round(v))));
    const lab=$('logo'+axis.toUpperCase()+'RotationValue');
    if(lab)lab.textContent=s.value+'°';
  }
  if(q.has('morphmirror')) $('logoMirrorX').checked=q.get('morphmirror')==='1';
  if(q.has('morphdepth')) $('logoDepthFlip').checked=q.get('morphdepth')==='1';
  for(const [axis,s] of [['x',offX],['y',offY]]) {if(q.has('morpho'+axis)){s.value=String(clampOff(Number(q.get('morpho'+axis))));$('logo'+axis.toUpperCase()+'OffsetValue').textContent=Number(s.value).toFixed(1);}}
  if(q.has('morphheight')){
    heightSlider.value=String(clampHeight(Number(q.get('morphheight'))));
    heightValue.textContent=Number(heightSlider.value).toFixed(1)+' ед.';
  }
}
if(params.has('morphsize')){const s=Number(params.get('morphsize'));if(Number.isFinite(s))$('logoSplatSize').value=String(Math.max(.004,Math.min(.12,s)));} $('logoSplatSizeValue').textContent=Number($('logoSplatSize').value).toFixed(3)+'×';
function getGlobalScale(){const el=document.getElementById('scale');const v=el?Number(el.value):0.15;return Number.isFinite(v)?Math.max(0.01,v):0.15;}
function morphCompactUniform(){const ui=Number($('logoSplatSize').value);const gs=getGlobalScale();const factor=Math.pow(gs/0.15,-0.15);return Math.max(0.004,Math.min(0.12,ui*factor));}

const radiusControl=$('logoMorphRadius39');
const radiusValue=$('logoMorphRadiusValue39');
const scaleControl=$('logoTextScale');
if(params.has('morphradius')){const r=Number(params.get('morphradius'));if(Number.isFinite(r))radiusControl.value=String(Math.min(3,Math.max(.5,r)));}radiusValue.textContent=Number(radiusControl.value).toFixed(2)+'×';
if(params.has('morphscale')){const n=Number(params.get('morphscale'));if(Number.isFinite(n))scaleControl.value=String(Math.max(.1,Math.min(10,n)));}
$('logoTextScaleValue').textContent=Number(scaleControl.value).toFixed(3)+'×';
function apply(t){restoreSharedOrientation();const p=Math.max(0,Math.min(1,t)); slider.value=Math.round(p*100);num.textContent=Math.round(p*100)+'%';
 const x=k();if(!x||typeof x.set!=='function'){status.textContent='krpano ещё не готов';return;}

 try{x.set('image.splats.fx_power',$('logoDepthFlip').checked?2:1);x.set('image.splats.fx_radius',($('logoMirrorX').checked?-1:1)*100);
 x.set('image.splats.fx_logox',Number(offX.value));
 x.set('image.splats.fx_logoy',Number(offY.value));
 x.set('image.splats.fx_logoz',Number(heightSlider.value));
 x.set('image.splats.fx_labelsize',morphCompactUniform());
 x.set('image.splats.fx_morphradius',Number(radiusControl.value));
 x.set('image.splats.fx_textscale',Number(scaleControl.value));
 x.set('image.splats.fx_rotx',Number(xSlider.value));
 x.set('image.splats.fx_roty',Number(ySlider.value));
 x.set('image.splats.fx_rotz',Number(zSlider.value));
 x.set('image.splats.fx_progress',p);
 x.set('image.splats.fx_mode',p>0?9:0);
 status.textContent=p>0?'Модель → броуновское облако → REAL LABEL 4K · V39':'Исходная модель';}
 catch(e){status.textContent='Ошибка: '+e.message;}}
// Set uniform rotation independently of morph progress; no animation/audio/video changes.
function syncAngles(){
  restoreSharedOrientation();
  const viewer=k();
  if(!viewer||typeof viewer.set!=='function')return false;
  try{
    viewer.set('image.splats.fx_logox',Number(offX.value));
    viewer.set('image.splats.fx_logoy',Number(offY.value));
    viewer.set('image.splats.fx_logoz',Number(heightSlider.value));
    viewer.set('image.splats.fx_labelsize',morphCompactUniform());
    viewer.set('image.splats.fx_morphradius',Number(radiusControl.value));
    viewer.set('image.splats.fx_textscale',Number(scaleControl.value));
    viewer.set('image.splats.fx_rotx',Number(xSlider.value));
    viewer.set('image.splats.fx_roty',Number(ySlider.value));
    viewer.set('image.splats.fx_rotz',Number(zSlider.value));
    return true;
  }catch(_){return false}
}
function reset(){cancelAnimationFrame(frame);apply(0);}
$('logoV2Go').addEventListener('click',()=>{
  cancelAnimationFrame(frame);
 
  const total=4200;
  const up=0.50;
  const hold=0.012;
  const down=1.0-up-hold;
  const start=performance.now();
  function tick(now){
    let a=Math.min(1,(now-start)/total);
    let p;
    if(a<up){p=a/up;}
    else if(a<up+hold){p=1;}
    else{p=1-(a-up-hold)/down;}
    apply(p);
    if(a<1) frame=requestAnimationFrame(tick);
    else reset();
  }
  frame=requestAnimationFrame(tick);
});
// Reset button removed from UI; existing reset() kept for Escape and animation completion.
for(const [key,s] of [['X',xSlider],['Y',ySlider]]) s.addEventListener('input',()=>{
  $('logo'+key+'RotationValue').textContent=s.value+'°';
  apply(Number(slider.value)/100);
});
for(const [a,s] of [['X',offX],['Y',offY]])s.addEventListener('input',()=>{$('logo'+a+'OffsetValue').textContent=Number(s.value).toFixed(1);apply(Number(slider.value)/100)});
heightSlider.addEventListener('input',()=>{heightValue.textContent=Number(heightSlider.value).toFixed(1)+' ед.';apply(Number(slider.value)/100)});
zSlider.addEventListener('input',()=>{
  zValue.textContent=zSlider.value+'°';
  // Update shader orientation immediately; preserve the current morph percentage.
  apply(Number(slider.value)/100);
});
$('logoDepthFlip').addEventListener('change',()=>apply(Number(slider.value)/100));$('logoMirrorX').addEventListener('change',()=>apply(Number(slider.value)/100));
radiusControl.addEventListener('input',()=>{radiusValue.textContent=Number(radiusControl.value).toFixed(2)+'×';apply(Number(slider.value)/100)});
scaleControl.addEventListener('input',()=>{$('logoTextScaleValue').textContent=Number(scaleControl.value).toFixed(3)+'×';apply(Number(slider.value)/100)});
$('logoSplatSize').addEventListener('input',()=>{$('logoSplatSizeValue').textContent=Number($('logoSplatSize').value).toFixed(3)+'×';apply(Number(slider.value)/100)});
const _globalScaleHook=document.getElementById('scale'); if(_globalScaleHook){_globalScaleHook.addEventListener('input',()=>apply(Number(slider.value)/100));}
slider.addEventListener('input',()=>{cancelAnimationFrame(frame);apply(Number(slider.value)/100)});
window.addEventListener('keydown',e=>{if(e.key==='Escape')reset()});
let attempts=0;
const warmup=setInterval(()=>{if(syncAngles()||++attempts>50)clearInterval(warmup);},200);
})();

(()=>{
const panel=document.getElementById('logoMorphTest'), opener=document.getElementById('logoMorphShow'), close=document.getElementById('logoMorphCollapse');
if(!panel||!opener||!close)return;
close.addEventListener('click',()=>{panel.style.display='none';});
opener.addEventListener('click',()=>{
  panel.style.display=(panel.style.display==='none'?'block':'none');
});
if(window.innerWidth<650){panel.style.display='none';}
// In share viewer, do not reveal author's MORPH controls.
if(new URLSearchParams(location.search).get('ui')==='locked'){
  panel.style.display='none';
  opener.style.display='none';
}
})();

// v5.3: extra reaction to existing label click; original CSS neon/reveal is unchanged.
(()=>{
  const brand=document.getElementById('brand');
  const go=document.getElementById('logoV2Go');
  if(!brand||!go)return;
  brand.addEventListener('click',()=>{
    const params=new URLSearchParams(location.search);
    const visitor=params.get('ui')==='locked';
    const allowed=!visitor || params.get('morph')==='1';
    if(allowed) go.click();
  });
})();
