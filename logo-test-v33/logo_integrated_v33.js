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
// v31: Reader for regular Gaussian PLY and PlayCanvas/SuperSplat compressed PLY.
// Handles elements in header order: compressed PLY has CHUNK data before VERTEX.
async function readSourcePoints(url, conv) {
 const response=await fetch(url,{cache:'default'});
 if(!response.ok)throw Error('PLY HTTP '+response.status);
 const buf=await response.arrayBuffer();
 const headText=new TextDecoder('latin1').decode(buf.slice(0,Math.min(buf.byteLength,262144)));
 const m=/(?:^|\n)end_header\r?\n/.exec(headText);
 if(!m)throw Error('PLY end_header отсутствует');
 const offset=m.index+m[0].length;
 const hdr=headText.slice(0,offset);
 const fmt=/^format\s+(\S+)/m.exec(hdr)?.[1];
 const els=[];
 let elem=null;
 for (const raw of hdr.split(/\r?\n/)) {
   const line=raw.trim();
   if(line.startsWith('element ')){
     const z=line.split(/\s+/);
     elem={name:z[1],count:Number(z[2]),props:[]};els.push(elem);
   }else if(elem&&line.startsWith('property ')){
     const z=line.split(/\s+/);
     if(z[1]==='list')throw Error('PLY со списками пока не поддерживается');
     elem.props.push({type:z[1],name:z[2]});
   }
 }
 const vt=els.find(e=>e.name==='vertex');
 if(!vt||!(vt.count>0))throw Error('PLY без vertex');
 const info={char:[1,'getInt8'],uchar:[1,'getUint8'],int8:[1,'getInt8'],uint8:[1,'getUint8'],short:[2,'getInt16'],ushort:[2,'getUint16'],int16:[2,'getInt16'],uint16:[2,'getUint16'],int:[4,'getInt32'],uint:[4,'getUint32'],int32:[4,'getInt32'],uint32:[4,'getUint32'],uint:[4,'getUint32'],float:[4,'getFloat32'],float32:[4,'getFloat32'],double:[8,'getFloat64'],float64:[8,'getFloat64']};
 let start=offset;
 for (const e of els) {
   e.stride=0;e.off={};e.types={};
   for(const q of e.props){
     if(!info[q.type])throw Error('Неподдерживаемый тип PLY '+q.type);
     e.off[q.name]=e.stride;e.types[q.name]=q.type;e.stride+=info[q.type][0];
   }
   e.start=start;start+=e.count*e.stride;
 }
 const names=vt.props.map(q=>q.name);
 const regular=names.includes('x')&&names.includes('y')&&names.includes('z');
 const compressed=names.includes('packed_position');
 if(!regular&&!compressed)throw Error('Нет ни x/y/z, ни packed_position: '+names.slice(0,9).join(', '));
 const out=new Float32Array(20000*3);
 if(fmt==='ascii'){
   if(compressed)throw Error('ASCII packed PLY не поддерживается');
   const rows=new TextDecoder().decode(buf.slice(offset)).trimStart().split(/\r?\n/);
   if(rows.length<vt.count)throw Error('PLY ASCII обрезан');
   const idx=names.map(x=>x);
   const ix=names.indexOf('x'),iy=names.indexOf('y'),iz=names.indexOf('z');
   for(let i=0;i<20000;i++){
     const row=Math.min(vt.count-1,Math.floor((i+.5)*vt.count/20000));
     const nums=rows[row].trim().split(/\s+/);
     const p=conv(null,0,0,0,Number(nums[ix]),Number(nums[iy]),Number(nums[iz]));
     out.set([p.x,p.y,p.z],i*3);
   }
 }else if(fmt==='binary_little_endian'){
   if(start>buf.byteLength)throw Error('PLY бинарные данные обрезаны');
   const view=new DataView(buf);
   const get=(e,row,name)=>{
     const typ=e.types[name];if(!typ)throw Error('PLY property '+name+' отсутствует');
     const [bytes,fn]=info[typ];
     return view[fn](e.start+row*e.stride+e.off[name],true);
   };
   const chunk=els.find(e=>e.name==='chunk');
   if(compressed&&(!chunk||!chunk.count))throw Error('Сжатый PLY: нет element chunk');
   if(compressed){
     for(const k of ['min_x','min_y','min_z','max_x','max_y','max_z']){
       if(!chunk.types[k])throw Error('Сжатый PLY: chunk без '+k);
     }
   }
   for(let i=0;i<20000;i++){
     const row=Math.min(vt.count-1,Math.floor((i+.5)*vt.count/20000));
     let x,y,z;
     if(regular){
       x=get(vt,row,'x');y=get(vt,row,'y');z=get(vt,row,'z');
     }else{
       const c=Math.min(chunk.count-1,Math.floor(row/256));
       const packed=get(vt,row,'packed_position')>>>0;
       const fx=(packed>>>21)/2047.0;
       const fy=((packed>>>11)&1023)/1023.0;
       const fz=(packed&2047)/2047.0;
       x=get(chunk,c,'min_x')+(get(chunk,c,'max_x')-get(chunk,c,'min_x'))*fx;
       y=get(chunk,c,'min_y')+(get(chunk,c,'max_y')-get(chunk,c,'min_y'))*fy;
       z=get(chunk,c,'min_z')+(get(chunk,c,'max_z')-get(chunk,c,'min_z'))*fz;
     }
     if(!Number.isFinite(x+y+z))throw Error('PLY XYZ повреждены: vertex '+row);
     const pp=conv(null,0,0,0,x,y,z);
     out[i*3]=pp.x;out[i*3+1]=pp.y;out[i*3+2]=pp.z;
   }
 }else throw Error('PLY format '+fmt+' пока не поддерживается');
 return out;
}
function modelUrl(){
 const field=$('xyzModelInput');
 const val=field?.value?.trim()||new URLSearchParams(location.search).get('model')||'SOY2.ply';
 if(/^https?:\/\//i.test(val))return val;
 return (typeof xyzResolvePLY==='function' && xyzResolvePLY(val)) || 'https://raw.githubusercontent.com/3XyzMedia/3d-models/main/model/'+val.replace(/^model\//i,'');
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
  window.xyz29ModelReady=true;lastModelUrl=url;mark();say('20K координат из модели загружены');draw(Number($('logoV2Slider')?.value||0)/100);return true;
 })().catch(e=>{window.xyz29ModelReady=false; modelPromise=null; mark();say('MODEL недоступен: '+e.message);return false});
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
     float ease(float x){ x=clamp(x,0.0,1.0); return x*x*(3.0-2.0*x); }
     void main(){
       vColor=aColor;
       float p=clamp(uProgress,0.0,1.0);
       vec3 r=vec3(hash3(position.xyz+vec3(17.1)),
                   hash3(position.yzx+vec3(29.8)),
                   hash3(position.zxy+vec3(43.2)));
       vec3 dir=normalize(r-0.5+vec3(0.0001));
       vec3 path;
       if(uModel>0.5){
         // MODEL mode: actual model points first loosen into a compact turbulent cloud,
         // then condense into the label. Keep the cloud local - no giant 'Jupiter' scale.
         float t=ease((p-0.08)/0.82);
         vec3 flow=position-aStart;
         vec3 tangent=normalize(flow+vec3(0.0001));
         vec3 swirl=normalize(cross(tangent,dir)+vec3(0.0001));
         float cloud=sin(3.14159265*t);
         float amp=(7.0+18.0*r.x)*cloud;
         path=mix(aStart,position,t) + dir*amp + swirl*(amp*0.28);
       }else{
         // ETHER mode: keep dust tighter and let it become visible around 2/3 of the forward phase.
         float t=ease((p-0.58)/0.34);
         float settle=1.0-t;
         float spread=(2.0+12.0*r.x)*settle*settle;
         vec3 swirl=vec3(r.y-0.5,r.z-0.5,r.x-0.5)*(4.0*settle*(0.45+0.55*r.z));
         path=position + dir*spread + swirl;
       }
       vec4 mv=modelViewMatrix*vec4(path,1.0);
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
  t.scene.add(o);ready=true;window.xyz29TargetReady=true;mark();say('подключён · 20 000 точек LABEL');if(source.value==='model')prepareModel();draw(Number($('logoV2Slider')?.value||0)/100);return true;
 })().catch(e=>{say(String(e.message||e)+' — 20K режимы недоступны');mark();return false});
 return initPromise;
}
function draw(v){mark();if(!ready||!o)return; if(source.value==='model'&&!window.xyz29ModelReady){o.visible=false;prepareModel();return;}
 const p=Math.max(0,Math.min(1,v));
 const isModel=source.value==='model';
 const textProgress=isModel ? Math.max(0,Math.min(1,(p-0.12)/0.76)) : Math.max(0,Math.min(1,(p-0.58)/0.34));
 const alpha=isModel ? Math.max(0,Math.min(1,(p-0.14)/0.18)) : Math.max(0,Math.min(1,(p-0.60)/0.16));
 o.visible=(textProgress>.001 || alpha>.001);
 material.uniforms.uProgress.value=textProgress;
 material.uniforms.uModel.value=isModel?1:0;
 material.uniforms.uAlpha.value=Math.min(1,alpha*1.25)*0.98;
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