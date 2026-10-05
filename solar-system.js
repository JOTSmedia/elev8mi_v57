(() => {
  'use strict';
  const root = document.getElementById('solarSystem');
  const host = document.getElementById('solarBodies');
  const canvas = document.getElementById('orbitPaths');
  const detail = document.getElementById('planetDetail');
  const risingSun = document.getElementById('horizonSun');
  if (risingSun && root && risingSun.parentElement !== root) root.insertBefore(risingSun, root.querySelector('.hero-sigil'));
  if (!root || !host || !canvas || !window.Elev8Motion) return;
  const ctx = canvas.getContext('2d');
  // NASA/NSSDCA Planetary Fact Sheet: km, days, eccentricity, inclination.
  // Initial orbital phases come from Astronomy Engine. Distances and time
  // are compressed for display; this is an illustrative solar-system view.
  const planets = [
    ['Mercury',4879,88,.206,7,.30, .3],
    ['Venus',12104,224.7,.007,3.4,.37, 2.2],
    ['Earth',12756,365.2,.017,0,.44, 4.8],
    ['Mars',6792,687,.094,1.8,.52, 3.4],
    ['Jupiter',142984,4331,.049,1.3,.65, .8],
    ['Saturn',120536,10747,.052,2.5,.77, 3.8],
    ['Uranus',51118,30589,.047,.8,.89, 5.7],
    ['Neptune',49528,59800,.010,1.8,1, 2.5]
  ];
  const TAU = Math.PI * 2;
  // Visible but gentle motion, with separate orbital, axial and daylight clocks.
  // Real relative periods are preserved; the display remains time-compressed.
  const orbitRate = .4;
  const earthYearSeconds = 7 / orbitRate;
  const moonOrbitSeconds = 24 / .7 / orbitRate;
  // Surface rotation is independent of the orbital and weather clocks.
  const earthSpinSeconds = 360;
  // Always open at midnight with the Moon on the near side, above Earth.
  // Its live phase controls the illuminated texture only; it must not make
  // a fresh visit start in daylight or place the Moon behind the globe.
  const moonOrbitPhase=0;
  let width = 0, height = 0, radius = 0, diameterScale = 0, shortLandscape = false, mobileOrbitFrame = false;
  let moonHalf = 29;
  let visible = true, inspecting = false, localTime = 0, stillFrame = 0;
  let earthPoint = {x:0,y:0,depth:0};
  let viewRotation=0,sunY=0,rootDocumentTop=0,rootDocumentLeft=0,lastTracks=-1,tracksDirty=true,lastMoonVisibility=null,lastGlow='',lastSkyCss='',lastLoadSnap=-1;
  let sinPitch=0,cosPitch=1,sinRoll=0,cosRoll=1,cameraDistance=1,horizontalFit=1,openingGap=1,stageHeight=0,earthScreenRadius=1;
  // Reuse the small lighting vectors. Coordinates are hero pixels, Y down,
  // with positive Z toward the viewer, matching the orbit's depth convention.
  const heroSun={x:0,y:0,z:0},moonPosition={x:0,y:0,z:0};
  const planetPositions=Object.fromEntries(planets.map(p=>[p[0],{x:0,y:0,z:0,displayX:0,displayY:0,perspective:1,depthCue:.5,behindEarth:true,visible:true}]));
  const photo=document.querySelector(".journey-plate img");
  const apsides=[77.46,131.60,102.94,336.06,14.75,92.43,170.96,44.97];
  const distances=[.387,.723,1,1.524,5.203,9.537,19.191,30.069];
  planets.forEach((p,i)=>{
    // Foreground Earth is an enlargement. Radial distances are compressed
    // to frame the tilted plane without turning phone orbits into tall hoops.
    p[5]=[.52,.77,.94,.955,.97,.98,.99,1][i];
    if(window.Astronomy){
      const longitude=window.Astronomy.Ecliptic(window.Astronomy.HelioVector(p[0],new Date())).elon*Math.PI/180;
      const trueAnomaly=longitude-apsides[i]*Math.PI/180;
      const E=2*Math.atan2(Math.sqrt(1-p[3])*Math.sin(trueAnomaly/2),Math.sqrt(1+p[3])*Math.cos(trueAnomaly/2));
      p[6]=E-p[3]*Math.sin(E);
    }
  });
  const bodies = planets.map((planet, i) => {
    const [name,diameter,period] = planet;
    const button = document.createElement('button');
    button.dataset.planet=name;button.className = 'solar-body'; button.type = 'button';
    button.setAttribute('aria-label', `${name}: diameter ${diameter.toLocaleString()} kilometers, orbital period ${period.toLocaleString()} days`);
    const img = new Image(); img.src = `assets/${name.toLowerCase()}.webp`;
    img.className = name === 'Saturn' ? 'planet-ringed' : 'planet-disc';
    img.alt = ''; img.draggable = false; img.decoding = 'async';
    const model=document.createElement('span');model.className='planet-model';model.setAttribute('aria-hidden','true');model.append(img);
    button.append(model); host.append(button);
    if(name === "Earth"){img.hidden=true;button.classList.add("earth-location");button.textContent="VIEW FROM · NEW YORK CITY";const card=document.querySelector(".hero-copy");if(card)card.parentElement.insertBefore(button,card);}
    const show = () => {
      inspecting = true;
      detail.replaceChildren();
      const portrait = img.cloneNode(); portrait.className += ' planet-portrait'; portrait.hidden=false; portrait.style.width='54px';
      portrait.style.visibility='visible';
      // Same wording as v31; the name and figures are separate spans for the style audit.
      const copy = document.createElement('span');
      const label = document.createElement('span'); label.className = 'planet-detail-name'; label.textContent = name;
      const figures = document.createElement('span'); figures.className = 'planet-detail-figures';
      figures.textContent = ` · ${diameter.toLocaleString()} km · ${period.toLocaleString()} days${name === 'Earth' ? ' · Moon in orbit' : ''}`;
      copy.append(label, figures);
      detail.append(portrait, copy); detail.classList.add('is-visible');
    };
    const hide = () => { inspecting = false; detail.classList.remove('is-visible'); };
    button.addEventListener('pointerenter', show);
    button.addEventListener('pointerleave', () => { if(document.activeElement !== button) hide(); });
    button.addEventListener('focus', show); button.addEventListener('blur', hide);
    return {planet, button, img, model, perihelion:apsides[i]*Math.PI/180};
  });
  const moon = document.createElement('button'); moon.type = 'button'; moon.className = 'solar-body solar-moon';
  moon.setAttribute('aria-label','Moon: diameter 3,475 kilometers; orbits Earth every 27.3 days');
  const moonImage=document.createElement('canvas');moonImage.className='orbit-moon-disc';moon.append(moonImage);host.append(moon);
  const paintMoon=()=>window.Elev8Moon?.render(moonImage,58);
  window.addEventListener('elev8mi:moon',()=>{paintMoon();scheduleStill();});paintMoon();
  function showMoon() {
    inspecting=true;detail.replaceChildren();
    const portrait=document.createElement('canvas');portrait.className='planet-portrait';window.Elev8Moon?.render(portrait,54);
    const text=document.createElement('span');const label=document.createElement('span');label.className='planet-detail-name';label.textContent='Moon';const figures=document.createElement('span');figures.className='planet-detail-figures';figures.textContent=` · ${window.Elev8Moon?.state?.name || 'Live lunar phase'} · ${Math.round((window.Elev8Moon?.state?.illuminated || 0)*100)}% illuminated`;text.append(label,figures);
    detail.append(portrait,text);detail.classList.add('is-visible');
  }
  moon.addEventListener('pointerenter',showMoon);moon.addEventListener('pointerleave',()=>{if(document.activeElement!==moon){inspecting=false;detail.classList.remove('is-visible');}});moon.addEventListener('focus',showMoon);
  moon.addEventListener('blur',()=>{inspecting=false;detail.classList.remove('is-visible');});

  function position(body, eccentricAnomaly) {
    const p=body.planet, a=radius*p[5], e=p[3], angle=body.perihelion+viewRotation;
    const x=a*(Math.cos(eccentricAnomaly)-e);
    const z=a*Math.sqrt(1-e*e)*Math.sin(eccentricAnomaly);
    const rx=x*Math.cos(angle)-z*Math.sin(angle);
    const rz=x*Math.sin(angle)+z*Math.cos(angle);
    // Rotate the orbital plane in 3D, then use the same perspective divide
    // for its path and moving body. Earth/Sun's axis stays centered on screen.
    const wy=rx*Math.sin(p[4]*Math.PI/180);
    const cx=rx*cosRoll-wy*sinRoll,cy=rx*sinRoll+wy*cosRoll;
    const screenY=rz*sinPitch+cy*cosPitch,depth=rz*cosPitch-cy*sinPitch;
    const perspective=cameraDistance/Math.max(radius*.025,cameraDistance-depth);
    const room=Math.max(72,Math.min(height*.58,(stageHeight||height)-sunY-28));
    const planeFit=Math.min(1,room/Math.max(1,radius*Math.max(Math.abs(sinPitch),.2)));
    return {x:width/2+cx*perspective*horizontalFit*planeFit,y:sunY+screenY*perspective*planeFit,depth,perspective};
  }
  function fitTracks(){
    // Enclose each eccentric orbit in a Sun-centered circle, then fit that
    // circle's perspective projection. The same horizontal lens applies to
    // tracks and bodies; the centered Sun/Earth axis keeps its vertical anchor.
    let furthestDepth=0;
    bodies.forEach(({planet:p})=>{
      const reach=radius*p[5]*(1+p[3]);
      const tilt=sinRoll+Math.sin(p[4]*Math.PI/180)*cosRoll;
      furthestDepth=Math.max(furthestDepth,reach*Math.hypot(tilt*sinPitch,cosPitch));
    });
    cameraDistance=Math.max(cameraDistance,furthestDepth+radius*.025);
    let projectedWidth=1;
    bodies.forEach(({planet:p})=>{
      const reach=radius*p[5]*(1+p[3]),inclination=Math.sin(p[4]*Math.PI/180);
      const u=cosRoll-inclination*sinRoll,dX=-(sinRoll+inclination*cosRoll)*sinPitch,dZ=cosPitch;
      const denominator=cameraDistance*cameraDistance-reach*reach*(dX*dX+dZ*dZ);
      const center=u*reach*reach*cameraDistance*dX/denominator;
      const halfWidth=Math.abs(u)*reach*cameraDistance*Math.sqrt(Math.max(0,cameraDistance*cameraDistance-reach*reach*dZ*dZ))/denominator;
      projectedWidth=Math.max(projectedWidth,Math.abs(center)+halfWidth);
    });
    horizontalFit=Math.min(1,Math.max(1,width*.5-18)/projectedWidth);
  }
  function limbAt(x){
    const dx=rootDocumentLeft+x-innerWidth*.5;
    return earthPoint.y+earthScreenRadius-Math.sqrt(Math.max(0,earthScreenRadius*earthScreenRadius-dx*dx));
  }
  function earthClip(x,y){
    // Use the renderer's exact sphere silhouette across the whole sprite,
    // including rings and halos. No tangent line cuts through the planet.
    const points=['-100px -100px','144px -100px'];
    for(let step=0;step<=10;step++){const offset=122-step*24.4;points.push(`${(22+offset).toFixed(2)}px ${(22+limbAt(x+offset)-y).toFixed(2)}px`);}
    return `polygon(${points.join(',')})`;
  }
  function anomaly(mean,e) {
    let value=mean;
    for(let i=0;i<6;i++) value-=(value-e*Math.sin(value)-mean)/(1-e*Math.cos(value));
    return value;
  }
  function smoothstep(low,high,value) {
    const t=Math.max(0,Math.min(1,(value-low)/(high-low)));
    return t*t*(3-2*t);
  }
  function scheduleStill() {
    if(stillFrame)return;
    // Journey registers its geometry update first. This frame redraw follows
    // that update, without adding elapsed time to the orbital clock.
    stillFrame=requestAnimationFrame(()=>{
      stillFrame=0;draw();window.Elev8PlanetLighting?.refresh();
    });
  }
  function drawTracks(){
    if(!ctx)return;ctx.clearRect(0,0,width,stageHeight);
    const loading=!document.body.classList.contains('live');
    const load=loading?Math.max(0,Math.min(1,Number(window.elev8miLoadProgress)||0)):1;
    const pulse=.82+.18*Math.sin(localTime*TAU/7.8);
    ctx.lineCap='round';ctx.lineJoin='round';
    let low=sunY;
    bodies.forEach(body=>{
      ctx.setLineDash([]);ctx.beginPath();
      for(let step=0;step<=128;step++){const point=position(body,step/128*TAU);if(point.y>low)low=point.y;if(step)ctx.lineTo(point.x,point.y);else ctx.moveTo(point.x,point.y);}
      ctx.strokeStyle=`rgba(185,200,235,${(.018*pulse).toFixed(3)})`;ctx.lineWidth=.55;ctx.stroke();
      for(const front of [false,true]){
        ctx.beginPath();let connected=false;
        for(let i=0;i<=128;i++){const point=position(body,i/128*TAU);
          if((point.depth>0)!==front){connected=false;continue;}
          if(connected)ctx.lineTo(point.x,point.y);else ctx.moveTo(point.x,point.y);connected=true;
        }
        const alpha=(front?.22:.085)*pulse*(body.planet[0]==='Earth'?1.35:1);
        ctx.strokeStyle=`rgba(${body.planet[0]==='Earth'?'151,214,255':'201,185,248'},${alpha.toFixed(3)})`;
        ctx.setLineDash(front?[]:[2,5]);ctx.lineWidth=front?.9:.6;ctx.stroke();
      }
    });ctx.setLineDash([]);
    if(loading){
      const n=Math.round(128*load);
      if(n>=1){
        ctx.save();ctx.lineCap='round';ctx.shadowColor='#f3d78a';ctx.shadowBlur=6+16*load;ctx.globalAlpha=.45+.5*load;ctx.lineWidth=.8+1.3*load;
        bodies.forEach(body=>{
          ctx.beginPath();
          for(let step=0;step<=n;step++){const point=position(body,(step/128)*TAU);if(step)ctx.lineTo(point.x,point.y);else ctx.moveTo(point.x,point.y);}
          ctx.strokeStyle=body.planet[0]==='Earth'?'#7fdcff':'#c9a6ff';ctx.stroke();
        });
        ctx.restore();
      }
    }
    if(earthScreenRadius>1){ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();
      ctx.arc(innerWidth*.5-rootDocumentLeft,earthPoint.y+earthScreenRadius,earthScreenRadius,0,TAU);ctx.fill();ctx.restore();}
    if(loading){
      const w=root.offsetWidth,h=root.offsetHeight;
      if(w>80&&h>80){
        let ox=0,oy=0;for(let n=root;n;n=n.offsetParent){ox+=n.offsetLeft;oy+=n.offsetTop;}
        ox-=window.scrollX;oy-=window.scrollY;
        const scale=Math.max(innerWidth/w,innerHeight/h);
        const screen=(oy+h/2)+(innerHeight/2-(oy+h/2))+(low-h/2)*scale;
        const top=Math.min(innerHeight-78,Math.max(screen+16,innerHeight*.42));
        document.documentElement.style.setProperty('--load-ui-top',`${Math.round(top)}px`);
      }
    }
    tracksDirty=false;lastTracks=localTime;
  }
  function draw() {
    if(!width||!height)return;
    // Rotate the viewing frame with Earth, keeping the photographed foreground
    // Earth anchored. Other planets move relative to Earth in this view.
    const earth=bodies[2],pEarth=earth.planet;
    const earthMean=pEarth[6]+localTime*TAU/earthYearSeconds;
    const E=anomaly(earthMean,pEarth[3]);
    const trueAngle=Math.atan2(Math.sqrt(1-pEarth[3]**2)*Math.sin(E),Math.cos(E)-pEarth[3]);
    viewRotation=Math.PI/2-earth.perihelion-trueAngle;
    const rootTop=rootDocumentTop-window.scrollY;
    const state=window.elev8miJourney;
    let horizon=innerHeight*.56;
    if(state&&photo?.naturalWidth){
      const scale=Math.max(innerWidth/photo.naturalWidth,state.plateHeight/photo.naturalHeight);
      const dh=photo.naturalHeight*scale;
      horizon=(state.plateHeight-dh)/2+dh*.52-state.camera;
      earthScreenRadius=2.4*dh;
    }
    const earthRadius=radius*pEarth[5]*(1-pEarth[3]*Math.cos(E));
    // A phone uses a wide, oblique orbital plane viewed from outside the
    // system. Forcing its miniature Earth orbit down to the enlarged globe's
    // horizon placed the camera too close and turned its ellipses into hoops.
    // The foreground enlargement and lunar arc keep their original landmark.
    // Desktop retains its original Earth-anchored viewing geometry.
    cameraDistance=mobileOrbitFrame?radius*2.65:Math.max(radius*.72,openingGap*earthRadius*cosPitch/Math.max(1,openingGap-earthRadius*sinPitch));
    fitTracks();
    earthPoint={x:width/2,y:horizon-rootTop,depth:cameraDistance-radius*.02};
    const loading=!document.body.classList.contains('live');
    const load=loading?Math.max(0,Math.min(1,Number(window.elev8miLoadProgress)||0)):1;
    const loadSnap=Math.round(load*100);
    if(loadSnap!==lastLoadSnap){lastLoadSnap=loadSnap;tracksDirty=true;}
    const appear=loading?Math.max(0,Math.min(1,(load-.06)/.28)):1;
    if(tracksDirty||localTime-lastTracks>=1/10||loading)drawTracks();
    bodies.forEach(body=>{
      const p=body.planet;
      const mean=p[6]+localTime*TAU/(earthYearSeconds*(p[2]/365.2));
      const point=p[0]==='Earth'?earthPoint:position(body,anomaly(mean,p[3]));
      body.orbitPoint=point;
      const lightPoint=planetPositions[p[0]];lightPoint.x=point.x;lightPoint.y=point.y;lightPoint.z=point.depth;
      lightPoint.perspective=point.perspective||1;
      lightPoint.depthCue=smoothstep(-radius*.72,radius*.72,point.depth);
      // Positive depth faces Earth, so only that near arc crosses in front of
      // the Sun. Everything else — most of every orbit — stays behind it.
      // The location marker and the Moon stay forward: Earth is the viewpoint,
      // and the Moon is the nearest body.
      const depthN=Math.max(-1,Math.min(1,point.depth/(radius*1.3)));
      const behind=depthN<=.06;
      const z=p[0]==='Earth'?36:(behind?Math.round(8+(depthN+1)*12):Math.round(48+depthN*14));
      body.button.style.zIndex=String(z);
      body.displayScale=p[0]==='Earth'?1:Math.max(.48,Math.min(2.25,point.perspective));
      body.button.style.setProperty('--planet-perspective',body.displayScale.toFixed(4));
      body.button.dataset.displayScale=body.displayScale.toFixed(4);
      body.button.style.opacity=String(p[0]==='Earth'?1:appear);
      body.model.style.filter=p[0]==='Earth'?'':`blur(${((1-lightPoint.depthCue)*.18).toFixed(3)}px) brightness(${(.74+.26*lightPoint.depthCue).toFixed(3)})`;
    });
    // Clockwise day arc, shared with the sky clock. The Sun rises on the left,
    // crosses the apex, and sets on the right. The Moon takes that same arc
    // only after the Sun has gone, so the two never share the hero.
    const angle=moonOrbitPhase-Math.PI/2+localTime*TAU/moonOrbitSeconds;
    const skySpot=hour=>{
      const alt=Math.sin(hour),across=-Math.cos(hour);
      const apexDoc=window.Elev8HeroApex?.apex?.moonY;
      const peak=Number.isFinite(apexDoc)?apexDoc-window.scrollY-rootTop:Math.max(8,sunY*.35);
      const ground=horizon-rootTop;
      return {x:width/2+across*Math.min(width*.42,480),y:ground-Math.max(0,alt)*(ground-peak),alt,fade:Math.max(0,Math.min(1,(alt+.02)/.16))};
    };
    const sunSpot=skySpot(angle),moonSpot=skySpot(angle+Math.PI);
    const mx=moonSpot.x,my=moonSpot.y;
    moon.style.transform=`translate3d(${mx-22}px,${my-22}px,0)`;
    moon.style.clipPath='none';
    const rear=false;
    const visibleHeight=moonSpot.fade>0?moonHalf*2:0;
    const moonVisible=moonSpot.fade>.04;
    if(!moonVisible&&document.activeElement===moon){moon.blur();inspecting=false;detail.classList.remove('is-visible');}
    if(moonVisible!==lastMoonVisibility){moon.style.pointerEvents=moonVisible?'auto':'none';moon.tabIndex=moonVisible?0:-1;moon.setAttribute('aria-hidden',moonVisible?'false':'true');lastMoonVisibility=moonVisible;}
    const appearBody=!document.body.classList.contains('live')?Math.max(0,Math.min(1,((Number(window.elev8miLoadProgress)||0)-.06)/.28)):1;
    moon.style.opacity=(moonSpot.fade*appearBody).toFixed(3);
    moon.style.zIndex='72';
    const sunDx=sunSpot.x-mx,sunDy=sunSpot.y-my,sunLen=Math.hypot(sunDx,sunDy)||1;
    moon.style.setProperty('--moon-lx',`${(-sunDx/sunLen*5).toFixed(1)}px`);
    moon.style.setProperty('--moon-ly',`${(-sunDy/sunLen*5).toFixed(1)}px`);
    // Bodies sit exactly on their projected orbits. No spacing or anti-overlap
    // nudges: planets at different depths may overlap and occlude each other.
    const markers=bodies.map(body=>({body,x:body.orbitPoint.x,y:body.orbitPoint.y,r:body.displayRadius*body.displayScale,fixed:body.planet[0]==='Earth'}));
    markers.forEach(marker=>{
      const body=marker.body;if(!body)return;
      const lightPoint=planetPositions[body.planet[0]];lightPoint.displayX=marker.x;lightPoint.displayY=marker.y;
      if(body.planet[0]!=='Earth')body.button.style.transform=`translate3d(${marker.x-22}px,${marker.y-22}px,0)`;
      if(body.planet[0]==='Earth')return;
      const limb=limbAt(marker.x),behindEarth=body.orbitPoint.depth<earthPoint.depth;
      const visible=(!behindEarth||marker.y-marker.r<limb)&&marker.x+marker.r>0&&marker.x-marker.r<width&&marker.y+marker.r>0&&marker.y-marker.r<stageHeight;
      lightPoint.behindEarth=behindEarth;lightPoint.visible=visible;
      body.button.style.visibility=visible?'visible':'hidden';body.button.tabIndex=visible?0:-1;body.button.setAttribute('aria-hidden',String(!visible));
      body.button.style.clipPath=behindEarth?earthClip(marker.x,marker.y):'none';
      if(!visible&&document.activeElement===body.button){body.button.blur();inspecting=false;detail.classList.remove('is-visible');}
    });
    // Dawn and dusk follow the Sun. It rises on the left and sets on the right;
    // the Moon is on the opposite half of the same arc, so it appears as the
    // Sun leaves and the sky falls from day through twilight into night.
    let solarAltitude=sunSpot.alt;
    let sunRising=Math.cos(angle)>0;
    let sunAzimuth=Math.max(0,Math.min(1,(rootDocumentLeft-window.scrollX+sunSpot.x)/innerWidth));
    let daylight=smoothstep(-.04,.58,solarAltitude);
    let twilight=Math.exp(-(solarAltitude*solarAltitude)/.04);
    let sunrise=sunRising?twilight:0,sunset=sunRising?0:twilight;
    let phase=twilight>.42?(sunRising?'sunrise':'sunset'):(solarAltitude>.1?'day':'night');
    const blend=window.elev8miSkyBlend||(window.elev8miSkyBlend={daylight:0,twilight:0,sunrise:0,sunset:0});
    const glide=0.18;
    blend.daylight+=(daylight-blend.daylight)*glide;blend.twilight+=(twilight-blend.twilight)*glide;blend.sunrise+=(sunrise-blend.sunrise)*glide;blend.sunset+=(sunset-blend.sunset)*glide;
    daylight=blend.daylight;twilight=blend.twilight;sunrise=blend.sunrise;sunset=blend.sunset;
    phase=twilight>.42?(sunrise>=sunset?'sunrise':'sunset'):(daylight>.42?'day':'night');
    if(document.documentElement.dataset.skyPhase!==phase)document.documentElement.dataset.skyPhase=phase;
    const dayT=Math.max(0,Math.min(1,daylight)),twT=Math.max(0,Math.min(1,twilight*1.35));
    const mix=([ar,ag,ab,aa],[br,bg,bb,ba],t)=>[ar+(br-ar)*t,ag+(bg-ag)*t,ab+(bb-ab)*t,aa+(ba-aa)*t];
    const night=[[198,150,255,.92],[110,196,255,.55]],rise=[[255,140,96,.92],[214,130,255,.6]],day=[[255,186,90,.95],[255,244,210,.7]];
    const accents=[[[185,144,255,1],[127,220,255,1]],[[216,121,255,1],[255,173,120,1]],[[255,207,112,1],[113,216,255,1]]];
    let g1=mix(night[0],day[0],dayT),g2=mix(night[1],day[1],dayT);
    g1=mix(g1,rise[0],twT);g2=mix(g2,rise[1],twT);
    let a1=mix(accents[0][0],accents[2][0],dayT),a2=mix(accents[0][1],accents[2][1],dayT);
    a1=mix(a1,accents[1][0],twT);a2=mix(a2,accents[1][1],twT);
    const chase=window.elev8miGlowLerp||(window.elev8miGlowLerp={g1:g1.slice(),g2:g2.slice(),a1:a1.slice(),a2:a2.slice()});
    [chase.g1,chase.g2,chase.a1,chase.a2].forEach((slot,index)=>{const next=[g1,g2,a1,a2][index];for(let channel=0;channel<4;channel++)slot[channel]+=(next[channel]-slot[channel])*0.012;});
    const rgba=c=>`rgba(${c[0].toFixed(1)},${c[1].toFixed(1)},${c[2].toFixed(1)},${c[3].toFixed(3)})`;
    const rootStyle=document.documentElement.style;
    const glowKey=rgba(chase.g1)+rgba(chase.g2)+rgba(chase.a1)+rgba(chase.a2);
    if(glowKey!==lastGlow){lastGlow=glowKey;rootStyle.setProperty('--logo-glow',rgba(chase.g1));rootStyle.setProperty('--logo-glow2',rgba(chase.g2));rootStyle.setProperty('--sky-accent',rgba(chase.a1));rootStyle.setProperty('--sky-accent-2',rgba(chase.a2));const stops=document.getElementById('navTraceSpectrum')?.querySelectorAll('stop');if(stops&&stops.length>=5){const edge=rgba(chase.g2),mid=rgba(chase.g1);stops[0].setAttribute('stop-color',edge);stops[1].setAttribute('stop-color',mid);stops[3].setAttribute('stop-color',edge);stops[4].setAttribute('stop-color',mid);}}
    heroSun.x=sunSpot.x;heroSun.y=sunSpot.y;
    moonPosition.x=mx;moonPosition.y=my;moonPosition.z=0;
    const lunarIllumination=Math.max(0,Math.min(1,Number(window.Elev8Moon?.state?.illuminated)||0));
    const moonScreenX=(rootDocumentLeft-window.scrollX+mx)/innerWidth;
    const moonScreenY=(rootTop+my)/innerHeight;
    const moonAltitude=moonSpot.alt;
    const moonLight=.22*lunarIllumination*(visibleHeight/(moonHalf*2))*(1-daylight);
    const skyCss=`${daylight.toFixed(3)}|${twilight.toFixed(3)}|${sunrise.toFixed(3)}|${sunset.toFixed(3)}|${sunAzimuth.toFixed(4)}|${sunRising?1:0}`;
    if(skyCss!==lastSkyCss){lastSkyCss=skyCss;rootStyle.setProperty('--daylight',daylight.toFixed(3));rootStyle.setProperty('--nightlight',(1-daylight).toFixed(3));rootStyle.setProperty('--twilight',twilight.toFixed(3));rootStyle.setProperty('--sunrise',sunrise.toFixed(3));rootStyle.setProperty('--sunset',sunset.toFixed(3));rootStyle.setProperty('--sun-azimuth',sunAzimuth.toFixed(4));rootStyle.setProperty('--twilight-color',sunRising?'255 168 92':'255 116 84');}
    const risingSunNode=risingSun;if(risingSunNode){risingSunNode.style.left='0';risingSunNode.style.top='0';risingSunNode.style.transform=`translate3d(${sunSpot.x}px,${sunSpot.y}px,0) translate(-50%,-50%)`;risingSunNode.style.opacity=(sunSpot.fade*appearBody).toFixed(3);risingSunNode.style.pointerEvents=sunSpot.fade>.2?'auto':'none';risingSunNode.style.clipPath='none';risingSunNode.style.zIndex='8';}
    window.elev8miCelestial={moonBehindEarth:rear,moonVisible:visibleHeight>0,time:localTime,orbitRate,earthYearSeconds,moonOrbitSeconds,earthSpinSeconds,solarAltitude,sunAzimuth,sunRising,phase,sunrise,sunset,twilight,daylight,horizon,width,height,heroSun,moonPosition,planetPositions,lunarIllumination,moonScreenX,moonScreenY,moonAltitude,moonLight,cameraDistance,horizontalFit,mobileOrbitFrame,sinPitch,orbitalRadius:radius,earthOcclusionDepth:earthPoint.depth,earthScreenRadius};
  }
  window.Elev8OrbitSpeed = 1;
  const speedInput=document.getElementById('orbitSpeedRange');
  const speedReadout=document.getElementById('orbitSpeedValue');
  function setOrbitSpeed(value){
    const speed=Math.max(1,Math.min(12,Math.round(Number(value)||1)));
    window.Elev8OrbitSpeed=speed;
    if(speedInput) speedInput.value=String(speed);
    if(speedReadout) speedReadout.textContent=speed+'×';
  }
  speedInput?.addEventListener('input',()=>setOrbitSpeed(speedInput.value));
  const speedLabel=document.getElementById('orbitSpeed');
  const headerBar=document.querySelector('.header-content');
  const parkSpeed=()=>{
    if(!speedLabel||!headerBar)return;
    const phone=matchMedia('(max-width:720px)').matches;
    const home=phone?headerBar:root;
    if(speedLabel.parentElement!==home)home.append(speedLabel);
  };
  parkSpeed();
  window.addEventListener('resize',parkSpeed,{passive:true});
  function setPitch(deg){
    const pitch=deg*Math.PI/180;
    sinPitch=Math.sin(pitch);cosPitch=Math.cos(pitch);
    tracksDirty=true;
  }
  function resize() {
    if(document.documentElement.classList.contains('elev8-hero-full')){
      let ox=0,oy=0;for(let n=root;n;n=n.offsetParent){ox+=n.offsetLeft;oy+=n.offsetTop;}
      rootDocumentTop=oy;rootDocumentLeft=ox;
    }else{
      const rect=root.getBoundingClientRect();rootDocumentTop=rect.top+window.scrollY;rootDocumentLeft=rect.left+window.scrollX;
    }
    tracksDirty=true;
    width=root.clientWidth;height=root.clientHeight;
    shortLandscape=innerWidth>innerHeight&&innerHeight<=500;
    const portrait=innerWidth<innerHeight;
    mobileOrbitFrame=portrait&&innerWidth<=720;
    radius=width*(mobileOrbitFrame?.405:width<600?.30:.435);
    // The emblem is the sun, in the upper center of the hero — the same
    // point the orbits are drawn around — and clear of the fixed nav.
    sunY=shortLandscape?Math.max(108,innerHeight*.37)-rootDocumentTop:height*.27;
    openingGap=Math.max(40,innerHeight*(shortLandscape?.86:.56)-rootDocumentTop-sunY);
    const roll=(mobileOrbitFrame?-9:portrait?-5:-8)*Math.PI/180;
    sinRoll=Math.sin(roll);cosRoll=Math.cos(roll);
    setPitch(mobileOrbitFrame?24:portrait?52:12);
    stageHeight=Math.ceil(Math.max(height,innerHeight*.80));
    root.style.setProperty('--orbit-stage-height',`${stageHeight}px`);
    // The emblem and orbit/light origin share this exact measured position.
    root.style.setProperty('--hero-sun-y',`${sunY}px`);
    window.Elev8HeroApex?.recompute?.();
    diameterScale=(width<600?36:60)/142984;
    const dpr=Math.min(window.devicePixelRatio||1,window.Elev8Handheld?1:2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(stageHeight*dpr);
    if(ctx){
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    }
    bodies.forEach(body=>{
      const distanceScale=1/(1+.42*Math.log1p(distances[bodies.indexOf(body)]));
      const size=Math.max(width<600?6:8,body.planet[1]*diameterScale*distanceScale);
      // Saturn's full sprite includes rings; its globe is 42% of sprite width.
      const spriteWidth=size*(body.planet[0]==='Saturn'?2.38:1);
      body.img.style.width=`${spriteWidth}px`;
      body.displayRadius=body.planet[0]==='Earth'?38:Math.max(4,spriteWidth/2);
    });
    moonHalf=(moonImage.offsetWidth||58)/2;
    paintMoon();draw();if(window.Elev8Motion.paused)scheduleStill();
  }
  // v32: the Moon-phase pill is a small badge fixed in the page's bottom-right
  // corner (v33: where the Pause motion button was). It fades aside whenever it would cover a
  // control, so it never blocks nav, sound, draws, booking or forms.
  const pill=document.querySelector('.moon-now');
  if(pill){document.body.append(pill);pill.classList.add('moon-pill');}
  const controls='a[href],button,input,select,textarea,label,[role="menuitemradio"],[tabindex="0"]';
  let pillFrame=0;
  function checkPill(){
    pillFrame=0;if(!pill)return;const r=pill.getBoundingClientRect();if(!r.width)return;
    pill.style.visibility='hidden';let covered=false;
    for(let i=0;i<=4&&!covered;i++)for(let j=0;j<=2&&!covered;j++){
      const t=document.elementFromPoint(r.left+2+(r.width-4)*i/4,r.top+2+(r.height-4)*j/2);
      if(t&&t.closest(controls)&&!t.closest('.solar-body'))covered=true;
    }
    pill.style.visibility='';pill.classList.toggle('is-yielding',covered);
  }
  const queuePill=()=>{if(!pillFrame)pillFrame=requestAnimationFrame(checkPill);};
  window.addEventListener('scroll',queuePill,{passive:true});window.addEventListener('resize',queuePill,{passive:true});
  document.addEventListener('toggle',queuePill,true);document.addEventListener('click',()=>setTimeout(queuePill,350),true);
  // v32: the hero card sits right under Earth and the orbits, in the first
  // screen. Earth's horizon opens at 56% of the viewport height.
  const heroCopy=document.querySelector('.hero-copy');let heroWidth=0;
  function placeHeroCopy(){
    if(!heroCopy)return;
    const touch=matchMedia('(pointer: coarse)').matches;
    if(touch&&heroWidth===innerWidth&&heroCopy.style.marginTop)return; // ignore URL-bar height changes
    heroWidth=innerWidth;heroCopy.style.marginTop='0px';heroCopy.style.marginBottom='';
    let top=0;for(let e=heroCopy;e;e=e.offsetParent)top+=e.offsetTop;
    const target=Math.round(innerHeight*.56+(innerWidth<=720?34:42)),lift=Math.min(0,target-top);
    // The same space is returned below the card, so the hero keeps its height:
    // Earth's opening horizon and every later section stay where they were.
    heroCopy.style.marginTop=`${lift}px`;heroCopy.style.marginBottom=`${-lift}px`;
    const view=document.querySelector('.earth-location');
    if(view){if(view.parentElement!==heroCopy.parentElement)heroCopy.parentElement.insertBefore(view,heroCopy);view.style.top=(heroCopy.offsetTop-view.offsetHeight-12)+'px';}
    queuePill();
  }
  placeHeroCopy();window.addEventListener('resize',placeHeroCopy,{passive:true});
  document.fonts?.ready.then(()=>{heroWidth=0;placeHeroCopy();});window.addEventListener('load',()=>{heroWidth=0;placeHeroCopy();});
  if('ResizeObserver'in window&&pill){const watch=new ResizeObserver(queuePill);watch.observe(pill);if(heroCopy)watch.observe(heroCopy);}
  // Entrance animations settle the page after load; re-check once they end.
  document.addEventListener('animationend',queuePill,true);[1500,4000].forEach(delay=>setTimeout(queuePill,delay));
  window.addEventListener('scroll',()=>{tracksDirty=true;if(window.Elev8Motion.paused)scheduleStill();},{passive:true});
  document.fonts?.ready.then(resize);
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(root);
  window.addEventListener('resize',resize,{passive:true});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;},{rootMargin:'100px'}).observe(root);
  window.Elev8Motion.add((time,dt)=>{localTime+=dt*(window.Elev8OrbitSpeed||1);
    draw();},{fps:window.Elev8Handheld?30:0});
  resize();
  (function pumpLoad(){
    if(document.body.classList.contains('live'))return;
    if(document.documentElement.dataset.motion!=='playing')draw();
    requestAnimationFrame(pumpLoad);
  })();
})();
