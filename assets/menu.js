/* ===========================================================
   mirza.tech v4 — menu.js
   Mobile hamburger menu (≤720px). Standalone on purpose: no
   GSAP/module dependencies so the speaker kit and any future
   subpage can load it alone. The overlay sits above both topbar
   twins (z-index 70), so the nav-invert clipping never touches it.
   =========================================================== */
(() => {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;
  const toggles = document.querySelectorAll('.nav-toggle');
  const setOpen = (open) => {
    menu.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    toggles.forEach(t => t.setAttribute('aria-expanded', String(open)));
  };
  toggles.forEach(t => t.addEventListener('click', () => setOpen(true)));
  menu.querySelector('.mobile-menu-close').addEventListener('click', () => setOpen(false));
  // any navigation out of the menu closes it (links are same-page anchors)
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
})();
