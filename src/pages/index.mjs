// 首页。内容:content/site.json、content/home.json、content/views/*.json、content/news/*.json
import { T, v, esc, link, join, dmy, ARROW } from '../h.mjs';
import { head, masthead, footer } from '../layout.mjs';

const HIBISCUS = '<svg class="hibiscus" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false"><g fill="currentColor"><ellipse cx="0" cy="-6" rx="4.8" ry="6.4" transform="rotate(0)"/><ellipse cx="0" cy="-6" rx="4.8" ry="6.4" transform="rotate(72)"/><ellipse cx="0" cy="-6" rx="4.8" ry="6.4" transform="rotate(144)"/><ellipse cx="0" cy="-6" rx="4.8" ry="6.4" transform="rotate(216)"/><ellipse cx="0" cy="-6" rx="4.8" ry="6.4" transform="rotate(288)"/></g><circle r="2.2" class="hib-eye"/><path d="M0 0 L3.5 -8.5" class="hib-st"/><circle cx="3.5" cy="-8.5" r="1.3" class="hib-tip"/></svg>';

const jsonLd = (site, seo) => {
  const url = 'https://alwinlim.com/';
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${url}#website`, url, name: v(site.full_name), inLanguage: ['ms', 'en', 'zh'], about: { '@id': `${url}#person` } },
      { '@type': 'ProfilePage', '@id': `${url}#profile`, url, name: v(seo.title), isPartOf: { '@id': `${url}#website` }, mainEntity: { '@id': `${url}#person` } },
      {
        '@type': 'Person', '@id': `${url}#person`, name: v(site.full_name),
        alternateName: [v(site.name_zh), v(site.name)],
        jobTitle: v(seo.job_title),
        description: v(seo.person_description),
        url, image: abs(seo.image),
        address: { '@type': 'PostalAddress', addressRegion: 'Pulau Pinang', addressCountry: 'MY' },
        alumniOf: [{ '@type': 'CollegeOrUniversity', name: 'RMIT University', address: 'Melbourne, Australia' }, { '@type': 'CollegeOrUniversity', name: 'INTI International University', address: 'Malaysia' }],
        memberOf: { '@type': 'Organization', name: 'DAPSY Bukit Bendera' },
        worksFor: { '@type': 'Organization', name: 'Zeon Properties', url: 'https://www.zeonproperties.com.my/' },
        sameAs: (seo.same_as || []).map((s) => v(s.url)),
      },
    ],
  };
  return `  <script type="application/ld+json">\n${JSON.stringify(data, null, 2).replace(/^/gm, '  ')}\n  </script>\n`;
};

/** 日期;month_only 的只显示「月.年」(原文只知道月份) */
const when = (x) => {
  const d = v(x.date) || '';
  return v(x.month_only) ? `<time datetime="${esc(d.slice(0, 7))}">${dmy(d.slice(0, 7))}</time>` : `<time datetime="${esc(d)}">${dmy(d)}</time>`;
};
const abs = (p) => `https://alwinlim.com/${String(v(p)).replace(/^\//, '')}`;

const img = (i, attrs = '') => `<img src="${esc(v(i.src))}" alt="${esc(v(i.alt))}"${i.w ? ` width="${i.w}" height="${i.h}"` : ''}${attrs}>`;

const hero = (h) => `  <!-- HERO -->
  <section class="hero" id="top">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <div class="kickers reveal">
        <p class="kicker">
          ${HIBISCUS}
          <span${T(h.kicker)}</span>
        </p>
${h.team?.logo?.src ? `        <a class="kicker kicker-team" ${link(h.team.url)}>${img(h.team.logo)}</a>\n` : ''}        </div>
        <h1 class="reveal">
          <span class="name-en">${v(h.name)}</span>
          <span class="name-zh" lang="zh">${v(h.name_zh)}</span>
        </h1>
        <p class="role reveal"${T(h.role)}</p>
        <div class="actions reveal">
${join(h.buttons, (b) => `          <a href="${esc(v(b.href))}" class="btn${v(b.style) === 'line' ? ' btn-line' : ''}"${T(b.label)}</a>`)}
        </div>
      </div>
      <figure class="hero-photo">
        ${img(h.photo, ' fetchpriority="high"')}
      </figure>
    </div>

    <div class="wrap">
      <dl class="stats">
${join(h.stats, (s) => `        <div>${s.logo?.src ? img(s.logo).replace('<img ', '<img class="stat-logo" ') : ''}<dt${T(s.value)}</dt><dd${T(s.label)}</dd></div>`)}
      </dl>
    </div>
  </section>`;

const stance = (s) => `  <!-- STANCE -->
  <section class="stance" id="stance">
    <div class="wrap">
      <p class="label"${T(s.label)}</p>
      <blockquote class="pull reveal">
        <p${T(s.quote)}</p>
        <footer>
          <cite${T(s.cite)}</cite>
        </footer>
      </blockquote>

      <div class="planks">
${join(s.planks, (p, i) => `        <article class="plank reveal">
          <span class="num">${String(i + 1).padStart(2, '0')}</span>
          <h3${T(p.title)}</h3>
          <p${T(p.body)}</p>
        </article>`)}
      </div>
      <p class="note"${T(s.note)}</p>
    </div>
  </section>`;

const views = (sec, items, site, art) => {
  const catLabel = Object.fromEntries(sec.cats.map((c) => [v(c.key), c.label]));
  return `  <!-- VIEWS:Alwin 自己的时事评论 / 发言,一张卡一篇。内容在 content/views/,在后台「观点」里加 -->
  <section class="views" id="views">
    <div class="wrap">
      <div class="section-head">
        <p class="label"${T(sec.label)}</p>
        <h2${T(sec.title)}</h2>
      </div>
      <div class="chips" role="group" aria-label="Kategori" data-filter=".view-grid">
        <button type="button" data-cat="all" aria-pressed="true"${T(sec.all)}</button>
${join(sec.cats, (c) => `        <button type="button" data-cat="${esc(v(c.key))}" aria-pressed="false"${T(c.label)}</button>`)}
      </div>
      <div class="view-grid">
${join(items, (it) => {
    const cover = it.image?.src
      ? `<div class="view-art view-photo"><img src="${esc(v(it.image.src))}" alt="${esc(v(it.image.alt) || '')}" loading="lazy"></div>`
      : `<div class="view-art tone-${esc(v(it.tone) || 'wine')}" aria-hidden="true">${art(v(it.art))}</div>`;
    return `        <article class="view reveal" data-cat="${esc(v(it.cat))}">
          <a ${link(it.url)}>
            ${cover}
            <p class="view-meta"><span class="view-cat"${T(catLabel[v(it.cat)] ?? v(it.cat))}</span>${when(it)}</p>
            <h3${T(it.title)}</h3>
            <p${T(it.excerpt)}</p>
            <span class="story-cta"><span${T(site.cta[v(it.cta)] ?? site.cta.read)}</span> ${ARROW}</span>
          </a>
        </article>`;
  })}
      </div>
    </div>
  </section>`;
};

const journey = (j) => `  <!-- JOURNEY -->
  <section class="journey" id="journey">
    <div class="wrap journey-grid">
      <div class="journey-head">
        <p class="label"${T(j.label)}</p>
        <h2${T(j.title)}</h2>
        ${img(j.photo, ' class="journey-photo" loading="lazy"')}
      </div>
      <ol class="timeline">
${join(j.items, (it) => {
    const parts = [`          <span class="when"${T(it.when)}</span>`];
    if (it.logo?.src) parts.push(`          <div class="edu">\n            ${img(it.logo, ' loading="lazy"')}\n            <h3${T(it.title)}</h3>\n          </div>`);
    else parts.push(`          <h3${T(it.title)}</h3>`);
    if (v(it.body)) parts.push(`          <p${T(it.body)}</p>`);
    if (v(it.sub_title)) parts.push(`          <h3 class="edu-next"${T(it.sub_title)}</h3>`);
    if (v(it.sub_body)) parts.push(`          <p${T(it.sub_body)}</p>`);
    if (it.wins?.length) parts.push(`          <ul class="wins">\n${join(it.wins, (w) => `            <li${T(w.text)}</li>`)}\n          </ul>`);
    for (const l of it.links || []) parts.push(`          <p class="job-link"><a ${link(l.url)}><span${T(l.label)}</span> ${ARROW}</a></p>`);
    return `        <li class="reveal">\n${parts.join('\n')}\n        </li>`;
  })}
      </ol>
    </div>
  </section>`;

const projects = (p) => `  <!-- PROJECTS(新盘):卡片由 projects.js(scripts/zeon-projects.py 从 Zeon 项目页生成，只留槟城)渲染进 #project-grid -->
  <section class="projects" id="projects">
    <div class="wrap">
      <div class="section-head projects-head">
        <div>
          <p class="label"${T(p.label)}</p>
          <h2${T(p.title)}</h2>
        </div>
        <p class="projects-count"><strong id="project-total"></strong> <span${T(p.count)}</span></p>
      </div>
      <div class="project-grid" id="project-grid"></div>
      <div class="projects-foot">
        <a class="job-link-inline" href="https://www.zeonproperties.com.my/project" target="_blank" rel="noopener"><span${T(p.all)}</span> ${ARROW}</a>
      </div>
    </div>
  </section>`;

const listings = (l) => `  <!-- LISTINGS(房源):卡片由 listings.js(scripts/zeon-projects.py 从 Zeon 经纪页生成)渲染进 #listing-grid -->
  <section class="projects listings" id="listings">
    <div class="wrap">
      <div class="section-head projects-head">
        <div>
          <p class="label"${T(l.label)}</p>
          <h2${T(l.title)}</h2>
        </div>
        <p class="projects-count"><strong id="listing-total"></strong> <span${T(l.count)}</span></p>
      </div>
      <div class="chips" role="group" aria-label="Jenis" data-filter="#listing-grid">
${join(['all', 'sale', 'rent', 'commercial'], (k, i) => `        <button type="button" data-cat="${k}" aria-pressed="${i === 0}"${T(l.chips[k])}</button>`)}
      </div>
      <div class="project-grid" id="listing-grid"></div>
      <div class="projects-foot">
        <button type="button" class="btn btn-line" id="listing-more"${T(l.more)}</button>
        <a class="job-link-inline" href="https://www.zeonproperties.com.my/find-agent/alwin-lim-38297" target="_blank" rel="noopener"><span${T(l.all)}</span> ${ARROW}</a>
      </div>
    </div>
  </section>`;

const news = (sec, items, site) => `  <!-- NEWS:内容在 content/news/,按日期新到旧;script.js 再按读者语言把同语言的报道排前面 -->
  <section class="news" id="news">
    <div class="wrap">
      <div class="section-head">
        <p class="label"${T(sec.label)}</p>
        <h2${T(sec.title)}</h2>
      </div>
      <div class="stories">
${join(items, (n, i) => {
    const photo = !!n.image?.src;
    const cover = photo
      ? `<div class="cover"><img src="${esc(v(n.image.src))}" alt="${esc(v(n.image.alt) || '')}" loading="lazy"></div>`
      : `<div class="cover type-cover tone-${esc(v(n.tone) || 'ink')}" aria-hidden="true"><span class="mast"${T(n.mast ?? n.source)}</span>${v(n.mast_sub) ? `<span class="mast-sub">${v(n.mast_sub)}</span>` : ''}</div>`;
    const src = n.source_sub && v(n.source_sub)
      ? { ms: `${n.source.ms} <small>${v(n.source_sub)}</small>`, en: `${n.source.en} <small>${v(n.source_sub)}</small>`, zh: `${n.source.zh} <small>${v(n.source_sub)}</small>` }
      : n.source;
    return `        <article data-src-lang="${esc((v(n.src_lang) || []).join(' '))}" class="story${i === 0 && photo ? ' is-feature' : ''} reveal">
          <a ${link(n.url)}>
            ${cover}
            <div class="story-body">
              <p class="story-meta"><span class="story-src"${T(src)}</span>${when(n)}</p>
              <h3${T(n.title)}</h3>
${v(n.excerpt) ? `              <p class="excerpt"${T(n.excerpt)}</p>\n` : ''}              <span class="story-cta"><span${T(site.cta.article)}</span> ${ARROW}</span>
            </div>
          </a>
        </article>`;
  })}
      </div>
    </div>
  </section>`;

export default function renderIndex({ site, home, views: viewItems, news: newsItems, art }) {
  const seo = home.seo;
  const og = `  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="${esc(v(site.full_name))}">
  <meta property="og:title" content="${esc(v(seo.title))}">
  <meta property="og:description" content="${esc(v(seo.og_description))}">
  <meta property="og:url" content="https://alwinlim.com/">
  <meta property="og:image" content="${esc(abs(seo.image))}">
  <meta property="og:locale" content="ms_MY">
`;
  return `${head({ title: seo.title, description: seo.description, path: '', extra: og + jsonLd(site, seo).replace(/^/, '') })}
<body>
${masthead(site, 'index')}

<main id="main">

${hero({ ...home.hero, name: site.name, name_zh: site.name_zh })}

${stance(home.stance)}

${views(home.views, viewItems, site, art)}

${journey(home.journey)}

${projects(home.projects)}

${listings(home.listings)}

${news(home.news, newsItems, site)}
</main>

${footer(site, ['projects.js', 'listings.js', 'script.js'])}`;
}
