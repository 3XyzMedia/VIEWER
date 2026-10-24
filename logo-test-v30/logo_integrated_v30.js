/* 3XyzMedia v24 · optional integrated rendering, v23 preserved. */
(()=>{
'use strict';
const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>0&&innerWidth<900);
if(mobile)return;
const $=id=>document.getElementById(id), status=$('xyz28denseStatus'), source=$('xyz28source'), point=$('xyz28point'), indicator=$('xyz28indicator');
const p=new URLSearchParams(location.search);
window.xyz29TargetReady=false;window.xyz29ModelReady=false;
if(source){const requested=(p.get('morphsource')||'ether').toLowerCase();source.value=(requested==='model'?'model':'ether');}
if(p.has('morphpoint')){const n=Number(p.get('morphpoint'));if(Number.isFinite(n))point.value=String(Math.max(.05,Math.min(3,n)));}
function mark(){
 if(indicator)indicator.textContent=source.value==='model'?(window.xyz29ModelReady?'MODEL 20K ACTIVE':'MODEL: ЗАГРУЗКА PLY'):(ready?'ETHER 20K ACTIVE':'ETHER 20K UNAVAILABLE');
 $('xyz28pointValue').textContent=Number(point.value).toFixed(2)+'×';
}
const say=s=>{if(status)status.textContent='Unified MORPH: '+s};
let o=null, g=null, material=null, ready=false, active=false, want=0, initPromise=null, kr=null;
let transformPoint=null, modelPromise=null, lastModelUrl=null;
const pluginPath='../plugins/threejs_krpanoplugin.js';
function k(){return window.xyzMorphKrpano || window.krpano || document.getElementById('pano')?.krpano}
function tjs(){return window.threejs || (kr && kr.get && kr.get('plugin[xyz24three]')) || null}
async function checkPlugin(){
 try{const r=await fetch(pluginPath,{method:'GET',cache:'no-cache'}); if(!r.ok)throw Error('HTTP '+r.status);return true;}
 catch(e){say('плагин не найден по пути /VIEWER/plugins/threejs_krpanoplugin.js; режим ЭФИР недоступен');return false;}
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
 throw Error('ThreeJS plugin не запустился; режим ЭФИР недоступен');
}
// Supports uncompressed binary little endian / ASCII PLY with vertex XYZ.
// Model points come from the actual selected source model (not the LABEL target).
async function readSourcePoints(url, conv) {
 const response=await fetch(url,{cache:'default'});
 if(!response.ok)throw Error('PLY HTTP '+response.status);
 const buf=await response.arrayBuffer();
 const limit=Math.min(buf.byteLength,2*1024*1024);
 const ascii=new TextDecoder('latin1').decode(buf.slice(0,limit));
 const match=/(?:^|\n)end_header\r?\n/.exec(ascii);
 if(!match)throw Error('Не найден PLY end_header');
 const offset=match.index+match[0].length;
 const hdr=ascii.slice(0,offset);
 const fmt=/format\s+(\S+)/.exec(hdr)?.[1];
 const count=Number(/element\s+vertex\s+(\d+)/.exec(hdr)?.[1]);
 if(!(count>0))throw Error('PLY не содержит вершин');
 const lines=hdr.split(/\r?\n/);let inVertex=false,props=[];
 for(const line of lines){
  if(line.startsWith('element ')){inVertex=line.startsWith('element vertex ');continue;}
  if(inVertex&&line.startsWith('property ')){
   const parts=line.split(/\s+/);if(parts[1]==='list')throw Error('Списки в vertex PLY не поддерживаются');
   props.push({type:parts[1],name:parts[2]});
  }
 }
 const names=props.map(q=>q.name);const x=names.indexOf('x'),y=names.indexOf('y'),z=names.indexOf('z');
 if(Math.min(x,y,z)<0)throw Error('В исходном PLY нет координат x/y/z. Для MODEL нужен стандартный PLY с XYZ; формат этого файла пока не поддерживается');
 const result=new Float32Array(20000*3);
 if(fmt==='binary_little_endian'){
  const info={char:[1,'getInt8'],uchar:[1,'getUint8'],int8:[1,'getInt8'],uint8:[1,'getUint8'],short:[2,'getInt16'],ushort:[2,'getUint16'],int16:[2,'getInt16'],uint16:[2,'getUint16'],int:[4,'getInt32'],uint:[4,'getUint32'],int32:[4,'getInt32'],uint32:[4,'getUint32'],float:[4,'getFloat32'],float32:[4,'getFloat32'],double:[8,'getFloat64'],float64:[8,'getFloat64']};
  let stride=0;const offs=[];for(const q of props){if(!info[q.type])throw Error('PLY type '+q.type);offs.push(stride);stride+=info[q.type][0];}
  if(offset+stride*count>buf.byteLength)throw Error('PLY данные обрезаны');
  const view=new DataView(buf);let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  // Stratified sampling over the ENTIRE PLY, so points don't cluster at its beginning.
  for(let i=0;i<20000;i++){
   const row=Math.min(count-1,Math.floor((i+.5)*count/20000)),base=offset+row*stride;
   const vals=[x,y,z].map(k=>view[info[props[k].type][1]](base+offs[k],true));
   const j=i*3;for(let a=0;a<3;a++)result[j+a]=vals[a];
  }
 } else if(fmt==='ascii'){
  const txt=new TextDecoder().decode(buf.slice(offset));const rows=txt.trimStart().split(/\r?\n/);
  if(rows.length<count)throw Error('ASCII PLY обрезан');
  for(let i=0;i<20000;i++){
   const row=Math.min(count-1,Math.floor((i+.5)*count/20000));const nums=rows[row].trim().split(/\s+/);let j=i*3;
   result[j]=Number(nums[x]);result[j+1]=Number(nums[y]);result[j+2]=Number(nums[z]);
  }
 } else throw Error('Формат PLY '+fmt+' не поддерживается');
 const out=new Float32Array(20000*3);
 for(let i=0;i<20000;i++){
  const j=i*3,px=result[j],py=result[j+1],pz=result[j+2];
  if(!Number.isFinite(px+py+pz))throw Error('Некорректные координаты PLY');
  const pt=conv(null,0,0,0,px,py,pz);
  out[j]=pt.x;out[j+1]=pt.y;out[j+2]=pt.z;
 }
 return out;
}
function modelUrl(){
 const field=$('xyzModelInput');const val=field?.value?.trim()||'SOY2.ply';
 if(/^https?:\/\//i.test(val))return val;
 return 'https://raw.githubusercontent.com/3XyzMedia/3d-models/main/model/'+encodeURIComponent(val);
}
async function prepareModel(){
 if(window.xyz29ModelReady && lastModelUrl===modelUrl())return true;
 if(window.xyz29ModelReady && lastModelUrl!==modelUrl()) {window.xyz29ModelReady=false; modelPromise=null;}
 if(modelPromise)return modelPromise;
 if(!ready)return false;
 modelPromise=(async()=>{
  const url=modelUrl();say('загружаю модельные координаты из '+url.split('/').pop()+'…');
  const positions=await readSourcePoints(url,transformPoint);
  g.setAttribute('aStart',new (tjs().THREE).BufferAttribute(positions,3));
  window.xyz29ModelReady=true;lastModelUrl=url;mark();say('20K координат из модели загружены');return true;
 })().catch(e=>{window.xyz29ModelReady=false; modelPromise=null; say('MODEL недоступен: '+e.message);return false});
 return modelPromise;
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
  transformPoint=t.krpano_to_threejs_position;
  const pos=new Float32Array(20000*3),col=new Float32Array(20000*3);
  for(let i=0;i<20000;i++){
    let n=i*6, p=t.krpano_to_threejs_position(null,0,0,0,data[n]*100,-data[n+2]*150,-data[n+1]*150);
    const j=i*3;pos[j]=p.x;pos[j+1]=p.y;pos[j+2]=p.z;
    col[j]=data[n+3];col[j+1]=data[n+4];col[j+2]=data[n+5];
  }
  g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('aColor',new THREE.BufferAttribute(col,3));g.setAttribute('aStart',new THREE.BufferAttribute(pos.slice(),3));
  // v27: Real-time GPU vertex displacement. All 20K vertices disperse and reassemble,
  // synchronized to the ORIGINAL v23 MORPH progress slider (no second clock/canvas).
  material=new THREE.ShaderMaterial({
   transparent:true,depthWrite:false,
   uniforms:{uAlpha:{value:0},uSize:{value:2.4},uProgress:{value:0},uModel:{value:0}},
   vertexShader:`attribute vec3 aColor; attribute vec3 aStart;
     varying vec3 vColor;
     uniform float uSize, uProgress, uModel;
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
       vec3 dispersed=mix(position+dir*spread, mix(aStart,position,t),uModel);
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
  t.scene.add(o);ready=true;window.xyz29TargetReady=true;mark();say('подключён · 20 000 точек LABEL');if(source.value==='model')prepareModel();return true;
 })().catch(e=>{say(String(e.message||e)+' — 20K режимы недоступны');mark();return false});
 return initPromise;
}
function draw(v){mark();if(!ready||!o)return; if(source.value==='model'&&!window.xyz29ModelReady){o.visible=false;prepareModel();return;}
 const alpha=Math.max(0,Math.min(1,v));o.visible=alpha>.001;material.uniforms.uProgress.value=alpha;material.uniforms.uModel.value=source.value==='model'?1:0;
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
source.addEventListener('change',()=>{if(source.value==='model')prepareModel();draw(Number(slider?.value||0)/100)});point.addEventListener('input',()=>draw(Number(slider?.value||0)/100));mark();
if(slider)slider.addEventListener('input',()=>{want=Number(slider.value)/100;draw(want)},false);
for(const id of ['logoTextScale','logoSplatSize','logoXRotation','logoYRotation','logoZRotation','logoXOffset','logoYOffset','logoZOffset'])
 $(id)?.addEventListener('input',()=>draw(Number(slider?.value||0)/100));
// Legacy v23 animation sets slider.value programmatically without firing input.
// Observe progress every frame; do not change v23 or animate a second timeline.
let last=-1;function sync(){const v=Number(slider?.value||0)/100;if(v!==last){last=v;draw(v)}requestAnimationFrame(sync)}
if(go)go.addEventListener('click',()=>{if(!ready)install();else if(source.value==='model')prepareModel()},false);
window.addEventListener('pagehide',()=>{if(o){tjs()?.scene?.remove(o);g?.dispose();material?.dispose()}});
requestAnimationFrame(sync);
setTimeout(()=>install(),1400);
})();