// Brand book behaviour: play each motion demo once when seen, replay on request,
// and keep the side index in sync with the section on screen.
const sections = document.querySelectorAll('section.sec');
const demos = document.querySelectorAll('.motion');
const indexLinks = new Map(
  [...document.querySelectorAll('.index a')].map((a) => [a.getAttribute('href').slice(1), a])
);

const seen = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add(entry.target.matches('.motion') ? 'play' : 'in');
    seen.unobserve(entry.target);
  }
}, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });

document.querySelectorAll('.sec-head').forEach((head) => seen.observe(head));
demos.forEach((demo) => seen.observe(demo));

const current = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    indexLinks.forEach((a) => a.removeAttribute('aria-current'));
    indexLinks.get(entry.target.id)?.setAttribute('aria-current', 'true');
  }
}, { rootMargin: '-30% 0px -60% 0px' });
sections.forEach((section) => current.observe(section));

document.addEventListener('click', (event) => {
  const button = event.target.closest('.replay');
  if (!button) return;
  const demo = button.closest('.motion');
  demo.classList.remove('play');
  void demo.offsetWidth; // restart the transition from its hidden state
  demo.classList.add('play');
});
