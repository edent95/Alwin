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
  try { localStorage.setItem('lang', lang); } catch {}
}
document.querySelectorAll('.lang button').forEach((b) =>
  b.addEventListener('click', () => setLang(b.dataset.lang)));

let initial = null;
try { initial = localStorage.getItem('lang'); } catch {}
const urlLang = new URLSearchParams(location.search).get('lang');
if (urlLang) initial = urlLang;
if (initial && initial !== 'ms') setLang(initial);

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
