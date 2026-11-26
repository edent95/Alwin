// 观点文章页:每篇 content/views/<日期>-<网址名>.json 一页,写到 _site/views/<网址名>.html,对外网址是 /views/<网址名>(不带 .html)。
// 网址名 = 文件名去掉开头的日期:改文件名就是改网址,旧网址要加进 redirects.json。
// 正文是 body(Markdown 子集,见 src/md.mjs);旧观点没有 body,就用 excerpt 当正文。
import { T, v, esc, link, dmy, rich, ARROW, LANGS, P, lang } from '../h.mjs';
import { head, masthead, footer, urlFor } from '../layout.mjs';
import { mdToHtml, mdToText } from '../md.mjs';

export const viewSlug = (it) => it._file.replace(/^.*\//, '').replace(/\.json$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
export const viewHref = (it) => P(`/views/${viewSlug(it)}`);
const plain = (s) => String(s ?? '').replace(/<[^>]+>|[*#]/g, '').toLowerCase().replace(/[^\p{L}\p{N}.]+/gu, ' ').trim();
const words = (s) => {
  const t = plain(s);
  // 中文没有空格:按字算
  return new Set(/[\u3400-\u9fff]/.test(t) ? [...t.replace(/\s+/g, '')] : t.split(' ').filter(Boolean));
};
/** a 的词有多少比例出现在 b 里 */
const overlap = (a, b) => { const A = words(a), B = words(b); if (!A.size) return 0; let n = 0; for (const w of A) if (B.has(w)) n++; return n / A.size; };
/**
 * 去掉正文开头重复的「整段粗体的题目」和「整段粗体的署名」(从 WhatsApp / FB 贴进来的文章常这样开头):
 * 页面已经有 <h1> 和署名,重复一次会让搜索摘要、卡片摘要都从题目再念一遍。只看开头两段,其余不动。
 */
export const stripLead = (md, title) => {
  const paras = String(md ?? '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
  let i = 0;
  while (i < 2 && i < paras.length - 1) {
    const p = paras[i].trim();
    if (!/^\*{1,2}[^*\n]+\*{1,2}$/.test(p)) break;
    const isTitle = overlap(p, title) >= 0.6;
    const isByline = p.length <= 40 && /alwin|林智成/i.test(p);
    if (!isTitle && !isByline) break;
    i++;
  }
  return paras.slice(i).join('\n\n');
};
/** 三语的正文 Markdown(没有 body 用 excerpt) */
export const bodyOf = (it) => Object.fromEntries(LANGS.map((l) => [l, stripLead((it.body?.[l] || '').trim() || it.excerpt?.[l] || '', it.title?.[l])]));
/** <title> 用:超过 70 字就截到第一个破折号 / 冒号 / 逗号(前半至少 20 字),关键词在前、搜索结果里不被截成半句 */
const shortTitle = (t) => {
  if (t.length <= 70) return t;
  const m = /^(.{20,}?)\s*(?:\s[–—-]\s|[:：，,;；|])/.exec(t);
  return m ? m[1].trim() : t;
};
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
  const docTitle = map3(title, (t) => `${shortTitle(t)} · ${v(site.name)}`);
  const imgSrc = v(it.image?.src);
  const ogImg = `https://alwinlim.com/${String(imgSrc || v(home.seo.image)).replace(/^\//, '')}`;
  const L = lang();
  const url = urlFor(`views/${slug}`);
  const date = v(it.date);
  // 结构化数据:观点文章(作者 = 首页 JSON-LD 的同一个 Person,@id 对得上)+ 面包屑
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OpinionNewsArticle', '@id': `${url}#article`, url, mainEntityOfPage: url,
        headline: title[L].length <= 110 ? title[L] : shortTitle(title[L]).slice(0, 110), alternativeHeadline: LANGS.filter((l) => l !== L).map((l) => title[l]).filter((t) => t && t !== title[L]),
        description: desc[L], inLanguage: L, image: [ogImg],
        datePublished: date, dateModified: v(it.updated) || date,
        articleSection: cat ? v(cat.label) : v(it.cat),
        author: { '@type': 'Person', '@id': 'https://alwinlim.com/#person', name: v(site.full_name), url: urlFor('about') },
        publisher: { '@type': 'Person', '@id': 'https://alwinlim.com/#person', name: v(site.full_name) },
        isPartOf: { '@id': 'https://alwinlim.com/#website' },
        ...(L === 'zh' ? {} : { wordCount: mdToText(body[L], 1e6).split(/\s+/).filter(Boolean).length }),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: v(site.name), item: urlFor('') },
          { '@type': 'ListItem', position: 2, name: v(sec.title), item: `${urlFor('')}#views` },
          { '@type': 'ListItem', position: 3, name: title[L], item: url },
        ],
      },
    ],
  };
  const extra = `  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${esc(v(site.full_name))}">
  <meta property="og:title" content="${esc(title[L])}">
  <meta property="og:description" content="${esc(desc[L])}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(ogImg)}">
  <meta property="article:published_time" content="${esc(date)}">
  <meta property="article:author" content="${urlFor('about')}">
  <meta name="author" content="${esc(v(site.full_name))}">
  <meta name="twitter:card" content="${imgSrc ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${esc(title[L])}">
  <meta name="twitter:description" content="${esc(desc[L])}">
  <meta name="twitter:image" content="${esc(ogImg)}">
  <script type="application/ld+json">
${JSON.stringify(ld, null, 2).replace(/<\//g, '<\\/').replace(/^/gm, '  ')}
  </script>
`;
  const cover = imgSrc
    ? `<figure class="post-cover view-photo"><img src="${esc(imgSrc)}" alt="${esc(v(it.image.alt) || '')}"></figure>`
    : `<div class="post-cover view-art tone-${esc(v(it.tone) || 'wine')}" aria-hidden="true">${art(v(it.art))}</div>`;
  const back = `<a class="post-back" href="${P('/#views')}"><span aria-hidden="true">←</span> <span${T(sec.title)}</span></a>`;

  return `${head({ title: docTitle, description: desc, path: `views/${slug}`, extra })}
<body>
${masthead(site, 'views')}

<main id="main">
  <article class="post">
    <div class="wrap post-wrap">
      ${back}
      <p class="view-meta"><span class="view-cat"${T(cat ? cat.label : v(it.cat))}</span><time datetime="${esc(date)}">${dmy(it.date)}</time><a class="post-author" href="${P('/about')}" rel="author">${v(site.full_name)}</a></p>
      <h1 class="post-title"${T(rich(it.title))}</h1>
      ${cover}
      <div class="post-body prose"${T(html)}</div>
${v(it.url) ? `      <p class="job-link post-source"><a ${link(v(it.url).startsWith('#') ? '/' + v(it.url) : it.url)}><span${T(site.cta.post)}</span> ${ARROW}</a></p>\n` : ''}      <p class="post-foot">${back}</p>
    </div>
  </article>
</main>

${footer(site, ['script.js'])}`;
}
