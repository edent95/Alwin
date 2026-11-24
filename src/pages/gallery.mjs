// 相册页。内容:content/gallery-page.json(页面文字、分类)+ content/gallery/*.json(相册,由构建写进 gallery-data.js)
import fs from 'node:fs';
import { T, esc, v, join } from '../h.mjs';
import { head, masthead, footer } from '../layout.mjs';

const LIGHTBOX = fs.readFileSync(new URL('../partials/lightbox.html', import.meta.url), 'utf8').trimEnd();

export default function renderGallery({ site, galleryPage: g }) {
  return `${head({ title: g.seo.title, description: g.seo.description, path: 'gallery.html' })}
<body>
${masthead(site, 'gallery')}

<main id="main">

  <section class="gallery-hero" id="top">
    <div class="wrap">
      <p class="label reveal"${T(g.label)}</p>
      <h1 class="reveal"${T(g.title)}</h1>
      <p class="gallery-lead reveal"${T(g.lead)}</p>
      <div class="filters reveal" role="group" aria-label="Kategori">
        <button type="button" data-cat="all" aria-pressed="true"${T(g.all)}</button>
${join(g.cats, (c) => `        <button type="button" data-cat="${esc(v(c.key))}" aria-pressed="false"${T(c.label)}</button>`)}
      </div>
    </div>
  </section>

  <section class="gallery">
    <div class="wrap">
      <ul class="albums" id="albums"></ul>
      <p class="gallery-note"${T(g.note)}</p>
    </div>
  </section>

${LIGHTBOX}

</main>

${footer(site, ['gallery-data.js', 'gallery.js', 'script.js'])}`;
}
