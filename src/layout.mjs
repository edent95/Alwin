// 三页共用的 <head>、页首导航、天际线、页脚 —— 以前三页各抄一份,现在只有这一份。
import fs from 'node:fs';
import { T, esc, v, join } from './h.mjs';

const SKYLINE = fs.readFileSync(new URL('./partials/skyline.html', import.meta.url), 'utf8').trimEnd();

/**
 * @param {object} o
 * @param {string} o.title   <title> 文字(马来文;三语时传 { ms, en, zh })
 * @param {string} o.description
 * @param {string} o.path    '' | 'about.html' | 'gallery.html'(canonical 用)
 * @param {string} [o.extra] 额外放进 <head> 的(og、JSON-LD)
 */
export const head = ({ title, description, path, extra = '' }) => `<!doctype html>
<html lang="ms">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Google Analytics(GA4 资源 alwinlim.com,账户 Alwin Lim)—— Search Console 靠它验证,别删 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-QY6LH8XMJN"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-QY6LH8XMJN');
  </script>
  <title${T(title)}</title>
  <meta name="description" content="${esc(v(description))}">
${extra}  <meta name="theme-color" content="#f4efe6">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="icon" href="favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=Noto+Serif+SC:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <link rel="canonical" href="https://alwinlim.com/${path}">
</head>`;

/** 页首:page = 'index' | 'about' | 'gallery'。首页里的锚点不带 index.html */
export const masthead = (site, page) => {
  const n = site.nav;
  const home = page === 'index' ? '' : 'index.html';
  const item = (href, label, key, extra = '') => {
    const active = page === key ? ' class="is-active" aria-current="page"' : '';
    return `      <a href="${href}"${active}${extra}${T(label)}</a>`;
  };
  return `<a class="skip" href="#main"${T(site.skip)}</a>

<header class="masthead">
  <div class="wrap masthead-inner">
    <a href="${page === 'index' ? '#top' : 'index.html'}" class="brand" aria-label="${esc(v(site.name))}">
      <span class="brand-en">${v(site.name)}</span>
      <span class="brand-zh">${v(site.name_zh)}</span>
    </a>
    <nav class="nav" id="nav" aria-label="Utama">
${[
    item('about.html', n.about, 'about'),
    item(`${home}#views`, n.views),
    item(`${home}#journey`, n.journey),
    item(`${home}#projects`, n.projects),
    item(`${home}#listings`, n.listings),
    item(`${home}#news`, n.news),
    item('gallery.html', n.gallery, 'gallery'),
    item('#contact', n.contact, null, ' class="nav-cta"'),
  ].join('\n')}
    </nav>
    <div class="lang" role="group" aria-label="Bahasa / Language / 语言">
      <button data-lang="ms" aria-pressed="true">BM</button>
      <button data-lang="en" aria-pressed="false">EN</button>
      <button data-lang="zh" aria-pressed="false">中文</button>
    </div>
    <button class="menu" aria-controls="nav" aria-expanded="false" aria-label="Menu">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
    </button>
  </div>
</header>`;
};

export const footer = (site, scripts) => `${SKYLINE}

<!-- CONTACT / FOOTER -->
<footer class="footer" id="contact">
  <div class="wrap footer-grid">
    <div class="footer-lead">
      <p class="label light"${T(site.contact.label)}</p>
      <h2${T(site.contact.title)}</h2>
      <div class="channels">
${join(site.contact.channels, (c) => `        <a class="ch" href="${esc(v(c.url))}" target="_blank" rel="noopener"${T(c.label)}</a>`)}
      </div>
    </div>
    <div class="footer-meta">
      <p class="brand light"><span class="brand-en">${v(site.name)}</span> <span class="brand-zh">${v(site.name_zh)}</span></p>
      <p${T(site.tagline)}</p>
      <p class="copy">© <span id="year">${new Date().getFullYear()}</span> ${v(site.full_name)}</p>
    </div>
  </div>
</footer>

${scripts.map((s) => `<script src="${s}"></script>`).join('\n')}
</body>
</html>
`;
