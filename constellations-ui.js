// constellations-ui.js — ELEV8MI v34 (E8 "v34 constellations"). Self-contained ES module.
//
// John: "with the constellations, make them intermittently glow one at a time and
// the are clickable with a pop up information about the constellation, and also
// for the polaris, etc."
//
// What it does (night sky of the hero, WebGL path of photo-motion.js only):
//  1. Glow cycle: one on-screen constellation at a time brightens (lines + stars)
//     over ~3 s, holds, fades, then the next (~7 s cadence). Off by day (driven by
//     window.elev8miCelestial.daylight) and off under prefers-reduced-motion.
//  2. Click/tap/keyboard targets for each visible constellation and for the named
//     stars in constellations-info.json that exist in night-sky.json. Pointer and
//     touch use a delegated hit test (no overlay at all); keyboard uses one
//     roving-tabindex group of real <button>s in a fixed layer at z-index 0,
//     behind header/main (the layer itself has pointer-events:none).
//  3. Popup card (glass/gold, site CSS variables): constellation name, meaning,
//     myth, main stars, best season; or star facts. Closes on outside click/tap,
//     Esc or ×; returns focus; clamped on screen.
//  4. Performance: lazy init after the first requestIdleCallback; geometry is
//     recomputed at most 10 Hz (and only when rotation/size/camera band changes);
//     scrolling moves both layers with ONE transform each (sky parallax = 0.45).
//
// Projection: read from window.Elev8Sky.frame / .view, which photo-motion.js
// publishes next to its shader constants (no copies here).

const BASE = new URL('.', import.meta.url);
const VERSION = '57';
const DATA_URL = new URL(`assets/sky/night-sky.json?v=${VERSION}`, BASE).href; // same URL photo-motion.js fetches (cache hit)
const INFO_URL = new URL(`constellations-info.json?v=${VERSION}`, BASE).href;

const CYCLE = {rise: 3000, hold: 1600, fall: 2600, gap: 600}; // ~7.8 s per constellation
const d2r = Math.PI / 180;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = matchMedia('(max-width: 720px)');

let started = false;
export function initConstellations() {
  if (started) return; started = true;
  if (reduced.matches) { document.documentElement.dataset.constellations = 'off-reduced-motion'; return; }
  Promise.all([fetch(DATA_URL).then(r => r.ok ? r.json() : Promise.reject(new Error('sky ' + r.status))),
               fetch(INFO_URL).then(r => r.ok ? r.json() : Promise.reject(new Error('info ' + r.status)))])
    .then(([sky, info]) => build(sky, info))
    .catch(error => { document.documentElement.dataset.constellations = 'off'; console.warn('Constellations unavailable:', error.message); });
}

function build(sky, info) {
  const journey = document.getElementById('journey');
  if (!journey) return;
  if (!window.Elev8Sky?.frame || !window.Elev8Sky.view) { setTimeout(() => build(sky, info), 250); return; }
  const frame = () => window.Elev8Sky.frame;
  const view = () => window.Elev8Sky.view;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const mobileTier = mobileQuery.matches || (coarse && Math.max(screen.width, screen.height) <= 1024); // same test as photo-motion.js
  const magLimit = mobileTier ? 4.0 : 5.0; // same star limit photo-motion.js draws

  // ---- sky-plane coordinates (degrees in the star-map texture), computed once ----
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const vec = (ra, dec) => [Math.cos(dec * d2r) * Math.cos(ra * d2r), Math.cos(dec * d2r) * Math.sin(ra * d2r), Math.sin(dec * d2r)];
  const toMap = (ra, dec) => { const F = frame(), v = vec(ra, dec), z = dot(v, F.C); if (z < -0.3) return null; const k = 2 / (1 + z); return [k * dot(v, F.R) / d2r, k * dot(v, F.U) / d2r]; };

  const starByHip = new Map(sky.stars.map(s => [s[4], s]));
  const near = (a, b) => Math.abs(a[0] - b[0]) < 0.02 && Math.abs(a[1] - b[1]) < 0.02;
  const FAMILIAR = {
    UMa: 'Big Dipper', UMi: 'Little Dipper', Ori: 'Orion', Cas: 'Cassiopeia',
    Gem: 'The Twins', Leo: 'The Lion', Tau: 'The Bull', CMa: 'The Great Dog',
    CMi: 'The Little Dog', Boo: 'The Herdsman', Aur: 'The Charioteer',
    Per: 'Perseus', Dra: 'The Dragon', Cep: 'Cepheus', Cnc: 'The Crab', Lyn: 'The Lynx'
  };
  const groups = Object.entries(sky.lines).filter(([abbr]) => info.constellations[abbr]).map(([abbr, polylines]) => {
    let source = polylines;
    if (abbr === 'UMa') source = [polylines[0]];
    const lines = source.map(line => line.map(([ra, dec]) => toMap(ra, dec)).filter(Boolean)).filter(l => l.length > 1);
    const verts = [];
    source.forEach(l => l.forEach(p => { if (!verts.some(q => near(p, q))) verts.push(p); }));
    const stars = verts.map(p => { const s = sky.stars.find(t => near([t[0], t[1]], p)); return s ? {m: toMap(s[0], s[1]), mag: s[2], bv: s[3]} : {m: toMap(p[0], p[1]), mag: 4, bv: 0.2}; }).filter(s => s.m);
    const data = info.constellations[abbr];
    const label = FAMILIAR[abbr] || data.name;
    return {kind: 'constellation', id: abbr, label, data: {...data, name: label}, lines, stars};
  });
  const belt = sky.lines.Ori && sky.lines.Ori[3];
  if (belt) {
    const line = belt.map(([ra, dec]) => toMap(ra, dec)).filter(Boolean);
    const stars = belt.map(p => { const s = sky.stars.find(t => near([t[0], t[1]], p)); return s ? {m: toMap(s[0], s[1]), mag: s[2], bv: s[3]} : {m: toMap(p[0], p[1]), mag: 2, bv: -.2}; }).filter(s => s.m);
    if (line.length > 1) groups.push({
      kind: 'constellation', id: 'belt', label: "Orion's Belt",
      data: {name: "Orion's Belt", meaning: 'Three stars in a straight line', myth: 'Alnitak, Alnilam and Mintaka. The belt of the hunter, and the pattern most people find first in the winter sky.', stars: ['Alnitak', 'Alnilam', 'Mintaka'], season: 'Winter'},
      lines: [line], stars
    });
  }
  const named = Object.entries(info.stars).map(([hip, data]) => ({hip: +hip, data, s: starByHip.get(+hip)}))
    .filter(x => x.s && x.s[2] <= magLimit).map(x => ({kind: 'star', id: String(x.hip), data: x.data, m: toMap(x.s[0], x.s[1]), mag: x.s[2]}))
    .filter(x => x.m);

  // ---- DOM: glow SVG inside #journey (decorative), button layer at body level ----
  const svgNS = 'http://www.w3.org/2000/svg';
  const glow = document.createElementNS(svgNS, 'svg');
  glow.id = 'constellationGlow'; glow.setAttribute('aria-hidden', 'true'); glow.setAttribute('focusable', 'false');
  const glowGroup = document.createElementNS(svgNS, 'g'); glowGroup.setAttribute('class', 'cg-figure'); glow.append(glowGroup);
  const canvas = document.getElementById('photoMotion');
  if (canvas && canvas.parentNode === journey) canvas.after(glow); else journey.insertBefore(glow, journey.querySelector('.day-sky'));

  const layer = document.createElement('div');
  layer.id = 'skyTargets'; layer.setAttribute('role', 'group'); layer.setAttribute('aria-label', 'Constellations and bright stars. Use arrow keys to move, Enter to learn more.');
  const main = document.querySelector('main');
  (main ? main.parentNode.insertBefore(layer, main) : document.body.append(layer));

  const popup = document.createElement('div');
  popup.id = 'constellationPopup'; popup.className = 'cg-popup'; popup.setAttribute('role', 'dialog'); popup.setAttribute('aria-modal', 'false');
  popup.setAttribute('aria-labelledby', 'cgPopupTitle'); popup.hidden = true;
  document.body.append(popup);

  const items = [...groups, ...named];
  items.forEach((item, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cg-target cg-' + item.kind; b.tabIndex = -1; b.hidden = true;
    b.setAttribute('aria-label', item.kind === 'star' ? `${item.data.name}, star` : `${item.data.name}, constellation`);
    b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', () => open(item, b));
    item.button = b; item.index = i; item.screen = null; layer.append(b);
  });

  // ---- projection to screen (camera = 0), mirrors photo-motion.js's sky shader ----
  let geom = null; // {W,H,drawnX,drawnY,offX,offY,plateTop,plateH,imgW,imgH,camera}
  const plateImage = journey.querySelector('.journey-plate img');
  function measure() {
    const state = window.elev8miJourney, W = innerWidth, H = innerHeight;
    const imgW = plateImage?.naturalWidth || 941, imgH = plateImage?.naturalHeight || 1672;
    const scene = state?.scenes?.[0], plateH = scene?.height || H * 1.8, plateTop = scene?.top || 0;
    const fit = Math.max(W / imgW, plateH / imgH), drawnX = imgW * fit, drawnY = imgH * fit;
    return {W, H, imgW, imgH, plateH, plateTop, drawnX, drawnY, offX: (W - drawnX) / 2, offY: (plateH - drawnY) / 2};
  }
  // map degrees -> screen px at camera 0; returns [x, y, uvx, skyY] or null
  function project(m, rot, g, V) {
    const [px, py] = V.pole, rx = m[0] - px, ry = m[1] - py, c = Math.cos(rot), s = Math.sin(rot);
    // shader: map = pole + R(rot)·(skyDeg − pole)  =>  skyDeg = pole + R(−rot)·(map − pole)
    const sx = px + c * rx + s * ry, sy = py - s * rx + c * ry;
    const scale = typeof V.scale === 'function' ? V.scale(g.W, g.H) : V.scale;
    const skyX = sx / scale, skyY = V.origin - sy / scale;
    const uvx = skyX * g.imgH / g.imgW + 0.5;
    return [uvx * g.drawnX + g.offX, (skyY + V.top) * g.drawnY + g.offY + g.plateTop, uvx, skyY];
  }
  function onSky(p, m, g, V, camera) {
    if (!p || Math.abs(m[0]) > V.mapHalfW || Math.abs(m[1]) > V.mapHalfH) return false;
    const y = p[1] - (1 - V.parallax) * camera, x = p[0];
    if (x < -10 || x > g.W + 10 || y < -10 || y > g.H + 10) return false;
    if (y > g.plateTop + g.plateH - camera) return false;
    const hx = (p[2] - 0.5) * g.imgW / g.imgH, hz = V.horizon, horizon = hz.base + hz.radius - Math.sqrt(Math.max(0.001, hz.radius * hz.radius - hx * hx));
    const uvy = p[3] + V.top + V.parallax * camera / g.drawnY;
    return uvy < horizon - hz.fadeTo;
  }

  // ---- state & updates ----
  let night = 0, enabled = false, lastKey = '', visible = [], lastLayout = 0, focusIndex = -1, introDone=false;
  const reveal = () => document.getElementById('journey')?.dataset.photoMotion === 'gpu';
  function layout(now) {
    const state = window.elev8miJourney; if (!state) return;
    const camera = state.camera || 0, rot = +(window.Elev8Sky?.rotation) || 0;
    const clock = window.elev8miCelestial; night = 1 - (clock?.daylight ?? 0);
    const on = reveal() && night > 0.15 && !reduced.matches;
    // one transform per layer for scroll parallax (sky moves at 0.45 of the camera)
    const shift = `translate3d(0,${(-(1 - view().parallax) * camera).toFixed(1)}px,0)`;
    glow.style.transform = shift; layer.style.transform = shift;
    if (activeGlow && geom) trackFigure(activeGlow);
    // full geometry at most 10 Hz, and only when something relevant changed
    const key = [innerWidth, innerHeight, rot.toFixed(4), Math.round(camera / 40), on ? 1 : 0, state.scenes?.[0]?.height | 0].join('|');
    if (key === lastKey || now - lastLayout < 100) return;
    lastKey = key; lastLayout = now;
    if (on !== enabled) { enabled = on; document.documentElement.dataset.constellations = on ? 'on' : 'idle'; if (!on) { stopGlow(); if (!popup.hidden && popupItem) close(false); } }
    geom = measure(); const V = view();
    visible = [];
    const minHit = 22; // px radius = 44 px target
    items.forEach(item => {
      let show = false;
      if (on) {
        if (item.kind === 'star') {
          const p = project(item.m, rot, geom, V);
          show = onSky(p, item.m, geom, V, camera);
          if (show) { item.screen = {x: p[0], y: p[1], r: minHit}; }
        } else {
          const pts = []; item.segs = [];
          item.lines.forEach(line => { let prev = null; line.forEach(m => { const p = project(m, rot, geom, V); const vis = onSky(p, m, geom, V, camera); const q = {x: p[0], y: p[1], vis}; if (prev && (prev.vis || vis)) item.segs.push([prev, q]); if (vis) pts.push(q); prev = q; }); });
          show = pts.length >= 2;
          if (show) {
            const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
            // anchor on the midpoint of the visible segment nearest the centroid: on the
            // figure's lines but never on a named star (stars have their own targets)
            const mids = item.segs.filter(([a, b]) => a.vis && b.vis).map(([a, b]) => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2}));
            const a = (mids.length ? mids : pts).reduce((best, p) => (Math.hypot(p.x - cx, p.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? p : best));
            item.screen = {x: a.x, y: a.y, r: minHit, pts};
          }
        }
      }
      if (!show) item.screen = null;
      const b = item.button;
      if (show) { b.hidden = false; b.style.transform = `translate3d(${(item.screen.x - minHit).toFixed(1)}px,${(item.screen.y - minHit).toFixed(1)}px,0)`; visible.push(item); }
      else if (!b.hidden) { if (document.activeElement === b) b.blur(); b.hidden = true; b.tabIndex = -1; }
    });
    // roving tabindex: exactly one visible target is in the Tab order
    visible.sort((a, b) => a.screen.x - b.screen.x || a.screen.y - b.screen.y);
    const current = visible.find(it => it.button === document.activeElement) || visible.find(it => it.button.tabIndex === 0) || visible[0];
    visible.forEach(it => { it.button.tabIndex = it === current ? 0 : -1; });
    if (activeGlow && !activeGlow.screen) { const next = advance; stopGlow(); if (next) { advance = next; glowTimer = setTimeout(next, 160); } }
    else if (activeGlow) drawFigure(activeGlow);
    if (skyReady && enabled && !introDone && visible.some(it => it.kind === 'constellation' && it.screen)) {
      introDone = true;
      beginIntro(visible.filter(it => it.kind === 'constellation' && it.screen));
    } else if (skyReady && enabled && introDone && !glowTimer && !activeGlow) glowTimer = setTimeout(nextGlow, 900);
  }

  // ---- glow cycle ----
  // The opening used to strobe a dozen figures. One constellation breathes
  // in, holds, and eases out before the next — then the slow cycle takes over.
  const INTRO = {draw: 1600, hold: 100, fall: 300};
  let skyReady = false;
  let activeGlow = null, glowTimer = 0, glowIndex = -1, activePill = null, advance = null, figureId = '';
  function clearPill(){ if(activePill){ activePill.remove(); activePill = null; } document.querySelectorAll('.cg-intro-pill').forEach(node => node.remove()); }
  function pathData(item){
    const rot = +(window.Elev8Sky?.rotation) || 0, V = view(), g = geom;
    if (!g) return null;
    const parts = [];
    let len = 0, sx = 0, sy = 0, n = 0;
    (item.lines || []).forEach(line => {
      let prev = null;
      line.forEach(m => {
        const p = project(m, rot, g, V);
        if (!p) { prev = null; return; }
        if (prev) {
          parts.push(`M${prev[0].toFixed(1)} ${prev[1].toFixed(1)}L${p[0].toFixed(1)} ${p[1].toFixed(1)}`);
          len += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        }
        prev = p; sx += p[0]; sy += p[1]; n += 1;
      });
    });
    return n ? {d: parts.join(''), len, x: sx / n, y: sy / n} : null;
  }
  function ensurePaths(){
    let halo = glowGroup.querySelector('.cg-line-halo');
    let path = glowGroup.querySelector('.cg-line');
    if (!halo) { halo = document.createElementNS(svgNS, 'path'); halo.setAttribute('class', 'cg-line-halo'); glowGroup.append(halo); }
    if (!path) { path = document.createElementNS(svgNS, 'path'); path.setAttribute('class', 'cg-line'); glowGroup.append(path); }
    return {halo, path};
  }
  function placeStars(item, restart){
    const rot = +(window.Elev8Sky?.rotation) || 0, V = view();
    if (restart || glowStars.length !== item.stars.length) {
      glowStars.forEach(node => node.remove());
      glowStars = item.stars.map((s, i) => {
        const g = document.createElementNS(svgNS, 'g');
        g.setAttribute('class', 'cg-star');
        const halo = document.createElementNS(svgNS, 'circle');
        halo.setAttribute('class', 'cg-star-halo');
        const core = document.createElementNS(svgNS, 'circle');
        core.setAttribute('class', 'cg-star-core');
        core.style.animationDelay = (i % 5) * .37 + 's';
        g.append(halo, core);
        glowGroup.append(g);
        return g;
      });
    }
    item.stars.forEach((s, i) => {
      const p = project(s.m, rot, geom, V), g = glowStars[i];
      if (!g || !p) return;
      const bv = s.bv ?? .2;
      const ink = bv < 0 ? '#c5d4ff' : bv < .3 ? '#f7f9ff' : bv < .6 ? '#fff3d2' : bv < 1.2 ? '#ffd0a4' : '#ffb090';
      const coreR = Math.max(.7, (3.2 - s.mag) * (mobileTier ? .28 : .36));
      const haloR = coreR * 3.1;
      [...g.children].forEach(node => {
        node.setAttribute('cx', p[0].toFixed(1));
        node.setAttribute('cy', p[1].toFixed(1));
        node.style.fill = ink;
      });
      g.children[0].setAttribute('r', haloR.toFixed(2));
      g.children[1].setAttribute('r', coreR.toFixed(2));
    });
  }
  let drawStart = 0, glowStars = [], trackBucket = '';
  function trackFigure(item) {
    if (!geom) geom = measure();
    const fresh = figureId !== item.id;
    if (fresh) { figureId = item.id; drawStart = performance.now(); trackBucket = ''; }
    const t = reduced.matches ? 1 : Math.max(0, Math.min(1, (performance.now() - drawStart) / INTRO.draw));
    const rot = +(window.Elev8Sky?.rotation) || 0;
    const bucket = (rot * 800 | 0) + ':' + (t * 40 | 0);
    if (!fresh && bucket === trackBucket) return;
    trackBucket = bucket;
    placeStars(item, fresh);
    const fig = pathData(item);
    if (!fig) return;
    const {halo, path} = ensurePaths();
    if (halo.getAttribute('d') !== fig.d) { halo.setAttribute('d', fig.d); path.setAttribute('d', fig.d); }
    const len = Math.max(1, fig.len);
    const offset = (len * (1 - t)).toFixed(1);
    const dash = len.toFixed(1);
    if (path.style.strokeDashoffset !== offset) {
      const array = dash + ' ' + dash;
      halo.style.transition = path.style.transition = 'none';
      halo.style.strokeDasharray = path.style.strokeDasharray = array;
      halo.style.strokeDashoffset = path.style.strokeDashoffset = offset;
    }
    if (activePill) {
      const cam = window.elev8miJourney?.camera || 0;
      let left = fig.x, top = fig.y - (1 - view().parallax) * cam;
      const logo = document.querySelector('.solar-system .hero-sigil')?.getBoundingClientRect();
      if (logo && logo.width && left > logo.left - 88 && left < logo.right + 24 && top > logo.top - 28 && top < logo.bottom + 28) {
        left = innerWidth - logo.right > logo.left ? logo.right + 16 : Math.max(12, logo.left - 16);
        if (top > logo.top - 8 && top < logo.bottom + 8) top = fig.y < (logo.top + logo.bottom) / 2 ? logo.top - 26 : logo.bottom + 26;
      }
      activePill.style.left = Math.max(12, Math.min(innerWidth - 120, left)) + 'px';
      activePill.style.top = Math.max(72, Math.min(innerHeight - 36, top)) + 'px';
    }
  }
  function drawFigure(item) { trackFigure(item); }
  function stopGlow() { clearTimeout(glowTimer); glowTimer = 0; activeGlow = null; advance = null; figureId = ''; trackBucket = ''; glow.classList.remove('is-lit'); glow.classList.remove('is-intro'); clearPill(); }
  function beginIntro(pool) {
    let i = 0;
    const step = () => {
      glowTimer = 0;
      clearPill();
      if (!enabled) { advance = null; return; }
      while (i < pool.length && !pool[i].screen) i += 1;
      if (i >= pool.length) { activeGlow = null; advance = null; glow.classList.remove('is-lit', 'is-intro'); glowTimer = setTimeout(nextGlow, 900); return; }
      const it = pool[i++];
      activeGlow = it; glow.classList.add('is-intro'); drawFigure(it);
      glow.style.setProperty('--cg-rise', '80ms');
      glow.style.setProperty('--cg-fall', INTRO.fall + 'ms');
      const pill = document.createElement('button');
      pill.type = 'button'; pill.className = 'cg-intro-pill'; pill.textContent = it.label || it.data.name;
      pill.setAttribute('aria-label', it.data.name + ', constellation');
      const cam=window.elev8miJourney?.camera||0;
      const py=it.screen.y-(1-view().parallax)*cam;
      const logo=document.querySelector('.solar-system .hero-sigil')?.getBoundingClientRect();
      let left=it.screen.x, top=py;
      if(logo&&logo.width){
        const near=left>logo.left-88&&left<logo.right+24&&top>logo.top-28&&top<logo.bottom+28;
        if(near){
          const rightSide=innerWidth-logo.right>logo.left;
          left=rightSide?logo.right+16:Math.max(12,logo.left-16);
          if(top>logo.top-8&&top<logo.bottom+8)top=py<(logo.top+logo.bottom)/2?logo.top-26:logo.bottom+26;
        }
      }
      left=Math.max(12,Math.min(innerWidth-120,left));
      top=Math.max(72,Math.min(innerHeight-36,top));
      pill.style.left=left+'px'; pill.style.top=top+'px';
      pill.style.position='fixed';
      pill.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open(it, pill, {x: it.screen.x, y: py}); });
      document.body.append(pill);
      activePill = pill;
      advance = step;
      requestAnimationFrame(() => glow.classList.add('is-lit'));
      glowTimer = setTimeout(() => {
        glow.classList.remove('is-lit');
        glowTimer = setTimeout(step, INTRO.fall);
      }, INTRO.draw + INTRO.hold);
    };
    advance = step;
    step();
  }
  function nextGlow() {
    glowTimer = 0;
    glow.classList.remove('is-intro');
    if (!enabled || document.hidden || window.Elev8Motion?.paused) { glowTimer = setTimeout(nextGlow, 2000); return; }
    const pool = visible.filter(it => it.kind === 'constellation');
    if (!pool.length) { glowTimer = setTimeout(nextGlow, 2000); return; }
    glowIndex = (glowIndex + 1) % pool.length;
    activeGlow = pool[glowIndex]; drawFigure(activeGlow);
    glow.style.setProperty('--cg-rise', CYCLE.rise + 'ms'); glow.style.setProperty('--cg-fall', CYCLE.fall + 'ms');
    requestAnimationFrame(() => glow.classList.add('is-lit'));
    glowTimer = setTimeout(() => {
      glow.classList.remove('is-lit');
      glowTimer = setTimeout(() => { activeGlow = null; nextGlow(); }, CYCLE.fall + CYCLE.gap);
    }, CYCLE.rise + CYCLE.hold);
  }

  // ---- popup ----
  let popupItem = null, returnFocus = null;
  const ASTRO={
    Aur:'Guidance and craft. It speaks to steering what you have already built, and to a light you lend other people.',
    Boo:'The keeper of a path. It asks what you are willing to tend until it knows the way on its own.',
    Cnc:"The Moon's sign. Home, protection, and the courage to hold what is still soft.",
    CMa:'Loyalty that runs ahead of you. Devotion, heat, and a companion that does not lose the trail.',
    CMi:'The smaller faithfulness. A bright, close promise, enough light for the next step.',
    Cas:'Pride and the cost of being seen. Beauty, reputation, and the turn that follows a boast.',
    Cep:'Steadiness beside a louder story. Guardianship, duty, and a king who stays in his chair.',
    Dra:'An old guard. What you protect, what protects you, and the treasure you are not ready to set down.',
    Gem:'The Twins. Two minds, one bond: conversation, choice, and the art of keeping both.',
    Leo:"The Sun's sign. Heart, visibility, creative fire, and the right to take up your own light.",
    Lyn:'Sight you have to earn. Subtle talent, patience, and what only shows when you look harder.',
    Ori:'The hunter. Aim, courage, and a season of being unmistakably yourself.',
    belt:'Three in a row. A clear mark in the dark, and the step that lines the rest of the hunter up.',
    Per:'Rescue and nerve. The hero who acts before the story is safe, and the prize that follows.',
    Tau:'The Bull. Patience, appetite, loyalty to the body, and wealth that is built by staying.',
    UMa:'The great bear and the plough. Direction, kinship, and a map you can trust in the dark.',
    UMi:'The small bear and the pole. A private north, a promise you keep when no one is watching.'
  };
  function figureArt(item){
    const id=encodeURIComponent(item.id);
    return `<img class="cg-photo" src="assets/constellations/${id}.jpg?v=57" alt="${esc(item.data.name)} photographed in the night sky" width="720" height="420" decoding="async">`;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  function open(item, button, point) {
    popupItem = item; returnFocus = button && button.offsetParent !== null ? button : document.activeElement;
    const d = item.data;
    let html = `<button type="button" class="cg-close" aria-label="Close">×</button>`;
    if (item.kind === 'constellation') {
      const astro = ASTRO[item.id];
      html += figureArt(item)
        + `<p class="cg-kicker">${esc(item.label || d.name)}</p><h2 id="cgPopupTitle">${esc(d.name)}</h2>`
        + `<p class="cg-meaning">${esc(d.meaning)}</p>`
        + (astro ? `<p class="cg-astro"><span>In the chart.</span> ${esc(astro)}</p>` : '')
        + `<p class="cg-myth">${esc(d.myth)}</p><dl>`
        + `<dt>Main stars</dt><dd>${d.stars.map(esc).join(', ')}</dd>`
        + `<dt>Best seen</dt><dd>${esc(d.season)} evenings (Northern Hemisphere)</dd></dl>`;
    } else {
      const facts = [];
      if (d.mag !== undefined) facts.push(`<dt>Brightness</dt><dd>magnitude ${esc(d.mag)}</dd>`);
      if (d.distanceLy) facts.push(`<dt>Distance</dt><dd>${esc(d.distanceLy)} light-years</dd>`);
      if (d.spectral) facts.push(`<dt>Type</dt><dd>${esc(d.spectral)}</dd>`);
      html += `<p class="cg-kicker">Star · ${esc(d.designation || '')}</p><h2 id="cgPopupTitle">${esc(d.name)}</h2>`
        + `<p class="cg-meaning">${esc(d.what)}</p>${facts.length ? `<dl>${facts.join('')}</dl>` : ''}<p class="cg-fact"><span>Did you know?</span> ${esc(d.fact)}</p>`;
    }
    popup.innerHTML = html;
    popup.querySelector('.cg-close').addEventListener('click', () => close(true));
    const onSkyCard = item.kind === 'constellation';
    popup.classList.toggle('cg-on-sky', onSkyCard);
    popup.hidden = false; popup.classList.remove('is-open');
    if (onSkyCard) {
      popup.style.left = '0px'; popup.style.top = '0px';
      popup.style.transform = 'translate3d(-9999px,-9999px,0)';
      requestAnimationFrame(() => { placeOver(item, point); popup.classList.add('is-open'); });
    } else {
      popup.style.left = '50%'; popup.style.top = '50%'; popup.style.transform = 'translate(-50%,-50%)';
      requestAnimationFrame(() => popup.classList.add('is-open'));
    }
    popup.querySelector('.cg-close').focus({preventScroll: true, focusVisible: !point});
    document.documentElement.dataset.constellationPopup = item.id;
  }
  function visualOf(item, point) {
    if (point) return point;
    const camera = window.elev8miJourney?.camera || 0;
    const parallax = +(window.Elev8Sky?.view?.parallax ?? .55);
    const s = item.screen;
    if (!s) return {x: innerWidth / 2, y: innerHeight / 2};
    return {x: s.x, y: s.y - (1 - parallax) * camera};
  }
  function placeOver(item, point) {
    const pt = visualOf(item, point), m = 12, w = popup.offsetWidth || 300, h = popup.offsetHeight || 320;
    const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom || 0;
    let x = pt.x - w / 2, y = pt.y - Math.min(h * .42, 120);
    x = Math.max(m, Math.min(x, innerWidth - w - m));
    y = Math.max(Math.max(m, headerBottom + 8), Math.min(y, innerHeight - h - m));
    popup.style.left = '0px'; popup.style.top = '0px';
    popup.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
  }
  function close(restore) {
    if (popup.hidden) return;
    popup.hidden = true; popup.classList.remove('is-open'); popupItem = null; delete document.documentElement.dataset.constellationPopup;
    if (restore && returnFocus && document.contains(returnFocus) && !returnFocus.hidden) returnFocus.focus({preventScroll: true});
    returnFocus = null;
  }

  // ---- input: delegated pointer hit test (no overlay), keyboard roving focus ----
  const BLOCK = 'a,button,input,select,textarea,label,summary,details,dialog,iframe,video,audio,[role],[tabindex],[contenteditable],header,footer,.hero-copy,.hero-sigil,.moon-now,.planet-detail,.solar-body,#constellationPopup';
  const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
  function hitTest(x, y) {
    if (!enabled) return null;
    const camera = window.elev8miJourney?.camera || 0, p = {x, y: y + (1 - view().parallax) * camera}; // to camera-0 coords
    // Nearest target wins (a star centre, a constellation anchor or line), so a
    // short figure such as Canis Minor stays tappable beside Procyon.
    let best = null, bestD = Infinity;
    visible.forEach(it => { if (it.kind !== 'star') return; const d = Math.hypot(p.x - it.screen.x, p.y - it.screen.y); if (d <= it.screen.r && d < bestD) { best = it; bestD = d; } });
    const lineTol = coarse ? 22 : 16;
    visible.forEach(it => { if (it.kind !== 'constellation') return; it.segs.forEach(([a, b]) => { const d = segDist(p, a, b); if (d <= lineTol && d < bestD) { best = it; bestD = d; } });
      const d = Math.hypot(p.x - it.screen.x, p.y - it.screen.y); if (d <= it.screen.r && d < bestD) { best = it; bestD = d; } });
    return best;
  }
  let down = null;
  document.addEventListener('pointerdown', e => { down = e.isPrimary ? {x: e.clientX, y: e.clientY, t: e.target} : null; }, {passive: true, capture: true});
  document.addEventListener('pointermove', e => {
    if (!enabled) { if (document.documentElement.style.cursor === 'pointer') document.documentElement.style.cursor = ''; return; }
    const hit = hitTest(e.clientX, e.clientY);
    document.documentElement.classList.toggle('cg-hover', !!hit);
    document.documentElement.style.cursor = '';
  }, {passive: true});
  document.addEventListener('click', e => {
    if (e.target instanceof Element && e.target.closest('#skyTargets')) return; // keyboard activation of a target button
    if (!popup.hidden && !popup.contains(e.target)) close(false);
    if (e.defaultPrevented || e.button !== 0 || !enabled) return;
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) return; // a drag or scroll, not a tap
    const t = e.target;
    if (!(t instanceof Element) || t.closest(BLOCK)) return;
    if (!(t === document.body || t === document.documentElement || t.closest('.hero') || t.closest('#journey'))) return;
    if (getSelection && String(getSelection()).length) return;
    const item = hitTest(e.clientX, e.clientY);
    if (item) open(item, item.button, {x: e.clientX, y: e.clientY});
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !popup.hidden) { e.preventDefault(); close(true); return; }
    if (!popup.hidden && e.key === 'Tab') { // keep Tab inside the small card while it is open
      const f = [...popup.querySelectorAll('button,a[href]')]; if (f.length === 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  layer.addEventListener('keydown', e => {
    const i = visible.findIndex(it => it.button === document.activeElement); if (i < 0) return;
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % visible.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + visible.length) % visible.length;
    else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = visible.length - 1;
    if (j < 0) return;
    e.preventDefault(); visible[i].button.tabIndex = -1; visible[j].button.tabIndex = 0; visible[j].button.focus({preventScroll: true});
  });
  window.addEventListener('resize', () => { lastKey = ''; if (!popup.hidden) close(false); }, {passive: true});
  reduced.addEventListener?.('change', ev => { if (ev.matches) { stopGlow(); close(false); enabled = false; items.forEach(it => { it.button.hidden = true; }); glow.remove(); layer.remove(); } });

  // One cheap tick: the parallax transform each frame (two style writes), geometry <= 10 Hz.
  const tick = () => layout(performance.now());
  if (window.Elev8Motion?.add) window.Elev8Motion.add(tick, {fps: window.Elev8Handheld ? 20 : 30}); else setInterval(tick, 100);
  function pumpTour(){
    if (document.hidden || document.documentElement.dataset.motion === 'playing') return;
    tick();
    requestAnimationFrame(pumpTour);
  }
  pumpTour();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pumpTour(); });
  let scrollQueued = false;
  window.addEventListener('scroll', () => { if (scrollQueued) return; scrollQueued = true; requestAnimationFrame(() => { scrollQueued = false; tick(); }); }, {passive: true});
  tick();
  const armSky = () => { skyReady = true; lastKey = ''; };
  const readyForTour = () => {
    const gpu = document.getElementById('journey')?.dataset.photoMotion === 'gpu';
    if (!gpu) return false;
    const root = document.documentElement;
    return document.body.classList.contains('live') || root.classList.contains('elev8-hero-full') || root.classList.contains('elev8-preloading');
  };
  const watch = new MutationObserver(() => { if (!readyForTour()) return; watch.disconnect(); armSky(); });
  if (readyForTour()) armSky();
  else {
    watch.observe(document.body, {attributes: true, attributeFilter: ['class']});
    watch.observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
    const journeyEl = document.getElementById('journey');
    if (journeyEl) watch.observe(journeyEl, {attributes: true, attributeFilter: ['data-photo-motion']});
  }
  window.Elev8Constellations = {open: id => { const it = items.find(x => x.id === String(id)); if (it) open(it, it.button); return !!it; }, close: () => close(true),
    get visible() { return visible.map(it => it.id); }, get items() { return items.map(it => ({kind: it.kind, id: it.id, name: it.data.name})); }, get glowing() { return activeGlow?.id || null; }};
}

// Lazy start: after the first idle period (falls back to a timeout).
const kick = () => initConstellations();
kick();
