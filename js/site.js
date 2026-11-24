// SADA site behaviour, shared by every page. Everything here enhances markup that already works without it.
const root = document.documentElement;
const mast = document.querySelector('.mast');
const phone = window.matchMedia('(max-width: 999px)');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

// ----- boot loader: only shown when fonts and the lead picture are still missing after 400ms.
// It waits for what the first screen needs, not for every lazy image (window load).
const boot = document.getElementById('boot');
if (document.readyState !== 'complete') {
  const late = setTimeout(() => boot.classList.add('is-on'), 400);
  const done = () => {
    clearTimeout(late);
    boot.classList.remove('is-on');
  };
  const hero = document.querySelector('img[fetchpriority="high"]');
  const firstScreen = Promise.all([
    document.fonts ? document.fonts.ready : null,
    hero ? hero.decode().catch(() => null) : null,
  ]);
  firstScreen.then(done);
  window.addEventListener('load', done, { once: true });
}

// ----- masthead: condense after the first screenful, step aside on phones while reading down
let lastY = window.scrollY;
let ticking = false;
function onScroll() {
  const y = window.scrollY;
  // two thresholds, so the height change cannot flip the state back while settling
  if (y > 120) mast.classList.add('is-small');
  else if (y < 60) mast.classList.remove('is-small');
  if (phone.matches) {
    const goingDown = y > lastY && y > 240;
    if (Math.abs(y - lastY) > 6) mast.classList.toggle('is-away', goingDown);
  } else {
    mast.classList.remove('is-away');
  }
  lastY = y;
  ticking = false;
}
window.addEventListener('scroll', () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(onScroll);
}, { passive: true });
onScroll();

// ----- breaking strip: rotate headlines, hold while the reader is on it
const breakItems = [...document.querySelectorAll('.break-item')];
const breakTime = document.querySelector('.break-time');
let breakIndex = 0;
let hovered = false;
let focused = false;
// only the headline on show is reachable by keyboard and screen readers
function showBreak(index) {
  breakItems.forEach((item, i) => {
    const on = i === index;
    item.classList.toggle('is-on', on);
    item.tabIndex = on ? 0 : -1;
    item.setAttribute('aria-hidden', String(!on));
    if (on && breakTime) breakTime.textContent = item.dataset.time;
  });
}
showBreak(0);
const strip = document.querySelector('.break');
strip.addEventListener('pointerenter', () => { hovered = true; });
strip.addEventListener('pointerleave', () => { hovered = false; });
strip.addEventListener('focusin', () => { focused = true; });
strip.addEventListener('focusout', () => { focused = false; });
if (!calm.matches && breakItems.length > 1) {
  setInterval(() => {
    if (hovered || focused || document.hidden) return;
    breakIndex = (breakIndex + 1) % breakItems.length;
    showBreak(breakIndex);
  }, 5200);
}

// ----- stage: the rail picks which lead story is on view
const leads = [...document.querySelectorAll('.lead')];
if (leads.length) {
const railItems = [...document.querySelectorAll('.rail-item')];
const view = document.querySelector('.stage-view');
let leadIndex = 0;
function showLead(index) {
  if (index === leadIndex && leads[index].classList.contains('is-on')) return;
  leadIndex = index;
  leads.forEach((lead, i) => lead.classList.toggle('is-on', i === index));
  railItems.forEach((item, i) => {
    item.classList.toggle('is-on', i === index);
    item.setAttribute('aria-pressed', String(i === index));
  });
}
let hoverTimer;
railItems.forEach((item, index) => {
  item.addEventListener('click', () => {
    if (phone.matches) {
      // scroll the row itself; scrollIntoView would also shift the whole page sideways in RTL
      const delta = leads[index].getBoundingClientRect().right - (view.getBoundingClientRect().right - 16);
      view.scrollBy({ left: delta, behavior: calm.matches ? 'auto' : 'smooth' });
    } else {
      showLead(index);
    }
  });
  item.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || phone.matches) return;
    hoverTimer = setTimeout(() => showLead(index), 140);
  });
  item.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
});
// on phones the leads are a swipe row; mark whichever one is in view
const leadSpy = new IntersectionObserver((entries) => {
  if (!phone.matches) return;
  for (const entry of entries) {
    if (entry.isIntersecting) showLead(leads.indexOf(entry.target));
  }
}, { root: view, threshold: 0.6 });
leads.forEach((lead) => leadSpy.observe(lead));
}

// ----- reveal once: section roads draw, the two wide pictures uncover
const once = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add('seen');
    once.unobserve(entry.target);
  }
}, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
document.querySelectorAll('.sec-head, .rv').forEach((el) => once.observe(el));

// ----- section spy (home only): light up the region in the masthead and the tab bar
if (document.body.classList.contains('p-home')) {
  const spyLinks = [...document.querySelectorAll('.regions a, .tabbar a')];
  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      spyLinks.forEach((link) => {
        const here = link.dataset.spy === entry.target.id;
        link.classList.toggle('is-here', here);
        if (here) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-35% 0px -55% 0px' });
  // the stage has no id, so reaching it again clears the highlight
  document.querySelectorAll('main section[id], main .stage').forEach((section) => spy.observe(section));
}

// ----- search + sections sheet
const sheet = document.getElementById('sheet');
document.querySelectorAll('[data-open-sheet]').forEach((button) => {
  button.addEventListener('click', () => {
    sheet.showModal();
    if (!phone.matches) sheet.querySelector('input').focus();
  });
});
// a click on the dialog element itself can also land in its padding, so check the box
sheet.addEventListener('click', (event) => {
  const box = sheet.getBoundingClientRect();
  const outside = event.clientX < box.left || event.clientX > box.right
    || event.clientY < box.top || event.clientY > box.bottom;
  if ((event.target === sheet && outside) || event.target.closest('.sheet-links a')) sheet.close();
});

// ----- copy a link or address, with a short confirmation in the button itself
document.querySelectorAll('[data-copy]').forEach((button) => {
  const label = button.textContent;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = 'تم النسخ';
    } catch {
      button.textContent = 'انسخه يدوياً';
    }
    setTimeout(() => { button.textContent = label; }, 1800);
  });
});

// ----- region filter on the editor's archive
const deskRows = [...document.querySelectorAll('.desk-rows li')];
const deskChips = [...document.querySelectorAll('.p-author .chip')];
const deskStatus = document.getElementById('desk-status');
deskChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const want = chip.dataset.filter;
    deskChips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    deskRows.forEach((row) => { row.hidden = want !== 'all' && row.dataset.region !== want; });
    if (deskStatus) deskStatus.textContent = `يظهر ${deskRows.filter((row) => !row.hidden).length} من ${deskRows.length} خبراً`;
  });
});

root.classList.add('ready');
