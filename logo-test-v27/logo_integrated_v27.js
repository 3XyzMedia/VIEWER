/* 3XyzMedia v24 · optional integrated rendering, v23 preserved. */
(()=>{
'use strict';
const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>0&&innerWidth<900);
if(mobile)return;
const $=id=>document.getElementById(id), status=$('xyz24denseStatus'), mode=$('xyz25mode'), point=$('xyz25point'), indicator=$('xyz25indicator');
const p=new URLSearchParams(location.search);if(p.get('morphmode')==='base')mode.value='base';if(p.has('morphpoint')){const n=Number(p.get('morphpoint'));if(Number.isFinite(n))point.value=String(Math.max(.05,Math.min(3,n)));}
function mark(){if(indicator)indicator.textContent=mode.value==='base'?'BASE ACTIVE':(ready?'20K ACTIVE':'20K UNAVAILABLE · BASE');$('xyz25pointValue').textContent=Number(point.value).toFixed(2)+'×';}
const say=s=>{if(status)status.textContent='20K integrated: '+s};
let o=null, g=null, material=null, ready=false, active=false, want=0, initPromise=null, kr=null;
const pluginPath='../plugins/threejs_krpanoplugin.js';
function k(){return window.xyzMorphKrpano || window.krpano || document.getElementById('pano')?.krpano}
function tjs(){return window.threejs || (kr && kr.get && kr.get('plugin[xyz24three]')) || null}
async function checkPlugin(){
 try{const r=await fetch(pluginPath,{method:'GET',cache:'no-cache'}); if(!r.ok)throw Error('HTTP '+r.status);return true;}
 catch(e){say('плагин не найден по пути /VIEWER/plugins/threejs_krpanoplugin.js; действует v23');return false;}
}
function loadPlugin(){
 kr=k();if(!kr || typeof kr.call!=='function')throw Error('krpano не готов');
 // Dynamically attach only after plugin was confirmed to exist.
 kr.call('addplugin(xyz24three);');
 kr.set('plugin[xyz24three].api','threejs');
 kr.set('plugin[xyz24three].integratedrendering','true');
 kr.set('plugin[xyz24three].useembeddedthreejs','true');
 kr.set('plugin[xyz24three].keep','true');
 kr.set('plugin[xyz24three].url',pluginPath);
}
async function waitThree(){
 for(let n=0;n<100;n++){
  const t=tjs();if(t&&t.THREE&&t.scene&&typeof t.krpano_to_threejs_position==='function')return t;
  await new Promise(r=>setTimeout(r,100));
 }
 throw Error('ThreeJS plugin не запустился; действует v23');
}
async function install(){
 if(ready)return;
 if(initPromise)return initPromise;
 initPromise=(async()=>{
  if(!await checkPlugin())return false;
  say('плагин найден; инициализация…');loadPlugin();
  const t=await waitThree();
  const response=await fetch('LABEL_20000_v24.bin');if(!response.ok)throw Error('LABEL_20000_v24.bin HTTP '+response.status);
  const raw=await response.arrayBuffer();if(raw.byteLength!==20000*24)throw Error('данные LABEL повреждены');
  const data=new Float32Array(raw),THREE=t.THREE;
  const pos=new Float32Array(20000*3),col=new Float32Array(20000*3);
  for(let i=0;i<20000;i++){
    let n=i*6, p=t.krpano_to_threejs_position(null,0,0,0,data[n]*100,-data[n+2]*150,-data[n+1]*150);
    const j=i*3;pos[j]=p.x;pos[j+1]=p.y;pos[j+2]=p.z;
    col[j]=data[n+3];col[j+1]=data[n+4];col[j+2]=data[n+5];
  }
  g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aColor',new THREE.BufferAttribute(col,3));
  // v27: Real-time GPU vertex displacement. All 20K vertices disperse and reassemble,
  // synchronized to the ORIGINAL v23 MORPH progress slider (no second clock/canvas).
  material=new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,
   uniforms:{uAlpha:{value:0},uSize:{value:2.4},uProgress:{value:0}},
   vertexShader:`attribute vec3 aColor;
     varying vec3 vColor;
     uniform float uSize, uProgress;
     float hash3(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
     void main(){
       vColor=aColor;
       float p=clamp(uProgress,0.0,1.0);
       float t=p*p*(3.0-2.0*p);
       vec3 r=vec3(hash3(position.xyz+vec3(17.1)),
                   hash3(position.yzx+vec3(29.8)),
                   hash3(position.zxy+vec3(43.2)));
       // Separate random directions: text is genuinely displaced in 3D, not simply faded.
       vec3 dir=normalize(r-0.5+vec3(0.0001));
       // Independent per-vertex travel lengths create a volumetric molecular cloud.
       float spread=(1.0-t)*(28.0+90.0*r.x);
       vec3 dispersed=position+dir*spread;
       vec4 mv=modelViewMatrix*vec4(dispersed,1.0);
       gl_Position=projectionMatrix*mv;
       gl_PointSize=clamp(uSize*(220.0/max(5.0,-mv.z)),0.75,28.0);
     }`,
   fragmentShader:`precision mediump float;
     varying vec3 vColor;uniform float uAlpha;
     void main(){
       vec2 d=gl_PointCoord-vec2(.5);
       float r=dot(d,d);
       float a=exp(-r*18.0)*uAlpha;
       gl_FragColor=vec4(vColor,a);
     }` });
  o=new THREE.Points(g,material);o.visible=false;o.frustumCulled=false;o.renderOrder=999;
  t.scene.add(o);ready=true;mark();say('подключён · 20 000 точек LABEL');return true;
 })().catch(e=>{say(String(e.message||e)+' — исходный v23 работает');mark();return false});
 return initPromise;
}
function draw(v){mark();if(!ready||!o)return; if(mode.value!=='dense'){o.visible=false;return;}
 const alpha=Math.max(0,Math.min(1,v));o.visible=alpha>.001;material.uniforms.uProgress.value=alpha;
 material.uniforms.uAlpha.value=Math.min(1,alpha*3.5)*.90;
 const sz=Number($('logoSplatSize')?.value)||.18;
 material.uniforms.uSize.value=Math.max(.05,sz*11*Number(point.value));
 o.scale.setScalar(Math.max(.1,Number($('logoTextScale')?.value)||1));
 const rot=(a)=>(Number($(a)?.value)||0)*Math.PI/180;
 o.rotation.order='XYZ';o.rotation.set(rot('logoXRotation'),rot('logoYRotation'),rot('logoZRotation'));
 o.position.set((Number($('logoXOffset')?.value)||0),(Number($('logoZOffset')?.value)||0),-(Number($('logoYOffset')?.value)||0));
}
// NEVER intercept the existing live handlers. Observe them after they run.
const slider=$('logoV2Slider'),go=$('logoV2Go');
mode.addEventListener('change',()=>draw(Number(slider?.value||0)/100));point.addEventListener('input',()=>draw(Number(slider?.value||0)/100));mark();
if(slider)slider.addEventListener('input',()=>{want=Number(slider.value)/100;draw(want)},false);
for(const id of ['logoTextScale','logoSplatSize','logoXRotation','logoYRotation','logoZRotation','logoXOffset','logoYOffset','logoZOffset'])
 $(id)?.addEventListener('input',()=>draw(Number(slider?.value||0)/100));
// Legacy v23 animation sets slider.value programmatically without firing input.
// Observe progress every frame; do not change v23 or animate a second timeline.
let last=-1;function sync(){const v=Number(slider?.value||0)/100;if(v!==last){last=v;draw(v)}requestAnimationFrame(sync)}
if(go)go.addEventListener('click',()=>{if(!ready)install()},false);
window.addEventListener('pagehide',()=>{if(o){tjs()?.scene?.remove(o);g?.dispose();material?.dispose()}});
requestAnimationFrame(sync);
setTimeout(()=>install(),1400);
})();