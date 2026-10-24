// 3XyzMedia v21 -- DESKTOP ONLY. Dense 40,000-point GPU visualization.
// Important: overlay + crossfade, not one-to-one deformation of original splats.
(()=>{
'use strict';
const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>0&&innerWidth<900);
if(mobile)return;
const get=id=>document.getElementById(id), c=get('xyzDense21'), source=get('pano'), go=get('logoV2Go'), slide=get('logoV2Slider'), number=get('logoV2Num'), state=get('logoV2Status');
if(!c||!go||!slide||!source)return;
let gl=null, shader=null, buffer=null, t=0, frame=0, started=0, busy=false, good=false, loading=null;
let prevOpacity='';
function compile(type,text){const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function init(data){
 gl=c.getContext('webgl',{alpha:true,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
 if(!gl)throw new Error('WebGL для 40K слоя недоступен');
 const vertex=`attribute vec3 aTarget;attribute vec3 aColor;uniform float uT;uniform float uS;uniform float uPoint;uniform vec3 uAngles;uniform vec3 uOffset;uniform float uAspect;varying vec3 vColor;
 void main(){vec3 p=aTarget;float cx=cos(uAngles.x),sx=sin(uAngles.x),cy=cos(uAngles.y),sy=sin(uAngles.y),cz=cos(uAngles.z),sz=sin(uAngles.z);
 p.yz=vec2(p.y*cx-p.z*sx,p.y*sx+p.z*cx);p.xz=vec2(p.x*cy+p.z*sy,-p.x*sy+p.z*cy);p.xy=vec2(p.x*cz-p.y*sz,p.x*sz+p.y*cz);
 p*=uS;p+=uOffset;
 float e=uT*uT*(3.0-2.0*uT);
 // Expand dots into space then converge into the real label target.
 float phase=1.0-e;vec3 seeded=vec3(sin(aTarget.x*87.0+aTarget.y*53.0),cos(aTarget.y*103.0+aTarget.z*67.0),sin(aTarget.z*71.0+aTarget.x*61.0));
 p+=seeded*0.55*phase;
 float rx=0.86*p.x/max(1.0,uAspect);float ry=p.y*1.65;
 gl_Position=vec4(rx,ry,0.0,1.0);
 gl_PointSize=clamp(uPoint,1.0,14.0);
 vColor=aColor;}`;
 const fragment=`precision mediump float;varying vec3 vColor;void main(){vec2 p=gl_PointCoord-vec2(0.5);float r=dot(p,p);float a=smoothstep(0.25,0.02,r);gl_FragColor=vec4(vColor,a*0.82);}`;
 shader=gl.createProgram();gl.attachShader(shader,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(shader,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(shader);
 if(!gl.getProgramParameter(shader,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(shader));
 buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
 gl.useProgram(shader);
 for(const [a,index] of [['aTarget',0],['aColor',3]]){const loc=gl.getAttribLocation(shader,a);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,24,index*4);}
 good=true;
}
function val(id,fallback){const n=Number(get(id)?.value);return Number.isFinite(n)?n:fallback;}
function render(v){if(!good)return;
 const dpr=Math.min(window.devicePixelRatio||1,2);const w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);
 if(c.width!==w||c.height!==h){c.width=w;c.height=h;}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 const set1=(n,x)=>gl.uniform1f(gl.getUniformLocation(shader,n),x);
 const set3=(n,x,y,z)=>gl.uniform3f(gl.getUniformLocation(shader,n),x,y,z);
 gl.useProgram(shader);set1('uT',v);set1('uS',Math.max(.1,val('logoTextScale',1)));
 set1('uPoint',Math.min(10,Math.max(1,2.0*val('logoSplatSize',.18)))*dpr);
 set1('uAspect',w/Math.max(1,h));
 set3('uAngles',val('logoXRotation',0)*Math.PI/180,val('logoYRotation',0)*Math.PI/180,val('logoZRotation',180)*Math.PI/180);
 set3('uOffset',val('logoXOffset',0)/120,val('logoZOffset',0)/120,val('logoYOffset',0)/120);
 gl.drawArrays(gl.POINTS,0,40000);
}
function percent(v){t=Math.max(0,Math.min(1,v));slide.value=String(Math.round(t*100));if(number)number.textContent=Math.round(t*100)+'%';if(state)state.textContent=t>0?'40 000 точек REAL LABEL · GPU':'Исходная модель';
 const opacity=t*t*(3-2*t);
 source.style.opacity=String(1-opacity*.98);
 if(t>0){c.classList.add('visible');render(t)}else{c.classList.remove('visible');}
}
function stop(){cancelAnimationFrame(frame);busy=false;percent(0);source.style.opacity=prevOpacity;}
function animate(){if(busy){stop();return;}busy=true;started=performance.now();prevOpacity=source.style.opacity;function tick(now){const a=Math.min(1,(now-started)/5700);let p;
 if(a<.43){const q=a/.43;p=q*q*(3-2*q)}else if(a<.57){p=1}else{const q=(a-.57)/.43;p=1-q*q*(3-2*q)}
 percent(p);if(a<1&&busy)frame=requestAnimationFrame(tick);else stop();}frame=requestAnimationFrame(tick);}
async function prepare(){if(loading)return loading;loading=(async()=>{const url=new URL('LABEL_40000_GPU.bin',document.baseURI);const r=await fetch(url);if(!r.ok)throw new Error('LABEL_40000_GPU.bin '+r.status);const buf=await r.arrayBuffer();if(buf.byteLength!==40000*24)throw new Error('Неверный размер данных LABEL 40K');init(new Float32Array(buf));})();return loading;}
function safeError(e){stop();if(state)state.textContent='40K GPU недоступен: '+String(e?.message||e);}
// Capture the actual Morph button before legacy GPU shader handler.
go.addEventListener('click',async e=>{e.preventDefault();e.stopImmediatePropagation();if(busy){stop();return;}try{await prepare();animate();}catch(x){safeError(x)}},true);
slide.addEventListener('input',async e=>{e.stopImmediatePropagation();cancelAnimationFrame(frame);busy=false;try{await prepare();prevOpacity=source.style.opacity;percent(Number(slide.value)/100);}catch(x){safeError(x)}},true);
window.addEventListener('pagehide',()=>{if(good)stop()});
})();
