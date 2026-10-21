export function setup({config}){const box=document.querySelector('#videoLayer'),v=box.querySelector('video');const url=config.state.vu;
 if(!/^https?:\/\//i.test(url)&&!/^\.{0,2}\//.test(url))return;
 v.src=url;v.preload='none';box.style.display='block';box.querySelector('#videoClose').onclick=()=>{v.pause();box.style.display='none'};
}
