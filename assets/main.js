/* ===========================================================
   mirza.tech v3 — main.js  (ES module)
   GSAP + ScrollTrigger orchestration. The single source of all
   scroll behaviour: reveals, stat count-ups, nav active state,
   topbar stuck, the two color-block wipes, and the WebGL gating
   that drives scene.js (window.MZScene). No manual scroll
   listeners, no requestAnimationFrame here.
   =========================================================== */
const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ENABLED = !!(gsap && ScrollTrigger) && !REDUCED;

/* ---------- helpers ---------- */
function fmtCount(el, v){
  const prefix = el.dataset.prefix || '', suffix = el.dataset.suffix || '';
  const num = Math.round(v).toLocaleString('en-US');
  const s = prefix + num + suffix;
  el.innerHTML = el.dataset.em === '1' ? '<em>' + s + '</em>' : s;
}
function finalCount(el){ fmtCount(el, parseFloat(el.dataset.count)); }

/* ---------- nav invert: clip the light/dark topbar twins against dark bands ----------
   Pixel-by-pixel color flip at section boundaries with brand colors intact
   (a blend-mode approach can't keep the blue dot blue). Assumes at most one
   dark/light boundary crosses the ~60px bar at a time, which holds for the
   page's full-width dark bands. */
(function navInvert(){
  const light = document.getElementById('topbar');
  const dark = document.getElementById('topbarDark');
  if (!light || !dark) return;
  const darkEls = Array.from(document.querySelectorAll('.section.cred, .section.contact, .site-footer, .org-panel'));
  if (!darkEls.length) return;
  const update = () => {
    const h = light.offsetHeight || 64;
    const w = window.innerWidth;
    let band = null;
    for (const el of darkEls) {
      const r = el.getBoundingClientRect();
      const t = Math.max(0, r.top), b = Math.min(h, r.bottom);
      if (b > t && (!band || t < band.t)) band = { t, b, l: Math.max(0, r.left), r: Math.min(w, r.right), el };
    }
    dark.classList.toggle('over-blue', !!band && (band.el.classList.contains('org-panel') || band.el.classList.contains('cred')));
    if (!band) {
      dark.style.clipPath = 'inset(0 0 100% 0)';
      light.style.clipPath = 'none';
    } else {
      // dark twin shows only the band's rect; light twin shows its complement
      // (evenodd path punches the rect out), so non-full-width dark surfaces
      // like the org panel invert only where they actually are.
      dark.style.clipPath = `inset(${band.t}px ${w - band.r}px ${h - band.b}px ${band.l}px)`;
      light.style.clipPath = `path(evenodd, "M0 0H${w}V${h}H0Z M${band.l} ${band.t}H${band.r}V${band.b}H${band.l}Z")`;
    }
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
})();

/* ---------- graceful fallback (no GSAP, or reduced motion) ---------- */
if (!ENABLED) {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  document.querySelectorAll('[data-count]').forEach(finalCount);
  document.querySelectorAll('[data-priceflip]').forEach(el => el.classList.add('run'));
  // still toggle the topbar so it doesn't float transparent over content
  const tb = document.getElementById('topbar');
  if (tb) window.addEventListener('scroll', () => tb.classList.toggle('is-stuck', window.scrollY > 8), { passive: true });
} else {
  gsap.registerPlugin(ScrollTrigger);

  /* 1. topbar stuck */
  const topbar = document.getElementById('topbar');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: self => topbar.classList.toggle('is-stuck', self.scroll() > 8) });

  /* 2. reveals — one batch owns every .reveal element */
  ScrollTrigger.batch('.reveal', {
    start: 'top 86%',
    onEnter: els => els.forEach(el => el.classList.add('in'))
  });

  /* 3. stat count-ups */
  ScrollTrigger.batch('[data-count]', {
    start: 'top 90%', once: true,
    onEnter: els => els.forEach(el => {
      const target = parseFloat(el.dataset.count), o = { v: 0 };
      gsap.to(o, { v: target, duration: 1.0, ease: 'power2.out', onUpdate: () => fmtCount(el, o.v) });
    })
  });

  /* 4b. pricing flip — bars run once when the block enters */
  gsap.utils.toArray('[data-priceflip]').forEach(el => {
    ScrollTrigger.create({ trigger: el, start: 'top 82%', once: true, onEnter: () => el.classList.add('run') });
  });

  /* 5. nav active state (both topbar twins) */
  document.querySelectorAll('.topbar nav a').forEach(a => {
    const sec = document.getElementById(a.getAttribute('href').slice(1));
    if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: 'top center', end: 'bottom center', onToggle: self => a.classList.toggle('is-active', self.isActive) });
  });

  /* 6. WebGL gating + one-shot pipeline fire (drives scene.js) */
  const MZ = () => window.MZScene;
  const heroSec = document.getElementById('hero');
  if (heroSec) ScrollTrigger.create({ trigger: heroSec, start: 'top bottom', end: 'bottom top', onToggle: s => MZ() && MZ().setHeroEnabled(s.isActive) });
  const pipe = document.querySelector('.pipeline');
  if (pipe) {
    ScrollTrigger.create({ trigger: pipe, start: 'top bottom', end: 'bottom top', onToggle: s => MZ() && MZ().setPipelineEnabled(s.isActive) });
    ScrollTrigger.create({ trigger: pipe, start: 'top 75%', once: true, onEnter: () => MZ() && MZ().firePipeline() });
  }

  /* keep ScrollTrigger measurements correct once fonts/3D settle */
  window.addEventListener('load', () => ScrollTrigger.refresh());
}
