(() => {
'use strict';
const loader=document.getElementById('loader');
const fly=document.getElementById('flyLogo');
const hero=document.getElementById('heroLogo');
const header=document.querySelector('header');
const fill=document.getElementById('fill');
const pct=document.getElementById('pct');
const status=document.getElementById('status');
const ui=document.getElementById('loadUi');
const mark=document.querySelector('.load-mark');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
// A fully cached visit used to snap 0 → 100. This floor lets the ring ease
// the whole way even when every asset is already in memory.
const MIN_LOAD_MS=reduced?420:3900;
let animation=null, settled=false;
let shown=0, target=0, t0=0, raf=0, waiter=null;

function paint(value){
  const v=Math.max(0,Math.min(100,value));
  const glow=document.getElementById('logoGlow');
  const ring=document.getElementById('loadRingProgress');
  if(glow) glow.style.opacity=String(Math.max(.12,v/100));
  if(ring) ring.style.strokeDashoffset=String(100-v);
  if(fill) fill.style.width=`${v}%`;
  if(pct) pct.textContent=`${Math.floor(v)}%`;
  window.elev8miLoadProgress=v/100;
  document.getElementById('loadProgress')?.setAttribute('aria-valuenow',String(Math.floor(v)));
}
function tick(now){
  raf=0;
  if(!t0) t0=now;
  const elapsed=now-t0;
  const u=Math.min(1,elapsed/MIN_LOAD_MS);
  const eased=u*u*(3-2*u);
  const cap=elapsed>=MIN_LOAD_MS?100:(4+96*eased);
  const desired=Math.min(target,cap);
  shown+=(desired-shown)*(reduced?1:0.11);
  if(Math.abs(desired-shown)<0.04) shown=desired;
  paint(shown);
  if(waiter && shown>=99 && elapsed>=MIN_LOAD_MS){const done=waiter;waiter=null;done();}
  if(!settled) raf=requestAnimationFrame(tick);
}
function setProgress(n,label){
  target=Math.max(target,Math.max(0,Math.min(100,Number(n)||0)));
  if(status&&label) status.textContent=label;
  if(!raf && !settled) raf=requestAnimationFrame(tick);
}
function whenSmooth(){
  target=100;
  if(status) status.textContent='Opening the sky';
  if(shown>=99 && t0 && performance.now()-t0>=MIN_LOAD_MS) return Promise.resolve();
  return new Promise(resolve=>{waiter=resolve;if(!raf) raf=requestAnimationFrame(tick);});
}
function blockPage(blocked){
  ['header','main','footer'].forEach(selector=>{const el=document.querySelector(selector);if(el)el.inert=blocked;});
  document.body.setAttribute('aria-busy',String(blocked));
  loader?.setAttribute('aria-hidden',String(!blocked));
}
function coverHero(){
  // The loader is already the hero. Do not reframe or zoom it mid-load.
}
function begin(){
  settled=false;
  shown=0; target=0; t0=performance.now(); waiter=null;
  animation?.cancel(); animation=null;
  if(mark&&fly&&fly.parentElement!==mark) mark.append(fly);
  if(fly){fly.style.display='none';}
  if(hero){hero.style.opacity='1';hero.style.visibility='visible';hero.style.display='';}
  blockPage(true);
  document.body.classList.add('locked');document.body.classList.remove('live');header?.classList.remove('ready');
  document.documentElement.classList.add('elev8-hero-full');
  document.querySelector('.hero-sigil')?.classList.remove('breathing');
  window.dispatchEvent(new Event('resize'));
  requestAnimationFrame(()=>requestAnimationFrame(coverHero));
  if(loader){loader.className='';loader.setAttribute('aria-hidden','false');}
  ui?.classList.remove('hide');
  paint(0);
  if(status) status.textContent='Preparing the sky';
  if(raf) cancelAnimationFrame(raf);
  raf=requestAnimationFrame(tick);
}
function ready(){
  blockPage(false);document.body.classList.remove('locked');document.body.classList.add('live');header?.classList.add('ready');
}
function settle(){
  if(settled)return;settled=true;animation?.cancel();animation=null;
  if(raf){cancelAnimationFrame(raf);raf=0;}
  const stage=document.getElementById('solarSystem');
  const journey=document.getElementById('journey');
  if(stage){stage.style.transform='';stage.style.transformOrigin='';stage.style.willChange='';}
  if(journey){journey.style.transform='';journey.style.transformOrigin='';}
  document.documentElement.classList.remove('elev8-hero-full');
  try{ready();}catch(_){document.body.classList.remove('locked');document.body.classList.add('live');}
  try{
    const sigil=hero?.parentElement;
    if(hero){hero.style.display='';hero.style.visibility='visible';hero.style.opacity='1';}
    if(fly) fly.style.display='none';
    sigil?.classList.add('breathing');
    loader?.classList.add('done');
    loader?.setAttribute('aria-hidden','true');
    paint(100);
    if(status) status.textContent='The table is ready';
    window.dispatchEvent(new Event('resize'));
  }catch(_){loader?.classList.add('done');}
}
async function shrinkHero(){
  const stage=document.getElementById('solarSystem');
  const journey=document.getElementById('journey');
  const root=document.documentElement;
  if(!stage||reduced||!stage.animate||!root.classList.contains('elev8-hero-full')){
    if(stage){stage.style.transform='';stage.style.transformOrigin='';stage.style.willChange='';}
    if(journey){journey.style.transform='';journey.style.transformOrigin='';}
    root.classList.remove('elev8-hero-full');
    return;
  }
  const from=getComputedStyle(stage).transform;
  const skyFrom=journey?getComputedStyle(journey).transform:'none';
  const anim=stage.animate([{transform:from},{transform:'none'}],{duration:1400,easing:'cubic-bezier(.16,.84,.2,1)',fill:'forwards'});
  animation=anim;
  const sky=journey?.animate?.([{transform:skyFrom},{transform:'none'}],{duration:1400,easing:'cubic-bezier(.16,.84,.2,1)',fill:'forwards'});
  try{await Promise.all([anim.finished,sky?.finished]);}catch(_){}
  sky?.cancel();
  anim.cancel();
  stage.style.transform='';
  stage.style.transformOrigin='';
  stage.style.willChange='';
  if(journey){journey.style.transform='';journey.style.transformOrigin='';}
  root.classList.remove('elev8-hero-full');
  window.dispatchEvent(new Event('resize'));
}
addEventListener('resize',()=>{if(document.documentElement.classList.contains('elev8-hero-full'))coverHero();});
async function reveal(){
  if(!loader||!hero){settle();return;}
  target=100; paint(Math.max(shown,100)); shown=100;
  if(status) status.textContent='Opening the table';
  if(reduced){settle();return;}
  loader.classList.add('revealing');ui?.classList.add('hide');
  await shrinkHero();
  settle();
}
function failOpen(message='Opening the table'){
  if(waiter){const done=waiter;waiter=null;done();}
  target=100; shown=100; paint(100);
  if(status) status.textContent=message;
  settle();
}
async function replay(){
  if(window.scrollY>8) window.scrollTo({top:0,behavior:'auto'});
  await new Promise(r=>setTimeout(r,220));
  begin();
  for(const [p,label,ms] of [[24,'Returning to the stars',280],[58,'Aligning the sky',320],[92,'Opening the table',360]]){setProgress(p,label);await new Promise(r=>setTimeout(r,ms));}
  await whenSmooth();
  await reveal();
}
window.Elev8Entrance={begin,setProgress,reveal,failOpen,replay,whenSmooth};
document.getElementById('replay')?.addEventListener('click',replay);
begin();
})();
