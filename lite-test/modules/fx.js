// Real splat shader from scene_lite_fx.xml, no duplicate 3D effect implementation.
export function setup({viewer,config}){
 const st=config.state,mode=Number(st.em)||1,btn=document.querySelector('#effect');
 btn.style.display='inline-block';btn.textContent='✨ '+({1:'BURST',2:'VORTEX',3:'UNVEIL',4:'RAINBOW',5:'SPIRAL',6:'FIRE',7:'3XyzMedia'}[mode]||'FX');
 let frame=0;
 const set=(p,v)=>viewer.set('image.splats.'+p,v);
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;set('fx_progress',0);set('fx_mode',0);try{viewer.set('hotspot[xyz_fire44_host].visible',false)}catch(e){}}
 btn.onclick=()=>{
  stop();set('fx_mode',mode);set('fx_power',Number(st.ep)||1);set('fx_radius',Number(st.er)||100);
  let started=performance.now(),base=mode===3||mode===4?3600:mode===5?5200:mode===6?5400:mode===7?6200:4300,duration=base/Math.max(.25,Number(st.et)||1);
  // FIRE uses the original iframe hotspot, embers are configured in fire_canvas_v56.html.
  if(mode===6){try{viewer.set('hotspot[xyz_fire44_host].visible',true);viewer.set('hotspot[xyz_fire44_host].ty',Number(st.eo)||0)}catch(e){}}
  function tick(now){const p=Math.min(1,(now-started)/duration),ease=mode===1?p:p*p*(3-2*p);set('fx_progress',ease);
   if(p<1)frame=requestAnimationFrame(tick);else{frame=0;set('fx_progress',mode===3||mode===4?1:0);if(mode===6){set('fx_mode',0);try{viewer.set('hotspot[xyz_fire44_host].visible',false)}catch(e){}}}}
  frame=requestAnimationFrame(tick);
 };
 window.addEventListener('pagehide',stop,{once:true});
}
