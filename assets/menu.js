/* ===========================================================
   mirza.tech v4 — menu.js
   Mobile hamburger menu (≤720px). Standalone on purpose: no
   GSAP/module dependencies so the speaker kit and any future
   subpage can load it alone. The overlay sits above both topbar
   twins (z-index 70), so the nav-invert clipping never touches it.
   Dialog semantics: focus moves into the menu on open, Tab is
   trapped while it is open, and focus returns to the opener.
   =========================================================== */
(() => {
  const menu = document.getElementById('mobileMenu');
  if (!menu) return;
  const toggles = document.querySelectorAll('.nav-toggle');
  const closeBtn = menu.querySelector('.mobile-menu-close');
  let opener = null;
  const setOpen = (open) => {
    if (open) opener = document.activeElement;
    menu.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    toggles.forEach(t => t.setAttribute('aria-expanded', String(open)));
    if (open) closeBtn.focus();
    else if (opener) { opener.focus(); opener = null; }
  };
  toggles.forEach(t => t.addEventListener('click', () => setOpen(true)));
  closeBtn.addEventListener('click', () => setOpen(false));
  // any navigation out of the menu closes it (links are same-page anchors)
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
  addEventListener('keydown', (e) => {
    if (!menu.classList.contains('is-open')) return;
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key !== 'Tab') return;
    const items = menu.querySelectorAll('a, button');
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
