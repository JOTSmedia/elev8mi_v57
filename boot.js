(() => {
'use strict';
const VERSION='57';
const entrance=window.Elev8Entrance;
if(!entrance){
  document.body.classList.remove('locked');document.body.classList.add('live');document.body.removeAttribute('aria-busy');
  const loader=document.getElementById('loader');loader?.classList.add('done');loader?.setAttribute('aria-hidden','true');
  return;
}
const mobile=!!window.Elev8Handheld;
const landscape=matchMedia('(orientation: landscape)').matches;
const COMMON=[
  {url:'elev8mi-logo.webp?v=57',bytes:210676},
  {url:'elev8mi-wordmark.webp?v=57',bytes:70374},
  {url:'assets/orbit.webp?v=57',bytes:443170},
  {url:'assets/moon.webp?v=57',bytes:46118},
  {url:'assets/sky/night-sky.json?v=57',bytes:20099},
  {url:'assets/fonts/cinzel-decorative-normal-400.woff2?v=57',bytes:14416},
  {url:'assets/fonts/cinzel-decorative-normal-700.woff2?v=57',bytes:15488},
  {url:'assets/fonts/cinzel-normal-400-900.woff2?v=57',bytes:25904},
  {url:'assets/fonts/cormorant-garamond-italic-300-700.woff2?v=57',bytes:39260},
  {url:'assets/fonts/cormorant-garamond-normal-300-700.woff2?v=57',bytes:37640},
  {url:'assets/fonts/plus-jakarta-sans-normal-200-800.woff2?v=57',bytes:27348}
];
const PORTRAIT=[
  {url:'assets/surface.webp?v=57',bytes:591566},
  {url:'assets/subterranean.webp?v=57',bytes:650272}
];
const LANDSCAPE=[
  {url:'assets/surface-wide-v25.webp?v=57',bytes:599168},
  {url:'assets/subterranean-wide-v25.webp?v=57',bytes:697350}
];
const MOBILE=[
  {url:'assets/space/earth-surfacemap-m.webp?v=57',bytes:60996},
  {url:'assets/space/earth-cloudmap-m.webp?v=57',bytes:157300},
  {url:'assets/space/earth-detail-m.webp?v=57',bytes:50244},
  {url:'assets/space/earth-night-m.webp?v=57',bytes:15266},
  {url:'assets/space/milkyway-m.webp?v=57',bytes:58010},
  {url:'assets/space/mercury-m.webp?v=57',bytes:38380},
  {url:'assets/space/venus-m.webp?v=57',bytes:1870},
  {url:'assets/space/mars-m.webp?v=57',bytes:20056},
  {url:'assets/space/jupiter-m.webp?v=57',bytes:14432},
  {url:'assets/space/saturn-m.webp?v=57',bytes:2814},
  {url:'assets/space/uranus-m.webp?v=57',bytes:882},
  {url:'assets/space/neptune-m.webp?v=57',bytes:1714},
  {url:'assets/space/moon-m.webp?v=57',bytes:19236},
  {url:'assets/space/moon-normal-m.webp?v=57',bytes:75800},
  {url:'assets/space/saturn-rings.png?v=57',bytes:1917}
];
const DESKTOP=[
  {url:'assets/earth-surfacemap.webp?v=57',bytes:988278},
  {url:'assets/earth-cloudmap.webp?v=57',bytes:2567888},
  {url:'assets/space/earth-detail.webp?v=57',bytes:878292},
  {url:'assets/space/earth-night.webp?v=57',bytes:127292},
  {url:'assets/space/milkyway.webp?v=57',bytes:1544398},
  {url:'assets/space/mercury.webp?v=57',bytes:161076},
  {url:'assets/space/venus.webp?v=57',bytes:4928},
  {url:'assets/space/mars.webp?v=57',bytes:112214},
  {url:'assets/space/jupiter.webp?v=57',bytes:43928},
  {url:'assets/space/saturn.webp?v=57',bytes:8094},
  {url:'assets/space/uranus.webp?v=57',bytes:2624},
  {url:'assets/space/neptune.webp?v=57',bytes:4964},
  {url:'assets/space/moon.webp?v=57',bytes:73282},
  {url:'assets/space/moon-normal.webp?v=57',bytes:310674},
  {url:'assets/space/saturn-rings.png?v=57',bytes:1917}
];
const CODE=[
  {url:'journey.js?v=57',bytes:6692},
  {url:'motion.js?v=57',bytes:2366},
  {url:'vendor/astronomy.browser.min.js?v=57',bytes:116424},
  {url:'lunar-phase.js?v=57',bytes:4002},
  {url:'spin-config.js?v=57',bytes:2531},
  {url:'context-guard.js?v=57',bytes:10256},
  {url:'hero-apex.js?v=57',bytes:5756},
  {url:'solar-system.js?v=57',bytes:26705},
  {url:'planet-spin.js?v=57',bytes:10112},
  {url:'planet-moons.js?v=57',bytes:3737},
  {url:'tarot-deck.js?v=57',bytes:16553},
  {url:'deck-config.js?v=57',bytes:2655},
  {url:'tarot.js?v=57',bytes:7240},
  {url:'form-config.js?v=57',bytes:764},
  {url:'reading-contact.js?v=57',bytes:11132},
  {url:'payment-config.js?v=57',bytes:742},
  {url:'booking.js?v=57',bytes:5912},
  {url:'reading-help.js?v=57',bytes:1628},
  {url:'navigation.js?v=57',bytes:7782},
  {url:'photo-motion.js?v=57',bytes:42147},
  {url:'sidereal.js?v=57',bytes:1630},
  {url:'world-effects.js?v=57',bytes:34804},
  {url:'space-realism.js?v=57',bytes:19238},
  {url:'constellations-ui.js?v=57',bytes:23855},
  {url:'v36.js?v=57',bytes:5140},
  {url:'audio-gate.js?v=57',bytes:1984},
  {url:'vendor/three.module.min.js?v=57',bytes:687458}
];
const visual=[...COMMON,...(landscape?LANDSCAPE:PORTRAIT),...(mobile?MOBILE:DESKTOP)];
const network=[...visual,...(mobile?CODE.filter(item=>!item.url.includes('three.module')):CODE)];
const failures=[];
let cancelled=false;
const controllers=new Set();
const boot=window.Elev8Boot={hold:true,failures,release(){if(!this.hold)return;this.hold=false;document.documentElement.classList.remove('elev8-preloading');window.dispatchEvent(new CustomEvent('elev8mi:boot-release'));window.Elev8Motion?.releaseBoot?.();}};
document.documentElement.classList.add('elev8-preloading');
entrance.begin();

const frame=()=>new Promise(r=>requestAnimationFrame(()=>r()));
const idle=()=>new Promise(r=>('requestIdleCallback'in window?requestIdleCallback(()=>r(),{timeout:180}):setTimeout(r,24)));
function timeout(promise,ms,label){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label||'Timed out')),ms))]);}
let loadedWeight=0;
const totalWeight=network.reduce((s,x)=>s+x.bytes,0)||1;
const partial=new Map();
let doneCount=0;
function networkProgress(label='Loading the sky'){
  let inFlight=0;partial.forEach(v=>inFlight+=v);
  const ratio=Math.max(0,Math.min(1,(loadedWeight+inFlight)/totalWeight));
  entrance.setProgress(3+ratio*66,`${label} · ${doneCount}/${network.length}`);
}
async function fetchOne(item){
  if(cancelled)return;
  const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),30000);
  try{
    const res=await fetch(item.url,{cache:'force-cache',signal:controller.signal});if(!res.ok)throw new Error(`${res.status} ${item.url}`);
    const len=Number(res.headers.get('content-length'))||0;
    if(res.body?.getReader){
      const reader=res.body.getReader();let got=0;
      while(!cancelled){const {done,value}=await reader.read();if(done)break;got+=value?.byteLength||0;partial.set(item.url,item.bytes*Math.min(1,len?got/len:got/item.bytes));networkProgress('Preloading photoreal assets');}
      if(cancelled)try{await reader.cancel();}catch(_){}
    }else await res.arrayBuffer();
  }catch(error){if(!cancelled)failures.push({url:item.url,error:String(error)});}
  finally{clearTimeout(timer);controllers.delete(controller);partial.delete(item.url);if(!cancelled){loadedWeight+=item.bytes;doneCount++;networkProgress('Preloading photoreal assets');}}
}
async function pool(items,limit){let i=0;const workers=Array.from({length:Math.min(limit,items.length)},async()=>{while(!cancelled&&i<items.length){const item=items[i++];await fetchOne(item);if(!cancelled)await idle();}});await Promise.all(workers);}
async function decodeImage(url){
  if(cancelled)return;const img=new Image();img.decoding='async';img.src=url;
  try{await timeout(img.decode?img.decode():new Promise((r,j)=>{img.onload=r;img.onerror=j;}),9000,`Decode timeout: ${url}`);}catch(error){if(!cancelled)failures.push({url,error:String(error)});}
}
function loadScript(src){return timeout(new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error(`Unable to execute ${src}`));document.head.append(s);}),10000,`Script timeout: ${src}`);}
async function mod(src){return timeout(import(src),12000,`Module timeout: ${src}`);}
async function step(label,progress,fn){if(cancelled)return;entrance.setProgress(progress,label);try{await fn();}catch(error){failures.push({stage:label,error:String(error)});console.error(label,error);}if(cancelled)return;await frame();await idle();}
async function startSkyClock(){
  const m=await mod('./sidereal.js?v=57');
  const sky=window.Elev8Sky||(window.Elev8Sky={rotation:0});
  const NYC=-74.006;
  const base=m.siderealAngleUnwrapped(new Date(),NYC);
  let skyClock=0,skyStamp=performance.now(),skyFrame=0,place=0,placeAt=0,lonSeen=NaN;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick=()=>{
    skyFrame=0;
    if(document.hidden)return;
    const now=performance.now();
    const speed=Math.max(1,Math.min(12,window.Elev8OrbitSpeed||1));
    skyClock+=(now-skyStamp)/1000*speed;
    skyStamp=now;
    const lon=sky.lon;
    const lonDeg=Number.isFinite(lon)?lon:NYC;
    if(lonDeg!==lonSeen||now-placeAt>1000){lonSeen=lonDeg;placeAt=now;place=base-m.siderealAngleUnwrapped(new Date(),lonDeg);}
    const turn=reduced?0:skyClock*(Math.PI*2/90);
    sky.rotation=place-turn;
    if(window.Elev8Boot?.hold||document.documentElement.classList.contains('elev8-hero-full'))window.Elev8PhotoMotion?.paint?.();
    skyFrame=requestAnimationFrame(tick);
  };
  const wake=()=>{skyStamp=performance.now();if(!document.hidden&&!skyFrame)skyFrame=requestAnimationFrame(tick);};
  document.addEventListener('visibilitychange',wake);
  tick();
}
async function execute(){
  await step('Starting the motion engine',72,()=>loadScript('motion.js?v=57'));
  await step('Mapping the journey',73,()=>loadScript('journey.js?v=57'));
  await step('Preparing the WebGL guard',74,async()=>{const m=await mod('./context-guard.js?v=57');m.init();await mod('./hero-apex.js?v=57');});
  await step('Building the solar system',76,async()=>{await loadScript('solar-system.js?v=57');await loadScript('planet-spin.js?v=57');await loadScript('planet-moons.js?v=57');});
  await step('Compositing the photoreal sky',78,()=>loadScript('photo-motion.js?v=57'));
  await step('Turning the night sky',80,()=>startSkyClock());
  await step('Tracing the constellations',82,()=>mod('./constellations-ui.js?v=57'));
  await step('Calculating the live sky',84,async()=>{await loadScript('vendor/astronomy.browser.min.js?v=57');await loadScript('lunar-phase.js?v=57');});
  await step('Aligning planetary rotation',86,async()=>{const m=await mod('./spin-config.js?v=57');window.Elev8SpinTable=m.toSpinTable();});
  await step('Preparing the reading table',88,async()=>{for(const s of ['tarot-deck.js','deck-config.js','tarot.js','form-config.js','reading-contact.js','payment-config.js','booking.js','reading-help.js','navigation.js']){if(cancelled)return;await loadScript(`${s}?v=57`);}});
  await step('Building atmosphere and depth',91,()=>loadScript('world-effects.js?v=57'));
  await step('Rendering the 3D planets',94,()=>mobile?undefined:mod('./space-realism.js?v=57'));
  window.Elev8Motion?.releaseBoot?.();
  await step('Applying the v57 experience layer',97,async()=>{await loadScript('v36.js?v=57');await loadScript('audio-gate.js?v=57');});
}
async function warmup(){
  if(cancelled)return;entrance.setProgress(98,'Warming the 3D scene');
  try{await timeout(window.Elev8PhotoMotion?.globeReady??Promise.resolve(),5000,'Earth texture warm-up');}catch(error){failures.push({stage:'earth-warmup',error:String(error)});}
  try{await timeout(document.fonts?.ready??Promise.resolve(),3000,'Font warm-up');}catch(error){failures.push({stage:'font-warmup',error:String(error)});}
  try{window.Elev8SpaceGL?.warmup?.();}catch(error){failures.push({stage:'space-warmup',error:String(error)});}
  await frame();await frame();
}
async function run(){
  const hardStop=setTimeout(()=>{
    if(cancelled)return;cancelled=true;controllers.forEach(c=>c.abort());console.warn('v57 preloader safety release');
    boot.release();entrance.failOpen('Opening the table');
  },45000);
  try{
    entrance.setProgress(2,'Reading the sky manifest');
    await pool(network,mobile?2:3);if(cancelled)return;
    entrance.setProgress(69,'Decoding the celestial textures');
    const images=visual.filter(x=>/\.(webp|png)(\?|$)/i.test(x.url)&&(mobile?!/space\/|earth-|milkyway|moon-normal/.test(x.url):true));
    for(let i=0;i<images.length&&!cancelled;i++){entrance.setProgress(69+(i+1)/images.length*3,`Decoding textures · ${i+1}/${images.length}`);await decodeImage(images[i].url);await idle();}
    if(cancelled)return;await execute();if(cancelled)return;await warmup();if(cancelled)return;
    entrance.setProgress(100,'Opening the sky');
    if(entrance.whenSmooth) await entrance.whenSmooth();
    if(cancelled)return;
    try{await timeout(window.Elev8AudioGate?.ensure(true)??Promise.resolve(),8000,'528 Hz');}catch(_){}
    boot.release();await frame();await entrance.reveal();
  }catch(error){console.error('v57 boot error:',error);failures.push({stage:'boot',error:String(error)});cancelled=true;controllers.forEach(c=>c.abort());boot.release();entrance.failOpen('Opening the table');}
  finally{clearTimeout(hardStop);clearTimeout(window.elev8miBootSafety);document.documentElement.dataset.elev8miVersion=VERSION;}
}
run();
})();
