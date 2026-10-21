export function setup({config,setCamera}){
 const st=config.state,pts=st.tour,btn=document.querySelector('#playtour');btn.style.display='inline-block';let frame=0,started=0,arc=[];
 const curve=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
 function interp(seg,t){const a=pts[Math.max(0,seg-1)],b=pts[seg],c=pts[seg+1],d=pts[Math.min(pts.length-1,seg+2)];return b.map((v,i)=>{let C=c[i],A=a[i],D=d[i];if(i>=3&&i<=5){const adj=(x,y)=>x+(((y-x+540)%360)-180);C=adj(v,C);A=v-(adj(a[i],v)-a[i]);D=adj(C,D)}return i===6?Math.max(.001,curve(A,v,C,D,t)):curve(A,v,C,D,t)})}
 const sample=(p)=>{const x=Math.min(pts.length-1-1e-7,Math.max(0,p)),seg=Math.floor(x);return interp(seg,x-seg)};
 const cost=(a,b)=>{let sum=0;for(let i=0;i<10;i++){let w=(i===3||i===4||i===5)?0.12:i===6?0.5:1;sum+=(a[i]-b[i])**2*w*w}return Math.sqrt(sum)};
 const count=(pts.length-1)*50;arc=[{f:0,l:0}];let prev=sample(0),total=0;for(let i=1;i<=count;i++){let f=(pts.length-1)*i/count,v=sample(f);total+=cost(prev,v);arc.push({f,l:total});prev=v}
 function update(p){let target=p*total,lo=0,hi=arc.length-1;while(hi-lo>1){let mid=(lo+hi)>>1;if(arc[mid].l<target)lo=mid;else hi=mid}let a=arc[lo],b=arc[hi],f=a.f+(b.f-a.f)*(target-a.l)/Math.max(1e-9,b.l-a.l),v=sample(f);setCamera({p:v.slice(0,3),o:v.slice(3,6),d:v[6],m:v.slice(7,10),u:st.u,s:st.s,a:st.a})}
 function stop(){cancelAnimationFrame(frame);frame=0;btn.textContent='▶ TOUR'}
 btn.onclick=()=>{if(frame){stop();return}const duration=Math.max(1,Number(st.ts)||5)*1000*(pts.length-1),stops=!!st.tp;started=performance.now();btn.textContent='■ TOUR';function tick(now){let t=Math.min(1,(now-started)/duration);if(!stops){t=t*t*(3-2*t);update(t)}else{const f=t*(pts.length-1),seg=Math.min(pts.length-2,Math.floor(f)),u=(f-seg);let v=interp(seg,u*u*(3-2*u));setCamera({p:v.slice(0,3),o:v.slice(3,6),d:v[6],m:v.slice(7,10),u:st.u,s:st.s,a:st.a})}if(t<1)frame=requestAnimationFrame(tick);else stop()}frame=requestAnimationFrame(tick)};
}
