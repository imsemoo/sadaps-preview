// SADA site behaviour, shared by every page. Everything here enhances markup that already works without it.
const root = document.documentElement;
const mast = document.querySelector('.mast');
const phone = window.matchMedia('(max-width: 999px)');
const calm = window.matchMedia('(prefers-reduced-motion: reduce)');

// ----- boot loader: only shown when the page is still loading after 400ms
const boot = document.getElementById('boot');
if (document.readyState !== 'complete') {
  const late = setTimeout(() => boot.classList.add('is-on'), 400);
  window.addEventListener('load', () => {
    clearTimeout(late);
    boot.classList.remove('is-on');
  }, { once: true });
}

// ----- masthead: condense after the first screenful, step aside on phones while reading down
let lastY = window.scrollY;
let ticking = false;
function onScroll() {
  const y = window.scrollY;
  mast.classList.toggle('is-small', y > 90);
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
let breakHeld = false;
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
strip.addEventListener('pointerenter', () => { breakHeld = true; });
strip.addEventListener('pointerleave', () => { breakHeld = false; });
strip.addEventListener('focusin', () => { breakHeld = true; });
strip.addEventListener('focusout', () => { breakHeld = false; });
if (!calm.matches && breakItems.length > 1) {
  setInterval(() => {
    if (breakHeld || document.hidden) return;
    breakIndex = (breakIndex + 1) % breakItems.length;
    showBreak(breakIndex);
  }, 5200);
}

// ----- stage: the rail picks which lead story is on view
const leads = [...document.querySelectorAll('.lead')];
if (leads.length) {
const railItems = [...document.querySelectorAll('.rail-item')];
const view = document.querySelector('.stage-view');
function showLead(index) {
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
      leads[index].scrollIntoView({ behavior: calm.matches ? 'auto' : 'smooth', inline: 'start', block: 'nearest' });
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
  document.querySelectorAll('main section[id]').forEach((section) => spy.observe(section));
}

// ----- search + sections sheet
const sheet = document.getElementById('sheet');
document.querySelectorAll('[data-open-sheet]').forEach((button) => {
  button.addEventListener('click', () => {
    sheet.showModal();
    if (!phone.matches) sheet.querySelector('input').focus();
  });
});
sheet.addEventListener('click', (event) => {
  if (event.target === sheet || event.target.closest('.sheet-links a')) sheet.close();
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
deskChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const want = chip.dataset.filter;
    deskChips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    deskRows.forEach((row) => { row.hidden = want !== 'all' && row.dataset.region !== want; });
  });
});

root.classList.add('ready');
