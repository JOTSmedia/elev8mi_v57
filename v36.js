(() => {
'use strict';
const VERSION='57'; document.documentElement.dataset.elev8miVersion=VERSION;
// Sky-driven palette shared by logo + 528Hz equalizer.
let skyPhase='';
function syncSky(){const phase=window.elev8miCelestial?.phase||'night';if(phase===skyPhase)return;skyPhase=phase;document.documentElement.dataset.skyPhase=phase;}
setInterval(syncSky,1000);syncSky();
// Location controller. NYC is the explicit default used by the sidereal view.
const DEFAULT={lat:40.7128,lon:-74.0060,label:'New York City'};let loc={...DEFAULT};try{loc={...loc,...JSON.parse(localStorage.getItem('elev8mi-location')||'{}')}}catch(_){}
window.Elev8Location={get current(){return {...loc}},set(v){loc={...loc,...v};try{localStorage.setItem('elev8mi-location',JSON.stringify(loc))}catch(_){};window.dispatchEvent(new CustomEvent('elev8mi:location',{detail:loc}));updateEarth();}};
function updateEarth(){const e=document.querySelector('.earth-location');if(!e)return;const where=loc.label||`${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}`;const label=`Sky view from ${where}. Change location`;if(e.dataset.where!==where){e.dataset.where=where;const safe=where.replace(/[&<>]/g,c=>'&#'+c.charCodeAt(0)+';');e.innerHTML=`<span class="view-from">VIEW FROM · ${safe}</span><span class="view-change">Change location</span>`;}if(e.getAttribute('aria-label')!==label)e.setAttribute('aria-label',label);const card=document.querySelector('.hero-copy');if(card&&e.parentElement===card.parentElement)e.style.top=(card.offsetTop-e.offsetHeight-12)+'px';}
const dlg=document.createElement('dialog');dlg.id='locationDialog';dlg.innerHTML='<button id="locationClose" type="button" aria-label="Close">×</button><h2>Your view of the sky</h2><p>The stars turn for where you are. Use your location, or enter a zip code or address.</p><div class="location-actions"><button id="useLocation" type="button">Use my location</button><p class="location-or">or</p><input id="locQuery" aria-label="Zip code or address" placeholder="Zip code or address" autocomplete="postal-code" enterkeyhint="search"><button id="setLocation" type="button">Set view</button></div><p id="locationStatus" class="location-status" role="status"></p>';document.body.append(dlg);
function openLoc(){const input=dlg.querySelector('#locQuery');input.value='';dlg.querySelector('#locationStatus').textContent='';dlg.showModal?.();input.focus();}
const BODIES={
  Sun:{kicker:'Star',meaning:'The heart of this sky.',myth:'Every orbit here is drawn around the Sun. Its light gilds the horizon at dawn, and it is the light the Moon only borrows.',facts:[['Diameter','1.39 million km'],['Light-time','about 8 minutes'],['Type','G-type star']]},
  Moon:{kicker:'Moon',meaning:'Earth\'s companion.',myth:'The Moon keeps one face toward us. What changes is the angle of the Sun, which is why the same globe can be a thread, a half, or a full coin.',facts:[['Diameter','3,475 km'],['Orbit','27.3 days'],['Distance','384,400 km']]},
  Mercury:{kicker:'Planet',meaning:'The swift one.',myth:'Mercury never wanders far from the Sun in our sky. A year there is only 88 days, and its day is longer than its year.',facts:[['Diameter','4,879 km'],['Orbit','88 days'],['Moons','none']]},
  Venus:{kicker:'Planet',meaning:'The evening star.',myth:'Venus is the brightest planet. A thick cloud deck hides a surface hot enough to melt lead, and it spins backward, slowly.',facts:[['Diameter','12,104 km'],['Orbit','225 days'],['Moons','none']]},
  Earth:{kicker:'Planet · your view',meaning:'Home, and the center of this sky view.',myth:'The stars on this page are turned for a place on Earth. Change the view and the whole sky rotates with your longitude.',facts:[['Diameter','12,756 km'],['Orbit','365.2 days'],['Moon','1']]},
  Mars:{kicker:'Planet',meaning:'The red world.',myth:'Iron dust colors Mars. It has seasons, polar caps, and two small moons, Phobos and Deimos, racing close above the ground.',facts:[['Diameter','6,792 km'],['Orbit','687 days'],['Moons','Phobos, Deimos']]},
  Jupiter:{kicker:'Planet',meaning:'The giant.',myth:'Jupiter outweighs the rest of the planets combined. Its Great Red Spot is a storm wider than Earth, and it keeps a court of moons.',facts:[['Diameter','142,984 km'],['Orbit','11.9 years'],['Moons','95 known']]},
  Saturn:{kicker:'Planet',meaning:'The ringed one.',myth:'Saturn\'s rings are ice and rock, wide and thin. The globe is a pale gas world, and Titan, its largest moon, wears a thick orange haze.',facts:[['Diameter','120,536 km'],['Orbit','29.5 years'],['Rings','ice and rock']]},
  Uranus:{kicker:'Planet',meaning:'The tipped world.',myth:'Uranus rolls on its side, so its seasons last decades. Methane in the air makes the pale blue-green color.',facts:[['Diameter','51,118 km'],['Orbit','84 years'],['Tilt','about 98°']]},
  Neptune:{kicker:'Planet',meaning:'The far blue.',myth:'Neptune is the last of the great planets. Wind there is the fastest in the solar system, and it takes 165 years to circle the Sun once.',facts:[['Diameter','49,528 km'],['Orbit','165 years'],['Found','1846, by math']]},
};
const bodyPopup=document.createElement('div');bodyPopup.id='bodyPopup';bodyPopup.className='cg-popup';bodyPopup.setAttribute('role','dialog');bodyPopup.setAttribute('aria-modal','false');bodyPopup.hidden=true;document.body.append(bodyPopup);
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
function closeBody(restore){if(bodyPopup.hidden)return;bodyPopup.hidden=true;bodyPopup.classList.remove('is-open');if(restore&&bodyPopup._focus)bodyPopup._focus.focus?.();}
function openBody(name,point,source){
  const d=BODIES[name];if(!d)return;
  bodyPopup._focus=source||document.activeElement;
  const facts=d.facts.slice();
  if(name==='Moon'&&window.Elev8Moon?.state){const st=window.Elev8Moon.state;facts.unshift(['Tonight',`${st.name||'Live phase'} · ${Math.round((st.illuminated||0)*100)}% lit`]);}
  if(name==='Earth')facts.unshift(['View from',loc.label||'New York City']);
  bodyPopup.innerHTML=`<button type="button" class="cg-close" aria-label="Close">×</button><p class="cg-kicker">${esc(d.kicker)}</p><h2>${esc(name)}</h2><p class="cg-meaning">${esc(d.meaning)}</p><p class="cg-myth">${esc(d.myth)}</p><dl>${facts.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${name==='Earth'?'<button type="button" class="cg-action" id="bodySetView">Change location</button>':''}`;
  bodyPopup.querySelector('.cg-close').addEventListener('click',()=>closeBody(true));
  bodyPopup.querySelector('#bodySetView')?.addEventListener('click',()=>{closeBody(false);openLoc();});
  bodyPopup.hidden=false;bodyPopup.classList.remove('is-open');
  bodyPopup.style.left='50%';bodyPopup.style.top='50%';bodyPopup.style.transform='translate(-50%,-50%)';
  requestAnimationFrame(()=>bodyPopup.classList.add('is-open'));
}
document.addEventListener('click',e=>{
  if(e.target.closest('#bodyPopup'))return;
  const sun=e.target.closest('#horizonSun');
  const sigil=e.target.closest('.hero-sigil');
  const planet=e.target.closest('.solar-body');
  if(sigil){e.preventDefault();if(skipBrand){skipBrand=false;return;}openBrand();return;}
  if(sun&&!planet){e.preventDefault();openBody('Sun',{x:e.clientX,y:e.clientY},sun);return;}
  if(!planet){if(!bodyPopup.hidden)closeBody(false);return;}
  e.preventDefault();
  const name=planet.classList.contains('solar-moon')?'Moon':planet.dataset.planet;
  openBody(name,{x:e.clientX,y:e.clientY},planet);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeBody(true);
  if((e.key==='Enter'||e.key===' ')&&e.target.classList?.contains('hero-sigil')){e.preventDefault();openBrand();}
});
const brand=document.getElementById('brandDialog');
let skipBrand=false;
function openBrand(){
  if(document.documentElement.classList.contains('elev8-hero-full')||document.documentElement.classList.contains('elev8-preloading'))return;
  if(!brand||brand.open)return;
  closeBody(false);window.Elev8Constellations?.close?.();
  brand.showModal();
}
brand?.querySelector('#closeBrand')?.addEventListener('click',()=>brand.close());
function chooseReading(value){const input=document.querySelector(`#bookingForm input[name="reading"][value="${value}"]`);if(!input)return;input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));}
document.addEventListener('click',e=>{const link=e.target.closest('a[data-reading], #brandDialog a[href="#book"]');if(!link)return;if(link.dataset.reading)chooseReading(link.dataset.reading);if(brand?.open)brand.close();});
const sigil=document.querySelector('.hero-sigil');if(sigil){sigil.tabIndex=0;sigil.setAttribute('role','button');sigil.setAttribute('aria-label','ELEV8MI. About this practice');}dlg.querySelector('#locationClose').onclick=()=>dlg.close();
function popupHit(e){const box=e.target.closest?.('.cg-popup, dialog');if(!box)return false;const r=box.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
function anyPopup(){const cg=document.getElementById('constellationPopup');return !bodyPopup.hidden||!!(cg&&!cg.hidden)||!!document.querySelector('dialog[open]');}
function closeOpenPopups(){if(!anyPopup())return;if(!bodyPopup.hidden)closeBody(false);window.Elev8Constellations?.close?.();document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch(_){}});}
document.addEventListener('pointerdown',e=>{if(e.target.closest?.('.hero-sigil')&&brand?.open)skipBrand=true;if(!popupHit(e))closeOpenPopups();},true);
addEventListener('wheel',e=>{if(!popupHit(e))closeOpenPopups();},{passive:true});
addEventListener('scroll',e=>{if(e.target?.closest?.('.cg-popup, dialog'))return;closeOpenPopups();},true);
addEventListener('touchmove',e=>{if(!popupHit(e))closeOpenPopups();},{passive:true});
async function placeQuery(){const status=dlg.querySelector('#locationStatus'),q=dlg.querySelector('#locQuery').value.trim();if(!q){status.textContent='Enter a zip code or address.';return}status.textContent='Finding that place…';try{let found;if(/^\d{5}(?:-\d{4})?$/.test(q)){const r=await fetch('https://api.zippopotam.us/us/'+q.slice(0,5));if(!r.ok)throw new Error('zip');const place=(await r.json()).places?.[0];if(!place)throw new Error('zip');found={lat:+place.latitude,lon:+place.longitude,label:`${place['place name']}, ${place['state abbreviation']||place.state}`}}else{const r=await fetch('https://photon.komoot.io/api/?limit=1&q='+encodeURIComponent(q));if(!r.ok)throw new Error('place');const f=(await r.json()).features?.[0];if(!f)throw new Error('place');const [lon,lat]=f.geometry.coordinates,p=f.properties||{};found={lat,lon,label:[p.name,p.state||p.country].filter((v,i,a)=>v&&a.indexOf(v)===i).slice(0,2).join(', ')||q}}if(!Number.isFinite(found.lat)||!Number.isFinite(found.lon))throw new Error('place');window.Elev8Location.set(found);status.textContent='View updated.';setTimeout(()=>dlg.close(),350)}catch(_){status.textContent='That place could not be found. Try a zip code or a city.'}}
dlg.querySelector('#setLocation').onclick=placeQuery;
dlg.querySelector('#locQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();placeQuery()}});
dlg.querySelector('#useLocation').onclick=()=>{const status=dlg.querySelector('#locationStatus');if(!navigator.geolocation){status.textContent='Location sharing is unavailable in this browser.';return}status.textContent='Requesting your location…';navigator.geolocation.getCurrentPosition(p=>{const lat=p.coords.latitude,lon=p.coords.longitude;window.Elev8Location.set({lat,lon,label:'My location'});status.textContent='Location updated.';setTimeout(()=>dlg.close(),350)},()=>status.textContent='Location permission was not granted.',{enableHighAccuracy:false,timeout:9000,maximumAge:600000})};
const earthWatch=new MutationObserver(updateEarth);earthWatch.observe(document.getElementById('solarBodies')||document.body,{childList:true,subtree:true});updateEarth();
// One continuous sky angle. The boot sidereal clock owns Elev8Sky.rotation
// every frame; a second writer here was snapping the night sky back.
window.addEventListener('elev8mi:location',()=>window.Elev8Sky&&(window.Elev8Sky.lon=loc.lon));
if(window.Elev8Sky)window.Elev8Sky.lon=loc.lon;
})();
