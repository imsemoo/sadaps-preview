// Search over the stories in this edition. Reads ?q= so the header form works on every page.
const data = JSON.parse(document.getElementById('find-index').textContent);
const input = document.getElementById('find-q');
const list = document.getElementById('find-list');
const empty = document.getElementById('find-empty');
const count = document.getElementById('find-count');
const chips = [...document.querySelectorAll('.page-search .chip')];
let region = 'all';

// Arabic letters that readers type interchangeably, folded so "اقصى" finds "الأقصى"
const fold = (text) => text
  .replace(/[ً-ٰٕـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .toLowerCase();

const MARKS = /[ً-ٰٕ]/;

// Arabic number agreement: خبر واحد، خبران، 3 أخبار، 11 خبراً
const counted = (n, one, two, few, many) => {
  if (n === 1) return one;
  if (n === 2) return two;
  return n <= 10 ? `${n} ${few}` : `${n} ${many}`;
};

const esc = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// fold character by character and remember where each folded character came from,
// so a highlight lands on the right letters even when diacritics were dropped
function foldMap(text) {
  let out = '';
  const at = [];
  [...text].forEach((ch, i) => {
    const f = fold(ch);
    for (const c of f) { out += c; at.push(i); }
  });
  return { out, at };
}

function mark(text, words) {
  if (!words.length) return esc(text);
  const chars = [...text];
  const { out, at } = foldMap(text);
  const hits = [];
  words.forEach((w) => {
    let pos = out.indexOf(w);
    while (pos !== -1) {
      // carry the diacritics that follow the last letter into the highlight
      let end = at[pos + w.length - 1] + 1;
      while (end < chars.length && MARKS.test(chars[end])) end += 1;
      hits.push([at[pos], end]);
      pos = out.indexOf(w, pos + w.length);
    }
  });
  if (!hits.length) return esc(text);
  hits.sort((x, y) => x[0] - y[0]);
  let html = '';
  let cur = 0;
  hits.forEach(([s, e]) => {
    if (s < cur) return;
    html += esc(chars.slice(cur, s).join('')) + '<mark>' + esc(chars.slice(s, e).join('')) + '</mark>';
    cur = e;
  });
  return html + esc(chars.slice(cur).join(''));
}

function render() {
  const q = input.value.trim();
  const words = fold(q).split(/\s+/).filter((w) => w.length > 1);
  const pool = data.filter((s) => region === 'all' || s.r === region);
  const found = words.length
    ? pool.filter((s) => { const hay = fold(s.t + ' ' + (s.x || '') + ' ' + s.rn); return words.every((w) => hay.includes(w)); })
    : [];
  list.innerHTML = found.map((s) => `
    <li data-region="${esc(s.r)}">
      <a href="${esc(s.u)}">
        <figure><img src="${esc(s.i)}" alt="${esc(s.a)}" loading="lazy"></figure>
        <div><span class="region-tag">${esc(s.rn)}</span><h2>${mark(s.t, words)}</h2>${s.x ? `<p>${mark(s.x, words)}</p>` : ''}<time datetime="${esc(s.d)}">${esc(s.w)}</time></div>
      </a>
    </li>`).join('');
  empty.hidden = !words.length || found.length > 0;
  if (!words.length) count.textContent = `اكتب كلمة للبحث في ${counted(pool.length, 'خبر واحد', 'خبرين', 'أخبار', 'خبراً')}.`;
  else count.textContent = found.length
    ? `${counted(found.length, 'نتيجة واحدة', 'نتيجتان', 'نتائج', 'نتيجة')} عن «${q}»`
    : `لا نتائج عن «${q}»`;
  document.title = q ? `${q} | البحث في صدى فلسطين` : 'البحث | صدى فلسطين';
}

const params = new URLSearchParams(location.search);
input.value = params.get('q') || '';
input.addEventListener('input', () => {
  const url = new URL(location.href);
  if (input.value.trim()) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
  history.replaceState(null, '', url);
  render();
});
input.form.addEventListener('submit', (event) => { event.preventDefault(); render(); });
chips.forEach((chip) => chip.addEventListener('click', () => {
  region = chip.dataset.filter;
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  render();
}));
render();
if (!input.value) input.focus();
