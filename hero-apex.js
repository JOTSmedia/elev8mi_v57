// ELEV8MI hero-apex.js. The Moon and the rising Sun peak in the gap between
// the bottom of the nav pill and the top of the hero emblem, centered on it.
const MARGIN = 10;
const NAV_SEL = 'header .header-content';
const LOGO_SEL = '.solar-system .hero-sigil';
const A = {x: 0, y: 0, navBottom: 0, logoTop: 0, docX: 0, docY: 0, ready: false, sunGap: null, debug: false};

function sunRadius() { return Math.max(34, Math.min(62, innerWidth * .046)) / 2; }
function moonRadius() { const c = document.querySelector('.orbit-moon-disc'); return ((c && c.offsetWidth) || 58) / 2; }

function measure() {
  const nav = document.querySelector(NAV_SEL) || document.querySelector('header');
  const logo = document.querySelector(LOGO_SEL);
  if (!nav || !logo) { A.ready = false; return; }
  const n = nav.getBoundingClientRect(), l = logo.getBoundingClientRect();
  if (!l.width || !n.height) { A.ready = false; return; }
  const sx = scrollX, sy = scrollY;
  let fixed = false;
  for (let e = nav; e && e !== document.body; e = e.parentElement) {
    const p = getComputedStyle(e).position;
    if (p === 'fixed' || p === 'sticky') { fixed = true; break; }
  }
  A.navBottom = n.bottom + (fixed ? 0 : sy);
  A.logoTop = l.top + sy;
  A.docX = l.left + sx + l.width / 2;
  A.docY = (A.navBottom + A.logoTop) / 2;
  A.ready = true; A.sunGap = null;
  window.dispatchEvent(new CustomEvent('elev8mi:hero-apex', {detail: snapshot()}));
}

const apexYFor = r => {
  const belowNav = A.navBottom + MARGIN + r;
  const aboveLogo = A.logoTop - MARGIN - r;
  if (aboveLogo <= belowNav) return aboveLogo;
  return Math.min(Math.max(A.docY, belowNav), aboveLogo);
};
function snapshot() { return {x: A.docX, y: A.docY, navBottom: A.navBottom, logoTop: A.logoTop, sunY: apexYFor(sunRadius()), moonY: apexYFor(moonRadius()), sunR: sunRadius(), moonR: moonRadius()}; }

let queued = 0;
const queue = () => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; measure(); }); };
addEventListener('resize', queue, {passive: true});
addEventListener('orientationchange', () => { queue(); setTimeout(queue, 350); }, {passive: true});
document.fonts?.ready.then(queue);
addEventListener('load', queue);
addEventListener('elev8mi:boot-release', () => { queue(); setTimeout(queue, 400); setTimeout(queue, 1400); });
const logoEl = document.querySelector(LOGO_SEL);
if ('ResizeObserver' in window) {
  const ro = new ResizeObserver(queue);
  [document.querySelector(NAV_SEL), logoEl, document.querySelector('.solar-system')].forEach(e => e && ro.observe(e));
}
measure();

window.Elev8HeroApex = {
  get ready() { return A.ready; },
  get apex() { return snapshot(); },
  recompute: measure,
  moonArc(cx, cy, rx, ry, rootTop, rootLeft) {
    if (!A.ready) return null;
    const rootDocTop = rootTop + scrollY, rootDocLeft = rootLeft + scrollX;
    const r = moonRadius(), off = r - 22;
    const top = apexYFor(r) - rootDocTop - off, bottom = cy + ry;
    if (!(bottom - top > 8)) return null;
    return {cx: A.docX - rootDocLeft - off, cy: (top + bottom) / 2, rx, ry: (bottom - top) / 2};
  },
  sunRise(horizon, radius) {
    if (!A.ready) return null;
    if (A.sunGap === null || scrollY < 1) A.sunGap = horizon - (apexYFor(radius) - scrollY);
    return Math.max(0, A.sunGap + radius);
  },
  sunLeft(azimuth) { return A.ready ? `${A.docX - scrollX + (azimuth - .5) * innerWidth * .35}px` : null; },
};
export default window.Elev8HeroApex;
