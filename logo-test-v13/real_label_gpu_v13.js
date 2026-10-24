/* 3XyzMedia GPU EXPERIMENT v13: independent WebGL particle morph from a proxy source
   to real LABEL samples. NOT a shader for original SOY2 Gaussian splats. */
(()=>{
'use strict';
const N=12000, STRIDE=36;
let canvas=null, gl=null, buf=null, program=null, raf=0, start=0, active=false, loaded=null;
const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>0&&innerWidth<900);
if(!mobile)return;
const root=document.createElement('canvas');root.id='xyzGpuMorph13';
Object.assign(root.style,{position:'fixed',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:'29',display:'none'});
document.body.appendChild(root);canvas=root;
const vs=`attribute vec3 a0; attribute vec3 a1; attribute vec3 rgb;
uniform float uT; uniform float uAspect; uniform float uSize;
uniform vec3 uRot; uniform vec3 uShift;
varying vec3 vColor;varying float vAlpha;
void main(){
  float t=clamp(uT,0.0,1.0);float e=t*t*(3.0-2.0*t);
  vec3 p=mix(a0,a1,e);vec3 r=radians(uRot);
  float cx=cos(r.x),sx=sin(r.x),cy=cos(r.y),sy=sin(r.y),cz=cos(r.z),sz=sin(r.z);
  p.yz=mat2(cx,sx,-sx,cx)*p.yz;p.xz=mat2(cy,-sy,sy,cy)*p.xz;p.xy=mat2(cz,sz,-sz,cz)*p.xy;
  p += uShift;
  float k=0.62;
  gl_Position=vec4(p.x*k/uAspect,p.z*k + p.y*0.10*k,0.0,1.0);
  gl_PointSize=uSize;vColor=mix(vec3(0.35,0.8,1.0),rgb,e);vAlpha=min(1.0,uT*3.0);
}`;
const fs=`precision mediump float;varying vec3 vColor;varying float vAlpha;
void main(){vec2 d=gl_PointCoord-vec2(.5);float rr=dot(d,d);if(rr>0.25)discard;
float a=(1.0-smoothstep(0.07,0.25,rr))*vAlpha;gl_FragColor=vec4(vColor*a,a);}`;
function shader(type,src){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh));return sh;}
function initialize(data){
 gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
 if(!gl)throw Error('WebGL для экспериментального слоя недоступен');
 const a=shader(gl.VERTEX_SHADER,vs),b=shader(gl.FRAGMENT_SHADER,fs);program=gl.createProgram();gl.attachShader(program,a);gl.attachShader(program,b);gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 gl.deleteShader(a);gl.deleteShader(b);buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
 [['a0',0],['a1',12],['rgb',24]].forEach(([n,o])=>{let loc=gl.getAttribLocation(program,n);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,STRIDE,o);});
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stop();document.getElementById('logoV2Status').textContent='GPU overlay недоступен, модель krpano не затронута';},{once:true});
}
const read=n=>Number(document.getElementById(n)?.value||0);
function draw(now){if(!active||!gl)return;
 const elapsed=(now-start)/1000;
 // duration 5.2 seconds incl reversal and 0.7s hold
 let t=elapsed<1.8?elapsed/1.8:elapsed<2.5?1:elapsed<4.5?1-(elapsed-2.5)/2:0;
 const pixelRatio=Math.min(devicePixelRatio||1,1.5), w=Math.max(1,Math.floor(innerWidth*pixelRatio)),h=Math.max(1,Math.floor(innerHeight*pixelRatio));
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);
 gl.uniform1f(gl.getUniformLocation(program,'uT'),Math.max(0,t));gl.uniform1f(gl.getUniformLocation(program,'uAspect'),w/h);
 gl.uniform1f(gl.getUniformLocation(program,'uSize'),Math.min(3.2,Math.max(1.7,2.0*pixelRatio)));
 gl.uniform3f(gl.getUniformLocation(program,'uRot'),read('logoXRotation'),read('logoYRotation'),read('logoZRotation'));
 gl.uniform3f(gl.getUniformLocation(program,'uShift'),read('logoXOffset')/150,read('logoYOffset')/150,read('logoZOffset')/150);
 gl.drawArrays(gl.POINTS,0,N);
 if(elapsed>=4.5){stop();return}raf=requestAnimationFrame(draw);
}
function stop(){active=false;cancelAnimationFrame(raf);canvas.style.display='none';const st=document.getElementById('logoV2Status');if(st)st.textContent='GPU test: остановлен';}
async function toggle(){if(active){stop();return;}
 try{const st=document.getElementById('logoV2Status');if(st)st.textContent='GPU test: загрузка реальных точек LABEL…';
 if(!loaded){let r=await fetch('real_label_gpu_12000.bin');if(!r.ok)throw Error('HTTP '+r.status);loaded=await r.arrayBuffer();if(loaded.byteLength!==N*STRIDE)throw Error('Размер буфера не совпал');}
 if(!gl)initialize(new Float32Array(loaded));active=true;start=performance.now();canvas.style.display='block';raf=requestAnimationFrame(draw);
 if(st)st.textContent='GPU test: 12 000 настоящих LABEL-точек (исходная модель не перемещается)';
 }catch(e){stop();const st=document.getElementById('logoV2Status');if(st)st.textContent='GPU тест недоступен: '+e.message;}
}
// v13 is called by the existing v12 mobile click capture handler via window.xyzGpuMorphV13.
// The existing brand handler still opens neon LABEL and invokes MORPH once.
window.xyzGpuMorphV13={toggle,stop};
})();
