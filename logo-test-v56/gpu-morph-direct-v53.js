/* 3XyzMedia v53: DIRECT WebGL2 points on STUDIO canvas. No iframe/navigation. */
(()=>{'use strict';
const N=20000, $=id=>document.getElementById(id), canvas=$('gpu53canvas'),note=$('gpu53note');
const params=new URLSearchParams(location.search),locked=params.get('ui')==='locked';
const panel=$('logoMorphTest'),opener=$('logoMorphShow'),closer=$('logoMorphCollapse'),btn=$('gpuMorphLaunch48');
const allowed=!locked||params.get('gpu20k')==='1'||params.get('morph')==='1'||params.get('gpu')==='1';
function show(s){note.textContent=s;note.classList.add('visible');}
function hide(){note.classList.remove('visible');}
function setPanel(v){panel.classList.toggle('xyz-hidden',!v);panel.style.display=v?'block':'none';}
if(opener){opener.removeAttribute('hidden');opener.removeAttribute('aria-hidden');opener.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();setPanel(panel.classList.contains('xyz-hidden'));},true);}
if(closer)closer.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();setPanel(false);},true);
setPanel(false);
if(locked){opener.style.display='none';if(!allowed)btn.style.display='none';}
let gl=null,prog=null,vao=null,buffers=[],uniforms={},source=null,target=null,colors=null,seed=null,ready=false,active=false,loading=false,raf=0,stamp=0;
let modelKey='',cachedKey='',cacheData=null;
const pointSize=3.25;
function fatal(message){loading=false;active=false;canvas.classList.remove('active');show('MORPH 20K: '+message);setTimeout(hide,8000);}
function shader(t,s){let v=gl.createShader(t);gl.shaderSource(v,s);gl.compileShader(v);if(!gl.getShaderParameter(v,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(v));return v;}
const vertex=`#version 300 es
precision highp float;
layout(location=0) in vec3 aSource;
layout(location=1) in vec3 aTarget;
layout(location=2) in vec3 aSeed;
layout(location=3) in vec3 aColor;
uniform float uProgress,uSpread,uSize,uAspect;
out vec3 vColor;
float e(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
void main(){
float p=clamp(uProgress,0.,1.);
float t=e((p-.10)/.78);
float burst=e(p/.33)*(1.-e((p-.43)/.50));
vec3 dir=normalize(aSeed*2.-1.+vec3(.001));
vec3 move=normalize(aTarget-aSource+vec3(.001));
vec3 swirl=normalize(cross(move,dir)+vec3(.01));
vec3 pos=mix(aSource,aTarget,t)+uSpread*burst*(dir*(1.+.8*aSeed.x)+swirl*.48*sin(15.*p+11.*aSeed.z));
float z=11.0-pos.z;
gl_Position=vec4(pos.x*2.1445069/uAspect,pos.y*2.1445069,pos.z*1.0002+10.8,z);
float perspective=9./max(1.,z);
gl_PointSize=clamp(uSize*perspective,1.,11.);
vec3 red=mix(vec3(.96,.13,.20),vec3(1.,.67,.52),aSeed.y);
vColor=mix(aColor,red,e((p-.25)/.65));
}`;
const fragment=`#version 300 es
precision mediump float;
in vec3 vColor;out vec4 outColor;
void main(){vec2 q=gl_PointCoord*2.-1.;float r=dot(q,q);float a=1.-smoothstep(.25,1.,r);if(a<.02)discard;outColor=vec4(vColor,a*.98);}`;
function init(){if(gl)return;gl=canvas.getContext('webgl2',{alpha:true,antialias:false,powerPreference:'high-performance',premultipliedAlpha:false});if(!gl)throw Error('WebGL2 недоступен');
prog=gl.createProgram();gl.attachShader(prog,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(prog,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
for(const n of ['uProgress','uSpread','uSize','uAspect'])uniforms[n]=gl.getUniformLocation(prog,n);
vao=gl.createVertexArray();gl.bindVertexArray(vao);for(let i=0;i<4;i++){let b=gl.createBuffer();buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,N*3*4,gl.DYNAMIC_DRAW);gl.vertexAttribPointer(i,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(i);}
gl.bindVertexArray(null);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);gl=null;ready=false;active=false;canvas.classList.remove('active');show('MORPH 20K: потерян WebGL-контекст');});
}
function upload(){gl.bindVertexArray(vao);[source,target,seed,colors].forEach((a,i)=>{gl.bindBuffer(gl.ARRAY_BUFFER,buffers[i]);gl.bufferSubData(gl.ARRAY_BUFFER,0,a);});gl.bindVertexArray(null);}
function samplePLY(b){const bytes=new Uint8Array(b),head=new TextDecoder('ascii').decode(bytes.subarray(0,Math.min(b.byteLength,131072)));
const m=/end_header\r?\n/.exec(head);if(!m)throw Error('PLY без end_header');const lines=head.slice(0,m.index).split(/\r?\n/);const binary=lines.some(x=>x.includes('format binary_little_endian'));
const elements=[];let el=null;for(const l of lines){const a=l.trim().split(/\s+/);if(a[0]==='element'){el={name:a[1],count:Number(a[2]),props:[]};elements.push(el);}else if(a[0]==='property'&&el){if(a[1]==='list')throw Error('PLY с face list не поддерживается');el.props.push({type:a[1],name:a[2]});}}
const sz={char:1,uchar:1,int8:1,uint8:1,short:2,ushort:2,int16:2,uint16:2,int:4,uint:4,int32:4,uint32:4,float:4,float32:4,double:8,float64:8};let off=m.index+m[0].length;
for(const e of elements){let stride=0;for(const p of e.props){p.off=stride;stride+=sz[p.type]||0;}e.offset=off;e.stride=stride;if(!stride)throw Error('Неизвестное свойство PLY');off+=stride*e.count;}
const vt=elements.find(e=>e.name==='vertex');if(!vt||vt.count<1)throw Error('PLY без vertex');const prop=Object.fromEntries(vt.props.map(p=>[p.name,p]));const dv=new DataView(b);
function rd(e,i,name){const pr=(typeof name==='string'?Object.fromEntries(e.props.map(p=>[p.name,p]))[name]:name);if(!pr)return 0;let o=e.offset+i*e.stride+pr.off;switch(pr.type){case 'uchar':case 'uint8':return dv.getUint8(o);case 'char':case 'int8':return dv.getInt8(o);case 'ushort':case 'uint16':return dv.getUint16(o,true);case 'short':case 'int16':return dv.getInt16(o,true);case 'uint':case 'uint32':return dv.getUint32(o,true);case 'int':case 'int32':return dv.getInt32(o,true);case 'double':case 'float64':return dv.getFloat64(o,true);default:return dv.getFloat32(o,true);}}
const raw=new Float32Array(N*3),cols=new Float32Array(N*3);
if(binary){if(off>b.byteLength)throw Error('Обрезанный PLY');const ch=elements.find(e=>e.name==='chunk');for(let i=0;i<N;i++){const j=Math.min(vt.count-1,Math.floor((i+.5)*vt.count/N)),o=3*i;
if(prop.x&&prop.y&&prop.z){raw[o]=rd(vt,j,prop.x);raw[o+1]=rd(vt,j,prop.y);raw[o+2]=rd(vt,j,prop.z);}else if(prop.packed_position&&ch){const pk=rd(vt,j,prop.packed_position)>>>0, k=Math.min(ch.count-1,Math.floor(j/256));for(let d=0;d<3;d++){const axis=['x','y','z'][d],lo=rd(ch,k,'min_'+axis),hi=rd(ch,k,'max_'+axis),t=d===0?(pk>>>21)/2047:d===1?((pk>>>11)&1023)/1023:(pk&2047)/2047;raw[o+d]=lo+(hi-lo)*t;}}else throw Error('PLY XYZ не распознаны');
if(prop.red&&prop.green&&prop.blue){cols[o]=rd(vt,j,prop.red)/255;cols[o+1]=rd(vt,j,prop.green)/255;cols[o+2]=rd(vt,j,prop.blue)/255;}else if(prop.f_dc_0&&prop.f_dc_1&&prop.f_dc_2){cols[o]=.5+.28209479*rd(vt,j,prop.f_dc_0);cols[o+1]=.5+.28209479*rd(vt,j,prop.f_dc_1);cols[o+2]=.5+.28209479*rd(vt,j,prop.f_dc_2);}else{cols[o]=.85;cols[o+1]=.91;cols[o+2]=.99;}
}}else if(lines.some(x=>x.includes('format ascii'))){const tail=new TextDecoder().decode(bytes.subarray(m.index+m[0].length)).split(/\r?\n/);const ix=['x','y','z'].map(n=>vt.props.findIndex(p=>p.name===n));if(ix.some(i=>i<0))throw Error('PLY ASCII без XYZ');for(let i=0;i<N;i++){let j=Math.min(vt.count-1,Math.floor((i+.5)*vt.count/N));let t=(tail[j]||'').trim().split(/\s+/).map(Number),o=3*i;for(let d=0;d<3;d++)raw[o+d]=t[ix[d]]||0;cols[o]=.85;cols[o+1]=.91;cols[o+2]=.99;}}else throw Error('Неподдерживаемый формат PLY');
let low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];for(let i=0;i<raw.length;i+=3)for(let d=0;d<3;d++){low[d]=Math.min(low[d],raw[i+d]);high[d]=Math.max(high[d],raw[i+d]);}let mid=low.map((x,d)=>(x+high[d])/2),span=Math.max(1e-6,...high.map((v,d)=>v-low[d]));for(let i=0;i<raw.length;i+=3)for(let d=0;d<3;d++)raw[i+d]=(raw[i+d]-mid[d])*5.1/span;
return{raw,cols};}
function currentModel(){return ($('xyzModelInput')?.value||params.get('model')||'SOY2.ply').trim();}
function modelURL(){let s=currentModel();if(/^https:\/\//i.test(s))return s;if(/^[\w.-]+\.ply$/i.test(s))return 'https://raw.githubusercontent.com/3XyzMedia/3d-models/main/model/'+s;throw Error('Нужен публичный HTTPS PLY');}
async function prepare(){const url=modelURL();if(cachedKey===url&&cacheData){source=cacheData.raw.slice();colors=cacheData.cols.slice();return;}show('MORPH 20K · читаю твою PLY…');let response=await fetch(url);if(!response.ok)throw Error('Модель HTTP '+response.status);let b=await response.arrayBuffer();const data=samplePLY(b);source=data.raw;colors=data.cols;cacheData=data;cachedKey=url;}
async function label(){let r=await fetch('LABEL_REAL_20000.xyz.bin');if(!r.ok)throw Error('Blender LABEL HTTP '+r.status);let b=await r.arrayBuffer();if(b.byteLength!==N*12)throw Error('Неверный размер Blender LABEL');target=new Float32Array(b);}
function tick(now){if(!active)return;let total=Math.max(2.5,Math.min(12,Number($('logoMorphDuration')?.value)||5))*1000;let x=Math.min(1,(now-stamp)/total);let p=x<.481?x/.481:x<.519?1:Math.max(0,1-(x-.519)/.481);
let dpr=Math.min(devicePixelRatio||1,1.5),w=Math.floor(innerWidth*dpr),h=Math.floor(innerHeight*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(prog);gl.bindVertexArray(vao);
gl.uniform1f(uniforms.uProgress,p);gl.uniform1f(uniforms.uSpread,Number($('logoMorphRadius39')?.value)||1.5);gl.uniform1f(uniforms.uSize,pointSize);gl.uniform1f(uniforms.uAspect,w/h);gl.drawArrays(gl.POINTS,0,N);
if(x>=1){finish();return;}raf=requestAnimationFrame(tick);
}
function finish(){active=false;cancelAnimationFrame(raf);canvas.classList.remove('active');hide();}
async function play(){if(active||loading)return;loading=true;try{init();await Promise.all([prepare(),label()]);seed=new Float32Array(N*3);for(let i=0;i<seed.length;i++)seed[i]=((Math.sin(i*12.9898+4.2)*43758.5453)%1+1)%1;upload();ready=true;loading=false;active=true;canvas.classList.add('active');stamp=performance.now();raf=requestAnimationFrame(tick);}catch(e){fatal(e.message||String(e));}}
btn?.addEventListener('click',play);document.addEventListener('keydown',e=>{if(e.key==='Escape')finish()});
window.xyzGpuMorphDirect53={play,stop:finish};
})();
