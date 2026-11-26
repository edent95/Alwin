// 观点文章页:每篇 content/views/<名>.json 一页,写到 _site/views/<名>.html。
// 正文是 body(Markdown 子集,见 src/md.mjs);旧观点没有 body,就用 excerpt 当正文。
import { T, v, esc, link, dmy, rich, ARROW, LANGS } from '../h.mjs';
import { head, masthead, footer } from '../layout.mjs';
import { mdToHtml, mdToText } from '../md.mjs';

export const viewSlug = (it) => it._file.replace(/^.*\//, '').replace(/\.json$/, '');
export const viewHref = (it) => `/views/${viewSlug(it)}.html`;
/** 三语的正文 Markdown(没有 body 用 excerpt) */
export const bodyOf = (it) => Object.fromEntries(LANGS.map((l) => [l, (it.body?.[l] || '').trim() || it.excerpt?.[l] || '']));
/** 卡片上的摘要:写了 excerpt 用 excerpt,否则从正文截 */
export const teaserOf = (it) => {
  const b = bodyOf(it);
  return (it.excerpt?.ms || '').trim() ? it.excerpt : Object.fromEntries(LANGS.map((l) => [l, mdToText(b[l], l === 'zh' ? 90 : 170)]));
};

const map3 = (x, f) => Object.fromEntries(LANGS.map((l) => [l, f(x[l], l)]));

export default function renderView({ site, home, it, art }) {
  const sec = home.views;
  const cat = sec.cats.find((c) => v(c.key) === v(it.cat));
  const slug = viewSlug(it);
  const body = bodyOf(it);
  const html = map3(body, (md) => mdToHtml(md));
  const desc = map3(body, (md) => mdToText(md, 155));
  const title = map3(it.title, (t) => String(t).replace(/\*+/g, ''));
  const docTitle = map3(title, (t) => `${t} · ${v(site.name)}`);
  const imgSrc = v(it.image?.src);
  const ogImg = `https://alwinlim.com/${String(imgSrc || v(home.seo.image)).replace(/^\//, '')}`;
  const extra = `  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${esc(v(site.full_name))}">
  <meta property="og:title" content="${esc(title.ms)}">
  <meta property="og:description" content="${esc(desc.ms)}">
  <meta property="og:url" content="https://alwinlim.com/views/${esc(slug)}.html">
  <meta property="og:image" content="${esc(ogImg)}">
  <meta property="article:published_time" content="${esc(v(it.date))}">
`;
  const cover = imgSrc
    ? `<figure class="post-cover view-photo"><img src="${esc(imgSrc)}" alt="${esc(v(it.image.alt) || '')}"></figure>`
    : `<div class="post-cover view-art tone-${esc(v(it.tone) || 'wine')}" aria-hidden="true">${art(v(it.art))}</div>`;
  const back = `<a class="post-back" href="/#views"><span aria-hidden="true">←</span> <span${T(sec.title)}</span></a>`;

  return `${head({ title: docTitle, description: desc, path: `views/${slug}.html`, extra })}
<body>
${masthead(site, 'views')}

<main id="main">
  <article class="post">
    <div class="wrap post-wrap">
      ${back}
      <p class="view-meta"><span class="view-cat"${T(cat ? cat.label : v(it.cat))}</span><time datetime="${esc(v(it.date))}">${dmy(it.date)}</time></p>
      <h1 class="post-title"${T(rich(it.title))}</h1>
      ${cover}
      <div class="post-body prose"${T(html)}</div>
${v(it.url) ? `      <p class="job-link post-source"><a ${link(v(it.url).startsWith('#') ? '/' + v(it.url) : it.url)}><span${T(site.cta.post)}</span> ${ARROW}</a></p>\n` : ''}      <p class="post-foot">${back}</p>
    </div>
  </article>
</main>

${footer(site, ['script.js'])}`;
}
