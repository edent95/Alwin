// ---------- Projects(首页「Projek」:数据在 projects.js,由 scripts/zeon-projects.py 生成) ----------
// 必须在下面 setLang 之前渲染:卡片里的 data-ms / data-en / data-zh 要被第一次 setLang 一起切换。
const PROJECT_LIMIT = 9;
const T = (ms, en, zh) => `data-ms="${ms}" data-en="${en}" data-zh="${zh}">${ms}`;
const KIND = {
  condo: T('Kondominium', 'Condominium', '公寓'),
  house: T('Rumah', 'House', '住宅'),
  commercial: T('Komersial', 'Commercial', '商业'),
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
(function renderProjects() {
  const grid = document.getElementById('project-grid');
  if (!grid || !Array.isArray(window.PROJECTS)) return;
  const total = document.getElementById('project-total');
  if (total) total.textContent = window.PROJECTS.length;
  grid.innerHTML = window.PROJECTS.map((p) => {
    const cats = [p.s, p.k === 'commercial' ? 'commercial' : ''].join(' ').trim();
    const status = p.s === 'rent' ? T('Disewa', 'For rent', '出租') : T('Dijual', 'For sale', '出售');
    const per = p.s === 'rent' ? ` <small ${T('/ bulan', '/ month', '/ 月')}</small>` : '';
    const kind = KIND[p.k] ? ` · <span ${KIND[p.k]}</span>` : '';
    const size = p.sq ? `<span class="project-size">${p.sq.toLocaleString('en')} sq ft</span>` : '';
    return `<article class="project" data-cat="${cats}"><a href="${esc(p.u)}" target="_blank" rel="noopener">
      <div class="project-img">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" decoding="async">` : ''}<span class="tag tag-${p.s}" ${status}</span></div>
      <div class="project-body">
        <h3>${esc(p.t)}</h3>
        <p class="project-meta"><strong>RM ${p.p.toLocaleString('en')}</strong>${per}</p>
        <p class="project-sub">${size}${kind}</p>
      </div></a></article>`;
  }).join('');
})();

// ---------- Language: BM / EN / 中文 ----------
const LANGS = ['ms', 'en', 'zh'];
const htmlLang = { ms: 'ms', en: 'en', zh: 'zh' };

function setLang(lang) {
  if (!LANGS.includes(lang)) lang = 'ms';
  document.documentElement.lang = htmlLang[lang];
  document.title = lang === 'zh' ? '林智成 · Alwin Lim Zh Chen' : 'Alwin Lim Zh Chen';
  document.querySelectorAll('[data-ms]').forEach((el) => {
    const v = el.dataset[lang];
    if (v != null) el.innerHTML = v;
  });
  document.querySelectorAll('.lang button').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  orderNews(lang);
  try { localStorage.setItem('lang', lang); } catch {}
}

// News: stories in the reader's language first, then the rest; newest first within each group.
// The first story becomes the wide feature card, but only if it has a photo (a plain type cover looks empty that wide).
function orderNews(lang) {
  const list = document.querySelector('.stories');
  if (!list) return;
  const items = [...list.querySelectorAll('.story')];
  items.forEach((el, i) => { if (el.dataset.i == null) el.dataset.i = i; });
  const match = (el) => (el.dataset.srcLang || '').split(' ').includes(lang) ? 0 : 1;
  items.sort((a, b) => match(a) - match(b) || a.dataset.i - b.dataset.i);
  items.forEach((el, i) => { el.classList.toggle('is-feature', i === 0 && !!el.querySelector('.cover img')); list.appendChild(el); });
}
document.querySelectorAll('.lang button').forEach((b) =>
  b.addEventListener('click', () => setLang(b.dataset.lang)));

let initial = null;
try { initial = localStorage.getItem('lang'); } catch {}
const urlLang = new URLSearchParams(location.search).get('lang');
if (urlLang) initial = urlLang;
if (initial && initial !== 'ms') setLang(initial); else orderNews('ms');

// ---------- Mobile menu ----------
const nav = document.getElementById('nav');
const menu = document.querySelector('.menu');
const closeMenu = () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); };
menu.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});
nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// ---------- Reveal on scroll (staggered within a group) ----------
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const groups = new Map();
  reveals.forEach((el) => {
    const parent = el.parentElement;
    const i = groups.get(parent) || 0;
    el.style.setProperty('--d', `${Math.min(i, 5) * 70}ms`);
    groups.set(parent, i + 1);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add('in'));
}

// ---------- Active section in nav ----------
const links = [...nav.querySelectorAll('a[href^="#"]')];
const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
if ('IntersectionObserver' in window) {
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
  const top = document.getElementById('top'); if (top) spy.observe(top);
}

document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Category chips(Pandangan / Projek 共用) ----------
// 容器 .chips[data-filter=<网格选择器>];网格里每张卡 data-cat 是空格分隔的分类。项目网格另有「先显示 9 个」的上限。
const moreBtn = document.getElementById('project-more');
let projectsExpanded = false;
function applyFilter(grid, cat) {
  const cards = [...grid.querySelectorAll('[data-cat]')];
  let shown = 0;
  cards.forEach((el) => {
    const match = cat === 'all' || el.dataset.cat.split(' ').includes(cat);
    const overLimit = grid.id === 'project-grid' && !projectsExpanded && match && shown >= PROJECT_LIMIT;
    el.hidden = !match || overLimit;
    if (match) shown++;
  });
  if (grid.id === 'project-grid' && moreBtn) moreBtn.hidden = projectsExpanded || shown <= PROJECT_LIMIT;
}
document.querySelectorAll('.chips[data-filter]').forEach((chips) => {
  const grid = document.querySelector(chips.dataset.filter);
  if (!grid) return;
  const current = () => chips.querySelector('[aria-pressed="true"]')?.dataset.cat || 'all';
  chips.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    chips.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    applyFilter(grid, b.dataset.cat);
  }));
  if (moreBtn && grid.id === 'project-grid') moreBtn.addEventListener('click', () => { projectsExpanded = true; applyFilter(grid, current()); });
  applyFilter(grid, current());
});

// ---------- Count up(数字滚到视口才从 0 数上去;减少动效时直接显示终值) ----------
const countEls = document.querySelectorAll('#project-total');
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const co = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    co.unobserve(e.target);
    const end = Number(e.target.textContent) || 0;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1100);
      e.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  countEls.forEach((el) => co.observe(el));
}

// ---------- 观点卡插图:在视口里才动 ----------
const arts = document.querySelectorAll('.view-art');
if ('IntersectionObserver' in window) {
  const ao = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('is-on', e.isIntersecting)), { threshold: 0.2 });
  arts.forEach((el) => ao.observe(el));
} else arts.forEach((el) => el.classList.add('is-on'));
