// 三页共用的 <head>、页首导航、天际线、页脚 —— 以前三页各抄一份,现在只有这一份。
import fs from 'node:fs';
import { T, esc, v, join, P, lang, LANGS } from './h.mjs';

const BASE = 'https://alwinlim.com';
const OG_LOCALE = { en: 'en_MY', ms: 'ms_MY', zh: 'zh_MY' };
// head() 记下当前页的路径,masthead() 的语言切换要用(每页都是先 head 再 masthead)
let pagePath = '';
/** 某语言版本的完整网址;path 不带语言前缀,如 '' / 'about' / 'views/x' */
export const urlFor = (path, l = lang()) => BASE + P(`/${path}`, l);

const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&amp;family=Inter:wght@400;500;600&amp;family=Noto+Serif+SC:wght@600;700&amp;display=swap';

const SKYLINE = fs.readFileSync(new URL('./partials/skyline.html', import.meta.url), 'utf8').trimEnd();

/**
 * @param {object} o
 * @param {string} o.title   <title> 文字(马来文;三语时传 { ms, en, zh })
 * @param {string} o.description
 * @param {string} o.path    '' | 'about' | 'gallery' | 'views/<网址名>'(不带语言前缀;canonical、hreflang 用。全站网址不带 .html,GitHub Pages 会自动找 .html 文件)
 * @param {string} [o.extra] 额外放进 <head> 的(og、JSON-LD)。没写 og:title 的页面自动补一组基本 og(标题、描述、网址、照片)
 * @param {string} [o.image] 自动补的 og:image(默认 Alwin 的照片)
 */
export const head = ({ title, description, path, extra = '', image = '/images/alwin.jpg' }) => {
  pagePath = path;
  if (!extra.includes('og:title')) extra = `  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(v(title))}">
  <meta property="og:description" content="${esc(v(description))}">
  <meta property="og:url" content="${urlFor(path)}">
  <meta property="og:image" content="${BASE}${esc(image)}">
  <meta name="twitter:card" content="summary">
${extra}`;
  return `<!doctype html>
<html lang="${lang()}">
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
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <!-- 字体不挡首屏:先用本机字体显示,字体到了再换(display=swap)。没有 JS 时 noscript 照常加载 -->
  <link rel="preload" as="style" href="${FONTS}" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="${FONTS}"></noscript>
  <link rel="stylesheet" href="/styles.css">
  <link rel="canonical" href="${urlFor(path)}">
${LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${urlFor(path, l)}">`).join('\n')}
  <link rel="alternate" hreflang="x-default" href="${urlFor(path, 'en')}">
  <meta property="og:locale" content="${OG_LOCALE[lang()]}">
${LANGS.filter((l) => l !== lang()).map((l) => `  <meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`).join('\n')}
</head>`; };

/** 页首:page = 'index' | 'about' | 'gallery' | 'views'(观点文章页)。路径一律从根 / 开始:文章页在 /views/ 子目录里 */
export const masthead = (site, page) => {
  const n = site.nav;
  const home = page === 'index' ? '' : P('/');
  const item = (href, label, key, extra = '') => {
    const active = page === key ? ' class="is-active" aria-current="page"' : '';
    return `      <a href="${href}"${active}${extra}${T(label)}</a>`;
  };
  return `<a class="skip" href="#main"${T(site.skip)}</a>

<header class="masthead">
  <div class="wrap masthead-inner">
    <a href="${page === 'index' ? '#top' : P('/')}" class="brand" aria-label="${esc(v(site.name))}">
      <span class="brand-en">${v(site.name)}</span>
      <span class="brand-zh">${v(site.name_zh)}</span>
    </a>
    <nav class="nav" id="nav" aria-label="Utama">
${[
    item(P('/about'), n.about, 'about'),
    item(`${home}#views`, n.views, 'views'),
    item(`${home}#journey`, n.journey),
    item(`${home}#projects`, n.projects),
    item(`${home}#listings`, n.listings),
    item(`${home}#news`, n.news),
    item(P('/gallery'), n.gallery, 'gallery'),
    item('#contact', n.contact, null, ' class="nav-cta"'),
  ].join('\n')}
    </nav>
    <div class="lang" role="group" aria-label="Bahasa / Language / 语言">
${[['en', 'EN'], ['ms', 'BM'], ['zh', '中文']].map(([l, label]) => `      <a href="${P(`/${pagePath}`, l)}" hreflang="${l}" lang="${l}" data-lang="${l}"${l === lang() ? ' aria-current="true"' : ''}>${label}</a>`).join('\n')}
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

${scripts.map((s) => `<script src="/${s.replace(/^\//, '')}"></script>`).join('\n')}
</body>
</html>
`;
