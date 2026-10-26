
(()=>{'use strict';
const MOBILE=(navigator.maxTouchPoints>0 && window.innerWidth<900);
const BASE_N=20000, N=20000;
const $=id=>document.getElementById(id), canvas=$('gpu53canvas'), note=$('gpu53note');
const params=new URLSearchParams(location.search), locked=params.get('ui')==='locked';
const btn=$('gpuMorphLaunch48'), playBtn=$('gpu20kPlay'), slider=$('gpu20kSlider'), statusEl=$('gpu20kStatus'), numEl=$('gpu20kNum'), colorSel=$('gpu20kColorMode'), colorVal=$('gpu20kColorValue');
const pano=$('pano'), fire=$('fireOverlay'); const cfg=id=>Number($('gpu57'+id)?.value||0);
const allowed=!locked||params.get('gpu20k')==='1';
function toast(s){if(note){note.textContent=s;note.classList.add('visible');}}
function hideToast(){if(note)note.classList.remove('visible');}
if(colorSel&&colorVal){colorSel.value=(params.get('gpucolor')==='red'?'red':'blender'); colorVal.textContent=colorSel.value==='red'?'Красный':'RGB Blender PLY'; colorSel.addEventListener('change',()=>{colorVal.textContent=colorSel.value==='red'?'Красный':'RGB Blender PLY'; if(gl&&source&&target){drawFrame(currentP);}})}
if(MOBILE){ if(btn)btn.style.display='none'; if(playBtn)playBtn.style.display='none'; if(statusEl)statusEl.textContent='MORPH 20K отключён на смартфоне, чтобы не вылетал Viewer'; }
if(locked && !allowed){ if(btn)btn.style.display='none'; if(playBtn)playBtn.style.display='none'; }
let gl=null, prog=null, vao=null, buffers=[], uniforms={}, source=null, target=null, sourceColor=null, labelColor=null, seed=null, rawLabel=null;
let active=false, loadingPromise=null, ready=false, raf=0, stamp=0, currentP=0, cachedKey='', cached=null;
function setPanoOpacity(v){v=Math.max(0,Math.min(1,v)); if(pano)pano.style.opacity=String(v); if(fire)fire.style.opacity=String(v);} 
function shader(t,s){const sh=gl.createShader(t); gl.shaderSource(sh,s); gl.compileShader(sh); if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(sh)); return sh;}
const vert=`#version 300 es
precision highp float;
layout(location=0) in vec3 aSource; layout(location=1) in vec3 aTarget; layout(location=2) in vec3 aSeed; layout(location=3) in vec3 aSourceColor; layout(location=4) in vec3 aLabelColor;
uniform float uProgress,uSpread,uSize,uAspect,uYaw,uPitch,uDistance,uRedMode;
out vec3 vColor; out float vAlpha;
float ease(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);} 
mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);} 
mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);} 
void main(){
  float p=clamp(uProgress,0.,1.);
  float t;
  if (p < 0.40) t = ease(p / 0.40);
  else if (p > 0.60) t = ease((1.0 - p) / 0.40);
  else t = 1.0;
  float burstIn = smoothstep(0.02, 0.20, p) * (1.0 - smoothstep(0.34, 0.42, p));
  float burstOut = smoothstep(0.58, 0.66, p) * (1.0 - smoothstep(0.82, 0.98, p));
  float burst = max(burstIn, burstOut);
  vec3 dir=normalize(aSeed*2.0-1.0+vec3(.001));
  vec3 swirl=normalize(cross(dir,vec3(.31,.78,.54))+vec3(.01));
  vec3 pos=mix(aSource,aTarget,t)+uSpread*burst*(dir*(0.55+0.85*aSeed.x)+swirl*0.42*sin(8.0*t+11.0*aSeed.y));
  vec3 view=ry(uYaw)*rx(uPitch)*pos-vec3(0.,0.,uDistance);
  float f=2.1445069;
  gl_Position=vec4(view.x*f/uAspect, view.y*f, -view.z*1.0002-0.20002, -view.z);
  gl_PointSize=clamp(uSize*9.0/max(1.0,-view.z), 1.0, 14.0);
  vec3 targetColor = mix(aLabelColor, vec3(.98,.13,.20), uRedMode);
  vColor = mix(aSourceColor, targetColor, t);
  vAlpha = smoothstep(0.03,0.12,p) * (1.0-smoothstep(0.88,0.97,p));
}`;
const frag=`#version 300 es
precision mediump float;
in vec3 vColor; in float vAlpha; out vec4 outColor;
void main(){ vec2 q=gl_PointCoord*2.0-1.0; float r=dot(q,q); float a=(1.0-smoothstep(.2,1.0,r))*vAlpha; if(a<.015) discard; outColor=vec4(vColor,a); }`;
function initGL(){ if(gl) return; gl=canvas.getContext('webgl2',{alpha:true,antialias:false,powerPreference:'high-performance',premultipliedAlpha:false}); if(!gl) throw Error('WebGL2 недоступен'); prog=gl.createProgram(); gl.attachShader(prog,shader(gl.VERTEX_SHADER,vert)); gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,frag)); gl.linkProgram(prog); if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(prog)); for(const n of ['uProgress','uSpread','uSize','uAspect','uYaw','uPitch','uDistance','uRedMode']) uniforms[n]=gl.getUniformLocation(prog,n); vao=gl.createVertexArray(); gl.bindVertexArray(vao); for(let i=0;i<5;i++){const b=gl.createBuffer(); buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,N*3*4,gl.DYNAMIC_DRAW); gl.vertexAttribPointer(i,3,gl.FLOAT,false,0,0); gl.enableVertexAttribArray(i);} gl.bindVertexArray(null); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.disable(gl.DEPTH_TEST); }
function bounds(arr){let lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9]; for(let i=0;i<arr.length;i+=3){for(let d=0;d<3;d++){const v=arr[i+d]; if(v<lo[d])lo[d]=v; if(v>hi[d])hi[d]=v;}} return {mid:lo.map((x,d)=>(x+hi[d])/2),span:Math.max(1e-6,hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2])}; }
function normalize(a,scale){const b=bounds(a); for(let i=0;i<a.length;i+=3) for(let d=0;d<3;d++) a[i+d]=(a[i+d]-b.mid[d])*scale/b.span; return a; }
function modelURL(){ const input=$('xyzModelInput')?.value?.trim() || params.get('model') || 'SOY2.ply'; if(/^https:\/\//i.test(input)) return input; return 'https://raw.githubusercontent.com/3XyzMedia/3d-models/main/model/'+input.replace(/^model\//i,''); }
function fillFromModel(raw, cols){ source=new Float32Array(N*3); sourceColor=new Float32Array(N*3); const count=Math.floor(raw.length/3); for(let i=0;i<N;i++){ const j=i%count, o=3*i, s=3*j; source[o]=raw[s]; source[o+1]=raw[s+1]; source[o+2]=raw[s+2]; sourceColor[o]=cols[s]||.9; sourceColor[o+1]=cols[s+1]||.94; sourceColor[o+2]=cols[s+2]||1.0; } }
async function prepareModel(){ const url=modelURL(); if(url===cachedKey&&cached){ fillFromModel(cached.raw,cached.cols); return; } toast('MORPH 20K · читаю твою PLY...'); const res=await fetch(url); if(!res.ok) throw Error('модель HTTP '+res.status); const buf=await res.arrayBuffer(); const data=parsePLY(buf); cachedKey=url; cached=data; fillFromModel(data.raw,data.cols); }
function parsePLY(buf){ const bytes=new Uint8Array(buf), head=new TextDecoder('ascii').decode(bytes.subarray(0,Math.min(bytes.length,131072))); const m=/end_header\r?\n/.exec(head); if(!m) throw Error('PLY без end_header'); const lines=head.slice(0,m.index).split(/\r?\n/); const binary=lines.some(x=>x.includes('format binary_little_endian')); if(!binary) throw Error('нужен binary PLY'); const elements=[]; let el=null; for(const l of lines){const a=l.trim().split(/\s+/); if(a[0]==='element'){el={name:a[1],count:Number(a[2]),props:[]}; elements.push(el);} else if(a[0]==='property'&&el&&a[1]!=='list'){el.props.push({type:a[1],name:a[2]});}}
 const sz={char:1,uchar:1,int8:1,uint8:1,short:2,ushort:2,int16:2,uint16:2,int:4,uint:4,int32:4,uint32:4,float:4,float32:4,double:8,float64:8}; let off=m.index+m[0].length; for(const e of elements){let stride=0; for(const p of e.props){p.off=stride; stride+=sz[p.type]||0;} e.offset=off; e.stride=stride; off+=stride*e.count; } const vt=elements.find(e=>e.name==='vertex'); const ch=elements.find(e=>e.name==='chunk'); if(!vt) throw Error('нет vertex'); const names=Object.fromEntries(vt.props.map(p=>[p.name,p])); const dv=new DataView(buf); function rd(e,i,n){const p=typeof n==='string'?Object.fromEntries(e.props.map(x=>[x.name,x]))[n]:n; const o=e.offset+i*e.stride+p.off; switch(p.type){case 'uchar':case 'uint8': return dv.getUint8(o); case 'char':case 'int8': return dv.getInt8(o); case 'ushort':case 'uint16': return dv.getUint16(o,true); case 'short':case 'int16': return dv.getInt16(o,true); case 'uint':case 'uint32': return dv.getUint32(o,true); case 'int':case 'int32': return dv.getInt32(o,true); case 'double':case 'float64': return dv.getFloat64(o,true); default: return dv.getFloat32(o,true);} }
 const baseCount=Math.min(BASE_N, vt.count); const raw=new Float32Array(baseCount*3), cols=new Float32Array(baseCount*3);
 for(let i=0;i<baseCount;i++){ const j=Math.min(vt.count-1,Math.floor((i+0.5)*vt.count/baseCount)), o=3*i; if(names.x&&names.y&&names.z){ raw[o]=rd(vt,j,names.x); raw[o+1]=rd(vt,j,names.y); raw[o+2]=rd(vt,j,names.z);} else if(names.packed_position && ch){const pk=rd(vt,j,names.packed_position)>>>0, k=Math.min(ch.count-1,Math.floor(j/256)); for(let d=0;d<3;d++){ const axis=['x','y','z'][d], lo=rd(ch,k,'min_'+axis), hi=rd(ch,k,'max_'+axis), t=d===0?(pk>>>21)/2047:d===1?((pk>>>11)&1023)/1023:(pk&2047)/2047; raw[o+d]=lo+(hi-lo)*t; }} else throw Error('XYZ не распознаны'); if(names.red&&names.green&&names.blue){ cols[o]=rd(vt,j,names.red)/255.0; cols[o+1]=rd(vt,j,names.green)/255.0; cols[o+2]=rd(vt,j,names.blue)/255.0; } else if(names.f_dc_0&&names.f_dc_1&&names.f_dc_2){ cols[o]=Math.max(0.0,Math.min(1.0,0.5+0.28209479*rd(vt,j,names.f_dc_0))); cols[o+1]=Math.max(0.0,Math.min(1.0,0.5+0.28209479*rd(vt,j,names.f_dc_1))); cols[o+2]=Math.max(0.0,Math.min(1.0,0.5+0.28209479*rd(vt,j,names.f_dc_2))); } else { cols[o]=.9; cols[o+1]=.94; cols[o+2]=1.0; } }
 normalize(raw,5.1); return {raw,cols}; }
function rotate(x,y,z,rx,ry,rz){ const cx=Math.cos(rx),sx=Math.sin(rx), cy=Math.cos(ry),sy=Math.sin(ry), cz=Math.cos(rz),sz=Math.sin(rz); let Y=y*cx-z*sx, Z=y*sx+z*cx, X=x; let X2=X*cy+Z*sy, Z2=-X*sy+Z*cy; let X3=X2*cz-Y*sz, Y3=X2*sz+Y*cz; return [X3,Y3,Z2]; }
async function prepareLabel(){
 if(!rawLabel){ const res=await fetch('LABEL_RGB_20000.xyzrgb.bin'); if(!res.ok) throw Error('Blender RGB PLY HTTP '+res.status); const buf=await res.arrayBuffer(); if(buf.byteLength!==BASE_N*24) throw Error('Blender RGB PLY размер'); rawLabel=new Float32Array(buf); }
 const base=new Float32Array(BASE_N*3); labelColor=new Float32Array(N*3);
 for(let i=0;i<BASE_N;i++){ const s=i*6,d=i*3; base[d]=rawLabel[s]; base[d+1]=rawLabel[s+1]; base[d+2]=rawLabel[s+2]; labelColor[d]=rawLabel[s+3]; labelColor[d+1]=rawLabel[s+4]; labelColor[d+2]=rawLabel[s+5]; }
 normalize(base,5.1); target=new Float32Array(N*3);
 const rx=cfg('RotX')*Math.PI/180, ry=cfg('RotY')*Math.PI/180, rz=cfg('RotZ')*Math.PI/180, ts=cfg('Scale'), ox=cfg('OffX'), oy=cfg('OffY'), oz=cfg('OffZ');
 for(let i=0;i<N;i++){ const a=i*3; const v=rotate(base[a],base[a+1],base[a+2],rx,ry,rz); target[a]=v[0]*ts+ox; target[a+1]=v[1]*ts+oy; target[a+2]=v[2]*ts+oz; }
}
function rebuildSeed(){ seed=new Float32Array(N*3); for(let i=0;i<seed.length;i++) seed[i]=((Math.sin(i*12.9898+4.2)*43758.5453)%1+1)%1; }
function upload(){ gl.bindVertexArray(vao); [source,target,seed,sourceColor,labelColor].forEach((a,idx)=>{ gl.bindBuffer(gl.ARRAY_BUFFER,buffers[idx]); gl.bufferSubData(gl.ARRAY_BUFFER,0,a); }); gl.bindVertexArray(null); }
function camera(){ try{return window.xyzMorphCameraState?window.xyzMorphCameraState():null}catch(e){return null;} }
function setStatus(p){ if(numEl) numEl.textContent=(p*100).toFixed(1)+'%'; if(slider&&document.activeElement!==slider) slider.value=String((p*100).toFixed(1)); if(statusEl){ statusEl.textContent = p<.5 ? 'Сплаты модели → облако → Blender PLY RGB' : (p<=.6 ? 'Blender PLY RGB · пауза на тексте' : 'Blender PLY RGB → облако → сплаты модели'); } }
function drawFrame(p){ currentP=p; if(!gl||!source||!target) return; const dpr=Math.min(devicePixelRatio||1,1.5), w=Math.max(1,Math.floor(innerWidth*dpr)), h=Math.max(1,Math.floor(innerHeight*dpr)); if(canvas.width!==w||canvas.height!==h){ canvas.width=w; canvas.height=h; gl.viewport(0,0,w,h);} const cam=camera(), yaw=((cam&&cam.o?cam.o[0]:0)||0)*Math.PI/180, pitch=((cam&&cam.o?cam.o[1]:0)||0)*Math.PI/180; const size=cfg('Size'); const spread=cfg('Spread'); const vis=(x)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);}; const textHold = (p<0.40) ? vis(p/0.40) : (p>0.60 ? vis((1-p)/0.40) : 1); setPanoOpacity(1-textHold); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT); gl.useProgram(prog); gl.bindVertexArray(vao); gl.uniform1f(uniforms.uProgress,p); gl.uniform1f(uniforms.uSpread,spread); gl.uniform1f(uniforms.uSize,size); gl.uniform1f(uniforms.uAspect,w/h); gl.uniform1f(uniforms.uYaw,yaw); gl.uniform1f(uniforms.uPitch,pitch); gl.uniform1f(uniforms.uDistance,11.2); gl.uniform1f(uniforms.uRedMode,(colorSel?.value==='red')?1.0:0.0); gl.drawArrays(gl.POINTS,0,N); setStatus(p); }
function finish(){ active=false; cancelAnimationFrame(raf); canvas.classList.remove('active'); document.body.classList.remove('gpu20k-active'); setPanoOpacity(1); hideToast(); if(playBtn) playBtn.textContent='▶ 20K'; }
function animate(now){ if(!active) return; const move=Math.max(1000,cfg('Duration')*1000), hold=Math.max(0,cfg('Hold')*1000), half=move/2.0, elapsed=Math.max(0,now-stamp); let p; if(elapsed<half) p=.5*(elapsed/half); else if(elapsed<half+hold) p=.5; else p=.5+.5*Math.min(1.0,(elapsed-half-hold)/half); drawFrame(p); if(elapsed>=move+hold){ finish(); return; } raf=requestAnimationFrame(animate); }
async function ensureReady(){ if(MOBILE) throw Error('20K отключён на смартфоне'); if(ready) return; if(loadingPromise) return loadingPromise; loadingPromise=(async()=>{ initGL(); await prepareModel(); await prepareLabel(); rebuildSeed(); upload(); ready=true; })(); try{ await loadingPromise; } finally { loadingPromise=null; } }
async function play(){ try{ await ensureReady(); active=true; canvas.classList.add('active'); document.body.classList.add('gpu20k-active'); const move=Math.max(1000,cfg('Duration')*1000), hold=Math.max(0,cfg('Hold')*1000), half=move/2.0; let offset=0; if(currentP<=0.5) offset=(currentP/0.5)*half; else offset=half+hold+((currentP-0.5)/0.5)*half; stamp=performance.now()-offset; if(playBtn) playBtn.textContent='■ STOP'; cancelAnimationFrame(raf); raf=requestAnimationFrame(animate); } catch(e){ toast('MORPH 20K: '+(e.message||String(e))); } }
function stop(){ active=false; cancelAnimationFrame(raf); if(playBtn) playBtn.textContent='▶ 20K'; drawFrame(currentP); }
if(slider){ slider.addEventListener('input', async()=>{ try{ await ensureReady(); cancelAnimationFrame(raf); active=false; canvas.classList.add('active'); document.body.classList.add('gpu20k-active'); drawFrame(Number(slider.value)/100.0); if(playBtn) playBtn.textContent='▶ 20K'; } catch(e){ toast('MORPH 20K: '+(e.message||String(e))); } }); }
if(playBtn) playBtn.addEventListener('click',()=>{ if(active) stop(); else play(); });
window.addEventListener('keydown',e=>{ if(e.key==='Escape') finish(); });
const gpuPanel=$('gpu57Panel'); function panelOpen(v){ gpuPanel?.classList.toggle('gpu57-hidden', !v); }
if(!MOBILE){ btn?.addEventListener('click',e=>{ e.stopImmediatePropagation(); panelOpen(gpuPanel.classList.contains('gpu57-hidden')); }, true); }
$('gpu57Close')?.addEventListener('click',()=>panelOpen(false)); $('gpu57Reset')?.addEventListener('click',()=>{ finish(); currentP=0; if(slider) slider.value='0'; setStatus(0); drawFrame(0); });
for(const id of ['Duration','Hold','RotX','RotY','RotZ','OffX','OffY','OffZ','Scale','Spread','Size']){
 const el=$('gpu57'+id), lab=$('gpu57'+id+'V'); if(!el) continue;
 if(params.has('g57'+id)) el.value=params.get('g57'+id);
 function sync(){ if(lab) lab.textContent=el.value+(['RotX','RotY','RotZ'].includes(id)?'°':['Duration','Hold'].includes(id)?' с':['Scale','Spread'].includes(id)?'×':''); }
 sync(); el.addEventListener('input', async()=>{ sync(); if(!MOBILE && (source&&target)){ if(['RotX','RotY','RotZ','OffX','OffY','OffZ','Scale'].includes(id)){ await prepareLabel(); upload(); } drawFrame(currentP); } });
}
// better defaults if no shared state came through
if(!params.has('g57RotZ')) $('gpu57RotZ') && ($('gpu57RotZ').value='180');
window.xyzGpuMorphDirect58={play,stop};
})();
