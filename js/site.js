// SADA site behaviour, shared by every page. Each feature enhances markup that already
// works without JavaScript, and does nothing on a page that lacks its elements.

const PHONE = window.matchMedia('(max-width: 999px)'); // the CSS phone + tablet breakpoint (css/src/tokens.css)
const CALM = window.matchMedia('(prefers-reduced-motion: reduce)');

const BOOT_DELAY = 400;           // ms before the loader shows; fast loads never see it
const BREAKING_EVERY = 5200;      // ms each breaking headline stays on screen
const RAIL_HOVER_INTENT = 140;    // ms a pointer must rest on a rail item before the lead switches
const COPIED_FOR = 1800;          // ms the copy confirmation stays in the button
const CONDENSE_AT = 120;          // px scrolled before the masthead condenses
const EXPAND_AT = 60;             // px: below this it expands again (gap stops flicker)
const HIDE_AFTER = 240;           // px scrolled before the phone masthead steps aside
const SCROLL_JITTER = 6;          // px of movement ignored when deciding scroll direction

// ----- boot loader: shown only when fonts and the lead picture are still missing after BOOT_DELAY.
// It waits for what the first screen needs, not for every lazy image (window load).
function initBootLoader() {
  const boot = document.getElementById('boot');
  if (!boot || document.readyState === 'complete') return;
  const late = setTimeout(() => boot.classList.add('is-on'), BOOT_DELAY);
  const done = () => {
    clearTimeout(late);
    boot.classList.remove('is-on');
  };
  const hero = document.querySelector('img[fetchpriority="high"]');
  Promise.all([
    document.fonts ? document.fonts.ready : null,
    hero ? hero.decode().catch(() => null) : null,
  ]).then(done);
  window.addEventListener('load', done, { once: true });
}

// ----- masthead: condense after the first screenful, step aside on phones while reading down
function initMasthead() {
  const masthead = document.querySelector('.masthead');
  if (!masthead) return;
  let lastY = window.scrollY;
  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    if (y > CONDENSE_AT) masthead.classList.add('is-small');
    else if (y < EXPAND_AT) masthead.classList.remove('is-small');
    if (PHONE.matches) {
      const goingDown = y > lastY && y > HIDE_AFTER;
      if (Math.abs(y - lastY) > SCROLL_JITTER) masthead.classList.toggle('is-away', goingDown);
    } else {
      masthead.classList.remove('is-away');
    }
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

// ----- breaking strip: rotate headlines, hold while the reader is on it.
// Only the headline on show is reachable by keyboard and screen readers.
function initBreaking() {
  const strip = document.querySelector('.breaking');
  const items = [...document.querySelectorAll('.breaking-item')];
  if (!strip || !items.length) return;
  const time = strip.querySelector('.breaking-time');
  let index = 0;
  let hovered = false;
  let focused = false;
  const show = (next) => {
    items.forEach((item, i) => {
      const on = i === next;
      item.classList.toggle('is-on', on);
      item.tabIndex = on ? 0 : -1;
      item.setAttribute('aria-hidden', String(!on));
      if (on && time) time.textContent = item.dataset.time;
    });
  };
  show(0);
  strip.addEventListener('pointerenter', () => { hovered = true; });
  strip.addEventListener('pointerleave', () => { hovered = false; });
  strip.addEventListener('focusin', () => { focused = true; });
  strip.addEventListener('focusout', () => { focused = false; });
  if (CALM.matches || items.length < 2) return;
  setInterval(() => {
    if (hovered || focused || document.hidden) return;
    index = (index + 1) % items.length;
    show(index);
  }, BREAKING_EVERY);
}

// ----- stage (home hero): the rail picks which lead story is on view.
// Desktop swaps the lead in place; phones show the leads as a swipe row.
function initStage() {
  const leads = [...document.querySelectorAll('.stage-lead')];
  const view = document.querySelector('.stage-view');
  if (!leads.length || !view) return;
  const railItems = [...document.querySelectorAll('.rail-item')];
  let current = 0;
  let hoverTimer;

  const show = (index) => {
    if (index === current && leads[index].classList.contains('is-on')) return;
    current = index;
    leads.forEach((lead, i) => lead.classList.toggle('is-on', i === index));
    railItems.forEach((item, i) => {
      item.classList.toggle('is-on', i === index);
      item.setAttribute('aria-pressed', String(i === index));
    });
  };

  // scroll the row itself: scrollIntoView would also shift the whole page sideways in RTL
  const scrollRowTo = (index) => {
    const inset = parseFloat(getComputedStyle(view).scrollPaddingInlineStart) || 0;
    const delta = leads[index].getBoundingClientRect().right - (view.getBoundingClientRect().right - inset);
    view.scrollBy({ left: delta, behavior: CALM.matches ? 'auto' : 'smooth' });
  };

  railItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      if (PHONE.matches) scrollRowTo(index);
      else show(index);
    });
    item.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || PHONE.matches) return;
      hoverTimer = setTimeout(() => show(index), RAIL_HOVER_INTENT);
    });
    item.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
  });

  // on phones, mark whichever lead is in view as the reader swipes
  const inView = new IntersectionObserver((entries) => {
    if (!PHONE.matches) return;
    for (const entry of entries) {
      if (entry.isIntersecting) show(leads.indexOf(entry.target));
    }
  }, { root: view, threshold: 0.6 });
  leads.forEach((lead) => inView.observe(lead));
}

// ----- reveal once: section roads draw, the two wide pictures uncover
function initReveal() {
  const targets = document.querySelectorAll('.section-head, .reveal');
  if (!targets.length) return;
  const once = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-seen');
      once.unobserve(entry.target);
    }
  }, { threshold: 0.2, rootMargin: '0px 0px -6% 0px' });
  targets.forEach((el) => once.observe(el));
}

// ----- section spy (home only): light up the region in the masthead and the tab bar
function initSectionSpy() {
  if (!document.body.classList.contains('page-home')) return;
  const links = [...document.querySelectorAll('.masthead-nav a, .tab-bar a')];
  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach((link) => {
        const here = link.dataset.spy === entry.target.id;
        link.classList.toggle('is-here', here);
        if (here) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-35% 0px -55% 0px' });
  // the stage has no id, so reaching it again clears the highlight
  document.querySelectorAll('main section[id], main .stage').forEach((section) => spy.observe(section));
}

// ----- search + sections sheet
function initSheet() {
  const sheet = document.getElementById('sheet');
  if (!sheet) return;
  document.querySelectorAll('[data-open-sheet]').forEach((button) => {
    button.addEventListener('click', () => {
      // showModal() focuses the search input; on phones that raises the keyboard over the
      // section links, so focus moves to the dialog itself there
      sheet.showModal();
      if (PHONE.matches) sheet.focus();
    });
  });
  // a click on the dialog element itself can also land in its padding, so check the box
  sheet.addEventListener('click', (event) => {
    const box = sheet.getBoundingClientRect();
    const outside = event.clientX < box.left || event.clientX > box.right
      || event.clientY < box.top || event.clientY > box.bottom;
    if ((event.target === sheet && outside) || event.target.closest('.sheet-links a')) sheet.close();
  });
}

// ----- copy a link or address, with a short confirmation in the button itself
function initCopyButtons() {
  document.querySelectorAll('[data-copy]').forEach((button) => {
    const label = button.textContent;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = 'تم النسخ';
      } catch {
        button.textContent = 'انسخه يدوياً';
      }
      setTimeout(() => { button.textContent = label; }, COPIED_FOR);
    });
  });
}

// ----- region filter on the editor's archive
function initArchiveFilter() {
  const rows = [...document.querySelectorAll('.desk-rows li')];
  const chips = [...document.querySelectorAll('.page-author .chip')];
  const status = document.getElementById('desk-status');
  if (!rows.length || !chips.length) return;
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const want = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      rows.forEach((row) => { row.hidden = want !== 'all' && row.dataset.region !== want; });
      if (status) status.textContent = `يظهر ${rows.filter((row) => !row.hidden).length} من ${rows.length} خبراً`;
    });
  });
}

[
  initBootLoader, initMasthead, initBreaking, initStage, initReveal,
  initSectionSpy, initSheet, initCopyButtons, initArchiveFilter,
].forEach((init) => init());
