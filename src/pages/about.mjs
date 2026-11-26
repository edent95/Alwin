// About 页。内容:content/about.json
import { T, v, esc, link, join, ARROW, imgSrc } from '../h.mjs';
import { head, masthead, footer } from '../layout.mjs';

export default function renderAbout({ site, about: a }) {
  const chapters = a.chapters.map((c, i) => {
    const body = [];
    if (c.logo?.src) body.push(`<img class="edu-logo" ${imgSrc(c.logo.src)} alt="${esc(v(c.logo.alt))}"${c.logo.w ? ` width="${c.logo.w}" height="${c.logo.h}"` : ''}>`);
    for (const p of c.paragraphs || []) body.push(`<p${T(p.text)}</p>`);
    if (c.wins?.length) body.push(`<ul class="wins">\n${join(c.wins, (w) => `            <li${T(w.text)}</li>`)}\n          </ul>`);
    if (v(c.quote)) body.push(`<blockquote class="about-quote"><p${T(c.quote)}</p>${v(c.quote_cite) ? `<cite${T(c.quote_cite)}</cite>` : ''}</blockquote>`);
    for (const l of c.links || []) body.push(`<p class="job-link"><a ${link(l.url)}><span${T(l.label)}</span> ${ARROW}</a></p>`);
    return `  <section class="chapter" id="${esc(v(c.anchor))}">
    <div class="wrap chapter-grid">
      <div class="chapter-head reveal">
        <span class="chapter-no">${String(i + 1).padStart(2, '0')}</span>
        <h2${T(c.title)}</h2>
      </div>
      <div class="chapter-body prose reveal">
${body.map((b) => `          ${b}`).join('\n')}
      </div>
    </div>
  </section>`;
  });

  return `${head({ title: a.seo.title, description: a.seo.description, path: 'about' })}
<body>
${masthead(site, 'about')}

<main id="main">

  <section class="about-hero" id="top">
    <div class="wrap about-hero-grid">
      <div class="about-hero-copy">
        <p class="label reveal"${T(a.label)}</p>
        <h1 class="reveal"><span class="name-en">${v(site.name)}<br><em>${v(site.name_rest)}</em></span><span class="name-zh" lang="zh">${v(site.name_zh)}</span></h1>
        <p class="about-lead reveal"${T(a.lead)}</p>
        <nav class="toc reveal" aria-label="Kandungan">
${join(a.chapters, (c) => `          <a href="#${esc(v(c.anchor))}"${T(c.title)}</a>`)}
        </nav>
      </div>
      <figure class="about-photo">
        <img ${imgSrc(a.photo.src, '(max-width: 900px) min(420px, 90vw), 500px', a.photo.w)} fetchpriority="high" alt="${esc(v(a.photo.alt))}"${a.photo.w ? ` width="${a.photo.w}" height="${a.photo.h}"` : ''}>
      </figure>
    </div>
    <div class="wrap">
      <dl class="facts reveal">
${join(a.facts, (f) => `          <div><dt${T(f.term)}</dt><dd${T(f.value)}</dd></div>`)}
      </dl>
    </div>
  </section>

${chapters.join('\n')}

</main>

${footer(site, ['script.js'])}`;
}
