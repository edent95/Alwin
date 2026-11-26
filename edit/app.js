// 简易后台 /edit —— 给没有技术背景的人用：按「要做的事」分，一屏一件事，只写一种语言，发布前自动翻译并预览。
// 数据格式与 content/*.json 一致({ ms, en, zh });接口全在 api.js。
(() => {
  const app = document.getElementById('app');
  const LANGS = ['zh', 'en', 'ms'];
  const LN = { zh: '中文', en: 'English', ms: 'Bahasa' };
  const CJK = /[㐀-鿿豈-﫿　-〿＀-￯]/; // 和 scripts/build.mjs 的检查一致:全角标点也算中文
  // 马来文 / 英文里的全角标点(从中文原文带过来的 ：，（）等)换成半角,不然构建检查会当成中文拦下
  const HALF = { '。': '. ', '、': ', ', '「': '“', '」': '”', '『': '“', '』': '”', '【': '[', '】': ']', '《': '“', '》': '”', '　': ' ' };
  const halfPunct = (s) => String(s)
    .replace(/[\uFF01-\uFF5E]/g, (c) => { const a = String.fromCharCode(c.charCodeAt(0) - 0xFEE0); return /[,:;!?]/.test(a) ? a + ' ' : /[(]/.test(a) ? ' (' : a; })
    .replace(/[。、「」『』【】《》　]/g, (c) => HALF[c])
    .replace(/ {2,}/g, ' ').replace(/ +(\n|$)/g, '$1').replace(/\( +/g, '(').replace(/(^|\n) +/g, '$1');
  const halfDeep = (x) => (typeof x === 'string' ? halfPunct(x) : Array.isArray(x) ? x.map(halfDeep)
    : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, halfDeep(v)])) : x);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const today = () => new Date().toISOString().slice(0, 10);
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const set = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); let a = o; for (const k of ks) a = a[k] ??= {}; a[last] = v; };
  const fmtDate = (iso) => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return d ? `${y} 年 ${+m} 月 ${+d} 日` : `${y} 年 ${+m} 月`; };
  const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'item';
  // 观点的网址名(文件名去掉日期就是网址 /views/<网址名>):按整词截到 60 字以内,去掉开头结尾的虚词,不会截出半个词
  const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are', 'be', 'must', 'then', 'but', 'with', 'by', 'at', 'it', 'its', 'not']);
  const wordSlug = (s, max = 60) => {
    const w = String(s).toLowerCase().normalize('NFKD').replace(/[\u2019']/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
    const out = [];
    for (const x of w) { if ([...out, x].join('-').length > max) break; out.push(x); }
    while (out.length > 1 && STOP.has(out[out.length - 1])) out.pop();
    while (out.length > 1 && STOP.has(out[0])) out.shift();
    return out.join('-') || 'item';
  };
  // 中文里跟在汉字后面的半角标点换成全角(网站的检查会拦半角)
  const zhPunct = (s) => String(s).replace(/([\u3400-\u9fff\uf900-\ufaff\u300d\u300f\uff09\u201d])\s*([,;:!?])/g, (_, a, p) => a + { ',': '\uff0c', ';': '\uff1b', ':': '\uff1a', '!': '\uff01', '?': '\uff1f' }[p]);

  const I = {
    news: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h13v14H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v8a2 2 0 0 1-2 2"/><path d="M7.5 9h6M7.5 12.5h6M7.5 16h4"/></svg>',
    view: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/></svg>',
    album: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8"/></svg>',
    me: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5"/></svg>',
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
    chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>',
    ext: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    check: '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    tick: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    magic: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 19 9-9M14 4v3M12.5 5.5h3M19 9v3M17.5 10.5h3"/></svg>',
  };

  // ------------------------------------------------------------------ 状态
  const S = {
    me: API.me(),
    c: null,                                   // 内容快照
    wl: localStorage.getItem('edit-wl') || 'zh', // 写作语言
    flow: null,                                // 当前流程
    showAll: false,
  };
  const L = (x, l = S.wl) => (x && typeof x === 'object' ? x[l] : x);

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  window.addEventListener('hashchange', () => render(true));

  // ------------------------------------------------------------------ 公用片段
  const top = (title, { back = '#/', right = '' } = {}) => `
    <header class="top">
      <div class="side">${back ? `<a class="icon-btn" href="${back}" aria-label="返回">${I.back}<span>返回</span></a>` : ''}</div>
      <h1>${esc(title)}</h1>
      <div class="side">${right}</div>
    </header>${API.demo ? '<div class="demo">示意版：可以随便点，不会改到网站</div>' : ''}`;
  const steps = (n, of) => `<div class="steps" aria-label="第 ${n} 步，共 ${of} 步">${Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>`;
  const bar = (inner) => `<div class="bar"><div>${inner}</div></div>`;
  const wlSwitch = () => `
    <div class="field"><div class="label">我用哪种语言写</div>
      <div class="chips" role="group" aria-label="写作语言">
        ${['zh', 'en'].map((l) => `<button type="button" class="chip" data-wl="${l}" aria-pressed="${S.wl === l}">${l === 'zh' ? '中文' : 'English'}</button>`).join('')}
      </div><p class="hint" style="margin-top:8px">另外两种语言，发布前会自动翻译给你看。</p></div>`;
  const field = (f, val) => {
    const id = `f-${f.k.replace(/\W/g, '_')}`;
    const label = `<label for="${id}">${esc(f.label)}${f.optional ? ' <span class="opt">（可不填）</span>' : ''}</label>${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ''}`;
    if (f.type === 'chips') return `<div class="field"><div class="label">${esc(f.label)}</div>${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ''}
      <div class="chips" role="group">${f.options.map((o) => `<button type="button" class="chip" data-chip="${esc(f.k)}" data-v="${esc(o.v)}" aria-pressed="${f.multi ? (val || []).includes(o.v) : val === o.v}">${esc(o.t)}</button>`).join('')}</div></div>`;
    if (f.type === 'rich') return `<div class="field"><div class="label">${esc(f.label)}</div>${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ''}${richEditor(f.k, val)}</div>`;
    if (f.type === 'textarea') return `<div class="field">${label}<textarea class="input" id="${id}" data-k="${esc(f.k)}" rows="${f.rows || 4}" ${f.max ? `maxlength="${f.max}"` : ''} placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>${f.max ? `<div class="count">${(val || '').length} / ${f.max}</div>` : ''}</div>`;
    return `<div class="field">${label}<input class="input" id="${id}" data-k="${esc(f.k)}" type="${f.type || 'text'}" value="${esc(val)}" placeholder="${esc(f.ph || '')}" ${f.type === 'url' ? 'inputmode="url" autocapitalize="off"' : ''}></div>`;
  };
  // 绑定输入：写回 obj[k],不重画(免得键盘收起)
  function bindInputs(obj, onChange) {
    app.querySelectorAll('.rte').forEach((el) => bindRich(el, obj, onChange));
    app.querySelectorAll('[data-k]').forEach((el) => el.addEventListener('input', () => {
      obj[el.dataset.k] = el.value;
      const cnt = el.parentElement.querySelector('.count'); if (cnt) cnt.textContent = `${el.value.length} / ${el.maxLength}`;
      onChange?.();
    }));
    app.querySelectorAll('[data-chip]').forEach((el) => el.addEventListener('click', () => {
      const k = el.dataset.chip; const group = app.querySelectorAll(`[data-chip="${k}"]`);
      if (el.closest('.chips').dataset.multi !== undefined || Array.isArray(obj[k])) {
        const cur = new Set(obj[k] || []); cur.has(el.dataset.v) ? cur.delete(el.dataset.v) : cur.add(el.dataset.v); obj[k] = [...cur];
        el.setAttribute('aria-pressed', cur.has(el.dataset.v));
      } else { obj[k] = el.dataset.v; group.forEach((g) => g.setAttribute('aria-pressed', g === el)); }
      onChange?.();
    }));
    app.querySelectorAll('[data-wl]').forEach((el) => el.addEventListener('click', () => {
      if (S.wl === el.dataset.wl) return;
      S.wl = el.dataset.wl; localStorage.setItem('edit-wl', S.wl);
      const F = S.flow;
      if (F?.onWl) F.onWl();
      else if (F?.entry) { const step = F.step; Object.assign(F, { news: newsFlow, view: viewFlow, album: albumFlow }[F.kind](F.entry)); F.step = step; }
      render();
    }));
  }
  // ------------------------------------------------------------------ 正文编辑器(所见即所得)
  // 存的是 Markdown(src/md.mjs,构建时生成 md.js → window.MD):编辑器里看到的就是网站上的样子,存的时候再转回去。
  const RTE_IMGS = new Map(); // blob 网址 → { blob }:插进正文、还没上传的照片
  const COLOR_HEX = { wine: '#7c1d2b', blue: '#1d4e89', green: '#2e6b3a', grey: '#6b6156' };
  const richEditor = (k, md) => `<div class="rte" data-rte="${esc(k)}">
      <div class="rte-bar" role="toolbar" aria-label="格式">
        <button type="button" data-cmd="bold" aria-label="粗体"><b>B</b></button>
        <button type="button" data-cmd="h2" aria-label="大标题">标题</button>
        <button type="button" data-cmd="h3" aria-label="小标题">小标题</button>
        <button type="button" data-cmd="ul" aria-label="列表"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="18" r="1" fill="currentColor"/></svg></button>
        <button type="button" data-cmd="ol" aria-label="编号列表">1.</button>
        <button type="button" data-cmd="color" aria-label="字体颜色"><span class="rte-a">A</span></button>
        <button type="button" data-cmd="link" aria-label="链接"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/></svg></button>
        <label class="rte-btn" aria-label="插入图片"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m21 16-5-5-8 8"/></svg><input type="file" accept="image/*" hidden data-rte-img></label>
      </div>
      <div class="rte-colors" hidden>${Object.entries(MD.COLORS).map(([c, t]) => `<button type="button" data-color="${c}" style="--c:${COLOR_HEX[c]}">${esc(t)}</button>`).join('')}<button type="button" data-color="">默认</button></div>
      <div class="rte-area" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true">${MD.mdToHtml(md || '') || '<p><br></p>'}</div>
    </div>`;
  function bindRich(box, obj, onChange) {
    const area = box.querySelector('.rte-area');
    const k = box.dataset.rte;
    let saved = null;
    const keep = () => { if (!area.isConnected) return document.removeEventListener('selectionchange', keep); const sel = getSelection(); if (sel.rangeCount && area.contains(sel.anchorNode)) saved = sel.getRangeAt(0).cloneRange(); };
    const restore = () => { area.focus(); if (saved) { const sel = getSelection(); sel.removeAllRanges(); sel.addRange(saved); } };
    const sync = () => { obj[k] = MD.htmlToMd(area); onChange?.(); };
    // 颜色:execCommand 生成 <font color>,换成网站认得的 <span class="tc-…">
    const tidy = () => {
      area.querySelectorAll('font[color]').forEach((f) => {
        const hex = f.getAttribute('color').toLowerCase();
        const c = Object.keys(COLOR_HEX).find((x) => COLOR_HEX[x] === hex);
        if (c) { const sp = document.createElement('span'); sp.className = `tc-${c}`; sp.append(...f.childNodes); f.replaceWith(sp); } else f.replaceWith(...f.childNodes);
      });
      area.querySelectorAll('span[style]').forEach((sp) => { if (!sp.className) sp.replaceWith(...sp.childNodes); });
    };
    const block = () => { let n = getSelection().anchorNode; while (n && n !== area) { if (n.nodeType === 1 && /^(H2|H3|P|DIV|LI)$/.test(n.tagName)) return n; n = n.parentNode; } return null; };
    const cmd = (c, v) => { restore(); document.execCommand('styleWithCSS', false, false); document.execCommand(c, false, v); tidy(); keep(); sync(); };
    document.addEventListener('selectionchange', keep);
    area.addEventListener('input', () => { tidy(); sync(); });
    area.addEventListener('blur', sync);
    // 贴上来的文字:按纯文字贴(WhatsApp 的 *粗体* 直接变粗体),不带别的网站的格式
    area.addEventListener('paste', (e) => {
      const t = e.clipboardData?.getData('text/plain'); if (t == null) return;
      e.preventDefault();
      document.execCommand('insertHTML', false, MD.mdToHtml(t));
      tidy(); sync();
    });
    box.querySelectorAll('.rte-bar button, .rte-colors button').forEach((b) => b.addEventListener('pointerdown', (e) => e.preventDefault()));
    box.querySelector('.rte-bar').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-cmd]'); if (!b) return;
      const c = b.dataset.cmd;
      if (c === 'bold') cmd('bold');
      else if (c === 'h2' || c === 'h3') { restore(); cmd('formatBlock', block()?.tagName === c.toUpperCase() ? '<p>' : `<${c}>`); }
      else if (c === 'ul') cmd('insertUnorderedList');
      else if (c === 'ol') cmd('insertOrderedList');
      else if (c === 'color') { const p = box.querySelector('.rte-colors'); p.hidden = !p.hidden; }
      else if (c === 'link') {
        keep(); const range = saved; const text = range ? range.toString() : '';
        sheet(`<h3>加链接</h3><div class="field"><label for="rte-url">网址</label><input class="input" id="rte-url" type="url" inputmode="url" autocapitalize="off" placeholder="https://"></div>
          ${text ? '' : '<div class="field"><label for="rte-txt">显示的文字</label><input class="input" id="rte-txt" placeholder="例：原文"></div>'}
          <button class="btn primary" data-ok>加上</button>`, (bg, close) => {
          bg.querySelector('#rte-url').focus();
          bg.querySelector('[data-ok]').addEventListener('click', () => {
            let url = bg.querySelector('#rte-url').value.trim(); if (!url) return close();
            if (!/^(https?:|mailto:|tel:|\/)/i.test(url)) url = `https://${url}`;
            saved = range;
            if (text) cmd('createLink', url);
            else { const t = bg.querySelector('#rte-txt').value.trim() || url; cmd('insertHTML', `<a href="${esc(url)}">${esc(t)}</a>&nbsp;`); }
            close();
          });
        });
      }
    });
    box.querySelector('.rte-colors').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-color]'); if (!b) return;
      box.querySelector('.rte-colors').hidden = true;
      cmd('foreColor', b.dataset.color ? COLOR_HEX[b.dataset.color] : '#000001');
      area.querySelectorAll('font[color="#000001"]').forEach((f) => f.replaceWith(...f.childNodes));
      sync();
    });
    box.querySelector('[data-rte-img]').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      const p = await API.prepareImage(f);
      RTE_IMGS.set(p.url, { blob: p.blob });
      cmd('insertHTML', `<figure><img src="${p.url}" alt=""></figure><p><br></p>`);
    });
  }
  /** 发布前:正文里还是 blob: 网址的照片,分配仓库路径并换掉;返回要上传的照片 */
  function assignBodyImages(tr, k, prefix) {
    const ups = []; let i = 0;
    const stamp = Date.now().toString(36);
    for (const [url, img] of RTE_IMGS) {
      if (!LANGS.some((l) => (tr[l][k] || '').includes(url))) continue;
      img.path ??= `${prefix}-${stamp}-${String(++i).padStart(2, '0')}.jpg`;
      for (const l of LANGS) tr[l][k] = (tr[l][k] || '').split(url).join(img.path);
      ups.push({ path: img.path, blob: img.blob });
    }
    return ups;
  }

  function sheet(html, bind, closeText = '取消') {
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grip"></div>${html}<button class="btn line" data-close>${closeText}</button></div>`;
    const close = () => bg.remove();
    bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) close(); });
    document.body.append(bg); bind?.(bg, close);
    bg.querySelector('.btn')?.focus();
  }

  // ------------------------------------------------------------------ 三语预览卡
  const art = (name) => S.c.art?.[name] || '';
  // 和网站 src/h.mjs 的 rich 一样:*粗体* → <strong>,换行 → <br>(先转义)
  const rich = (s) => esc(s).replace(/\*([^*\n]+?)\*/g, '<strong>$1</strong>').replace(/\r?\n/g, '<br>');
  const dmy = (iso, monthOnly) => { const [y, m, d] = iso.split('-'); return monthOnly || !d ? `${m}.${y}` : `${d}.${m}.${y}`; };
  const PREVIEW = {
    news: (o, l) => `<div class="pv-label">${l === 'zh' ? '新闻' : 'Berita / News'}</div><article class="pv-card" lang="${l}">
      ${o.image ? `<img src="${esc(o.image.src)}" alt="">` : `<div class="art" style="background:var(--ink);color:var(--paper);font-family:var(--serif);font-size:30px">${esc(o.mast || o.source)}</div>`}
      <div class="meta">${esc(o.source)} · ${dmy(o.date, o.month_only)}</div><h3>${esc(o.title)}</h3>${o.excerpt ? `<p>${esc(o.excerpt)}</p>` : ''}</article>`,
    view: (o, l) => `<div class="pv-label">${l === 'zh' ? '观点' : 'Pandangan / Views'}</div><article class="pv-card" lang="${l}">
      ${o.image ? `<img src="${esc(o.image.src || o.image)}" alt="">` : `<div class="art">${art(o.art)}</div>`}
      <div class="meta">${esc(catLabel('view', o.cat, l))} · ${dmy(o.date)}</div><h3>${rich(o.title)}</h3><p>${esc(MD.mdToText(o.body || o.excerpt || '', l === 'zh' ? 90 : 170))}</p></article>
      <div class="pv-label">${l === 'zh' ? '点进去的文章页' : 'Halaman penuh / Full post'}</div><article class="pv-post" lang="${l}"><h1>${rich(o.title)}</h1>${MD.mdToHtml(o.body || o.excerpt || '')}</article>`,
    album: (o, l) => `<div class="pv-label">${l === 'zh' ? '相册' : 'Galeri / Gallery'}</div><article class="pv-card" lang="${l}">
      ${o.photos?.[0] ? `<img src="${esc(o.photos[0]._url || o.photos[0].image)}" alt="">` : ''}
      <div class="meta">${esc(catLabel('album', o.cat, l))} · ${esc(o.date)} · ${o.photos.length} ${l === 'zh' ? '张照片' : l === 'ms' ? 'foto' : 'photos'}</div><h3>${esc(o.title)}</h3><p>${esc(o.place)}</p></article>`,
  };
  function catLabel(kind, key, l) {
    const src = kind === 'view' ? S.c.home.data[l].views.cats : S.c.galleryPage.data[l].cats;
    return src.find((c) => c.key === key)?.label || key;
  }
  const catOptions = (kind) => (kind === 'view' ? S.c.home.data[S.wl].views.cats : S.c.galleryPage.data[S.wl].cats).map((c) => ({ v: c.key, t: c.label }));

  // ------------------------------------------------------------------ 翻译 + 预览 + 发布(所有流程共用)
  /**
   * F.texts():{ key: 写作语言的文字 }（要翻译的）;F.orig:改旧内容时 { key: {ms,en,zh} }（没改的就不重翻）
   * F.build(tr):tr = { zh:{key:..}, en:{..}, ms:{..} } → { ms, en, zh } 三份完整内容
   */
  async function translateAll(F) {
    const texts = F.texts();
    const others = LANGS.filter((l) => l !== S.wl);
    const need = {};
    for (const [k, t] of Object.entries(texts)) {
      const o = F.orig?.[k];
      if (!(o && o[S.wl] === t)) need[k] = t;
    }
    const got = Object.keys(need).length ? await API.translate(need, S.wl, others) : {};
    const tr = { [S.wl]: { ...texts } };
    for (const l of others) {
      tr[l] = {};
      for (const k of Object.keys(texts)) tr[l][k] = k in need ? got[l][k] : F.orig[k][l];
    }
    tr.zh = Object.fromEntries(Object.entries(tr.zh).map(([k, v]) => [k, zhPunct(v)]));
    F.tr = tr; F.machine = new Set(Object.keys(need));
  }
  function previewScreen(F, n, of) {
    const l = F.pvLang || S.wl;
    const out = F.build(F.tr);
    const keys = Object.keys(F.tr[l]).filter((k) => F.tr[l][k]);
    const isMachine = l !== S.wl && F.machine.size > 0;
    app.innerHTML = `${top('看一看', { back: '' })}${steps(n, of)}
      <h2 class="h">三种语言都看一眼</h2>
      <p class="lead">网站会按读者选的语言显示。点上面切换。</p>
      <div class="tabs" role="tablist">${LANGS.map((x) => `<button role="tab" data-pv="${x}" aria-selected="${x === l}">${LN[x]}${x === S.wl ? '<span class="src">你写的</span>' : ''}</button>`).join('')}</div>
      <div class="pv">${F.preview ? F.preview(out[l], l) : textPreview(F, l)}</div>
      ${isMachine ? `<div class="mt-badge">${I.magic} 这是自动翻译的，请过目</div>
        <details class="tr-edit"><summary>翻译不对？自己改一下</summary>
          ${keys.filter((k) => F.machine.has(k)).map((k) => field({ k, label: F.labelOf?.(k) || k, type: F.rich?.includes(k) ? 'rich' : (F.tr[l][k] || '').length > 60 ? 'textarea' : 'text' }, F.tr[l][k])).join('')}
        </details>` : ''}
      ${bar(`<button class="btn line" data-back>改内容</button><button class="btn primary" data-publish>发布到网站</button>`)}`;
    app.querySelectorAll('[data-pv]').forEach((b) => b.addEventListener('click', () => { F.pvLang = b.dataset.pv; previewScreen(F, n, of); }));
    bindInputs(F.tr[l], () => {});
    // 改了翻译的正文:预览跟着更新(不重画编辑器,免得光标跳走)
    app.querySelectorAll('.tr-edit .rte-area').forEach((a) => a.addEventListener('input', () => { const pv = app.querySelector('.pv-post'); if (pv) pv.innerHTML = `<h1>${rich(F.tr[l].title)}</h1>${MD.mdToHtml(F.tr[l].body || '')}`; }));
    app.querySelector('[data-back]').addEventListener('click', () => { F.step--; render(); });
    app.querySelector('[data-publish]').addEventListener('click', () => publish(F));
    window.scrollTo(0, 0);
  }
  function textPreview(F, l) {
    const t = F.tr[l];
    const changed = Object.keys(t).filter((k) => F.machine.has(k));
    const removed = F.kind === 'section' && F.sec.list ? (get(S.c[F.sec.file].data[l], F.sec.list.p) || []).length - F.items.filter((x) => x._i != null).length : 0;
    if (!changed.length) return `<p class="muted">${removed > 0 ? `删掉了 ${removed} 项${esc(F.sec.list.name)}，其他没有改。` : '没有改动。'}</p>`;
    return `<p class="muted" style="margin-bottom:12px">只列出你改过的地方${removed > 0 ? `（另外删掉了 ${removed} 项）` : ''}：</p>` + changed.map((k) => `<div style="margin-bottom:12px"><div class="meta" style="font-size:13px;color:var(--ink-3)">${esc(F.labelOf?.(k) || k)}</div><div lang="${l}" ${l === 'zh' ? 'class="zh"' : ''}>${esc(t[k]).replace(/\n/g, '<br>')}</div></div>`).join('') || '<p class="muted">没有改动</p>';
  }
  const strip = (x) => (Array.isArray(x) ? x.map(strip) : x && typeof x === 'object'
    ? Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [k, strip(v)])) : x);
  async function publish(F) {
    for (const l of ['en', 'ms']) F.tr[l] = halfDeep(F.tr[l]);
    // 发布前最后检查：马来文 / 英文里不能有中文
    const bad = ['en', 'ms'].flatMap((l) => Object.entries(F.tr[l]).filter(([, v]) => CJK.test(v || '')).map(([k]) => `${LN[l]}的「${F.labelOf?.(k) || k}」`));
    if (bad.length) { sheet(`<h3>还有中文没翻译</h3><p class="muted">${esc(bad.join('、'))}里还有中文字。网站的英文 / 马来文版不能出现中文，请在下面「自己改一下」里改掉。</p>`, null, '知道了'); return; }
    const btn = app.querySelector('[data-publish]');
    btn.disabled = true; btn.textContent = '正在发布…';
    try {
      F.assignPaths?.();
      const out = strip(F.build(F.tr));
      const file = F.file || F.fileFor();
      const r = await API.publish({ files: [{ path: file, json: out }], images: F.uploads?.() || [], message: F.message }, (msg) => { btn.textContent = msg; });
      // 本机的内容快照跟着更新，回首页就看得到
      if (F.kind === 'section') S.c[F.sec.file].data = out;
      else {
        const list = S.c[{ news: 'news', view: 'views', album: 'gallery' }[F.kind]];
        const hit = list.find((e) => e.file === file);
        if (hit) hit.data = out; else list.push({ file, data: out });
      }
      F.file = file;
      F.pubId = r.id; F.step = 'done'; render();
    } catch (e) { toast(e.message || '发布失败，请再试一次'); render(); }
  }
  function doneScreen(F) {
    const url = F.liveUrl || '/';
    app.innerHTML = `${top('完成', { back: '' })}
      <div class="done"><div class="big">${I.check}</div><h2>已经发出去了</h2><p>${esc(F.doneText || '大约 1 分钟后，网站上就会看到。')}</p>
        <ol class="progress" id="prog">
          <li class="ok"><span class="dot">${I.tick}</span>已保存</li>
          <li class="on"><span class="dot"></span>网站更新中(约 1 分钟)</li>
          <li><span class="dot"></span>网站上看得到了</li>
        </ol></div>
      ${bar(`<a class="btn line" href="${esc(url)}" target="_blank" rel="noopener">在网站上看 ${I.ext}</a><a class="btn primary" href="#/">回首页</a>`)}`;
    const poll = async () => {
      if (S.flow !== F || !document.getElementById('prog')) return;
      const st = await API.status(F.pubId);
      const lis = document.querySelectorAll('#prog li');
      if (st === 'live') {
        lis[1].className = 'ok'; lis[1].querySelector('.dot').innerHTML = I.tick; lis[1].lastChild.textContent = '网站已更新';
        lis[2].className = 'ok'; lis[2].querySelector('.dot').innerHTML = I.tick;
      } else if (st === 'failed') {
        lis[1].className = ''; lis[1].lastChild.textContent = '这次没更新成功，Eden 会收到通知处理。内容已经保存，不会丢。';
      } else setTimeout(poll, 3000);
    };
    setTimeout(poll, 1500);
  }
  async function toPreview(F) {
    app.innerHTML = `${top('看一看', { back: '' })}<div class="loading"><div class="spinner"></div><p>正在翻译成另外两种语言…</p></div>`;
    try { await translateAll(F); F.pvLang = S.wl; previewScreen(F, F.step, F.of); } catch (e) { toast(e.message || '翻译失败，请再试一次'); F.step--; render(); }
  }

  // ------------------------------------------------------------------ 新闻
  function newsFlow(entry) {
    const d = entry?.data;
    const D = d ? {
      url: d[S.wl].url, title: d[S.wl].title, source: d[S.wl].source, excerpt: d[S.wl].excerpt || '', date: d[S.wl].date,
      src_lang: d[S.wl].src_lang || [], image: d[S.wl].image?.src || '', noImage: !d[S.wl].image,
    } : { url: '', title: '', source: '', excerpt: '', date: today(), src_lang: [], image: '', noImage: false };
    const F = {
      kind: 'news', D, entry, step: entry ? 2 : 1, of: 4, file: entry?.file,
      orig: d ? { title: tri(d, 'title'), source: tri(d, 'source'), excerpt: tri(d, 'excerpt') } : null,
      labelOf: (k) => ({ title: '标题', source: '媒体名称', excerpt: '一句话摘要' })[k],
      texts: () => ({ title: D.title.trim(), source: D.source.trim(), excerpt: D.excerpt.trim() }),
      build: (tr) => Object.fromEntries(['ms', 'en', 'zh'].map((l) => {
        const base = d ? clone(d[l]) : {};
        Object.assign(base, { date: D.date, src_lang: D.src_lang, url: D.url, source: tr[l].source, title: tr[l].title });
        if (tr[l].excerpt) base.excerpt = tr[l].excerpt; else delete base.excerpt;
        if (!D.noImage && D.image) base.image = { src: F.upload && D.image === F.upload.url ? (F.imgPath || D.image) : D.image, alt: tr.en.title };
        else { delete base.image; base.mast ??= tr[l].source; base.tone ??= 'ink'; }
        return [l, base];
      })),
      preview: PREVIEW.news,
      get message() { return entry ? `content: 修改新闻「${D.title}」（简易后台）` : `content: 新增新闻「${D.title}」（简易后台）`; },
      liveUrl: '/#news',
      assignPaths: () => { if (F.upload && !D.noImage && D.image === F.upload.url) F.imgPath = `/images/uploads/news/${D.date}-${slug(F.tr.en.title)}-${Date.now().toString(36)}.jpg`; },
      uploads: () => (F.imgPath && F.upload && !D.noImage && D.image === F.upload.url ? [{ path: F.imgPath, blob: F.upload.blob }] : []),
    };
    if (!F.file) F.fileFor = () => `content/news/${D.date}-${slug(F.tr?.en?.title || D.title)}.json`;
    return F;
  }
  function tri(d, k) { return { ms: d.ms[k] ?? '', en: d.en[k] ?? '', zh: d.zh[k] ?? '' }; }
  function renderNews(F) {
    const D = F.D;
    if (F.step === 1) {
      app.innerHTML = `${top('发新闻报道')}${steps(1, 4)}
        <h2 class="h">报道的链接</h2><p class="lead">从报纸网站或 Facebook 复制链接，贴在下面。我们会把标题和照片读出来。</p>
        <div class="field"><label for="f-url">链接</label><div class="input-row">
          <input class="input" id="f-url" data-k="url" type="url" inputmode="url" autocapitalize="off" placeholder="https://…" value="${esc(D.url)}">
          <button class="btn line small" data-paste>粘贴</button></div></div>
        <button class="btn ghost block" data-manual>没有链接，我自己填</button>
        ${bar(`<button class="btn primary" data-next ${D.url ? '' : 'disabled'}>下一步</button>`)}`;
      const next = app.querySelector('[data-next]');
      bindInputs(D, () => { next.disabled = !D.url.trim(); });
      app.querySelector('[data-paste]').addEventListener('click', async () => {
        try { D.url = (await navigator.clipboard.readText()).trim(); app.querySelector('#f-url').value = D.url; next.disabled = !D.url; } catch { toast('请长按输入框，选「粘贴」'); }
      });
      app.querySelector('[data-manual]').addEventListener('click', () => { F.step = 2; render(); });
      next.addEventListener('click', async () => {
        app.innerHTML = `${top('发新闻报道', { back: '' })}<div class="loading"><div class="spinner"></div><p>正在读取报道…</p></div>`;
        try {
          const r = await API.readLink(D.url.trim());
          Object.assign(D, { title: r.title || D.title, source: r.source || D.source, date: r.date || D.date, image: '', src_lang: r.lang ? [r.lang] : D.src_lang });
          if (r.image) {
            try { const p = await API.prepareImage(await API.fetchImage(r.image)); D.image = p.url; F.upload = p; } catch { /* 拿不到照片就不放 */ }
          }
          F.autofilled = !!(r.title || r.source);
        } catch (e) { toast(e.message || '读不到这个链接，请手动填写'); }
        F.step = 2; render();
      });
      return;
    }
    if (F.step === 2) {
      app.innerHTML = `${top(F.entry ? '修改新闻' : '发新闻报道')}${steps(2, 4)}
        <h2 class="h">${F.entry ? '改一改' : '确认内容'}</h2>
        ${F.autofilled ? `<div class="note ok">${I.check.replace('40', '18').replace('40', '18')}已经帮你填好了，看看对不对。</div>` : ''}
        ${wlSwitch()}
        ${field({ k: 'title', label: '标题', type: 'textarea', rows: 2, ph: S.wl === 'zh' ? '例：林智成促请政府给中小企业过渡期' : 'e.g. Alwin Lim urges…' }, D.title)}
        ${field({ k: 'source', label: '哪家媒体', ph: S.wl === 'zh' ? '例：东方日报' : 'e.g. The Star' }, D.source)}
        ${field({ k: 'date', label: '报道日期', type: 'date' }, D.date)}
        ${field({ k: 'excerpt', label: '一句话摘要', type: 'textarea', rows: 2, optional: true, max: 140, hint: '卡片标题下面的小字' }, D.excerpt)}
        <div class="field"><div class="label">照片</div>
          <div class="one-photo">${D.image && !D.noImage ? `<img src="${esc(D.image)}" alt="新闻照片">` : '<div class="none">不放照片<br>（会用媒体名做封面）</div>'}
            <div class="acts"><label class="btn line small">换一张<input type="file" accept="image/*" hidden data-file></label>
            ${D.image && !D.noImage ? '<button class="btn ghost small" data-noimg>不放照片</button>' : D.image ? '<button class="btn ghost small" data-useimg>用回原来的</button>' : ''}</div></div>
          <div class="note warn">${I.info}<span>照片里有中文字的话，英文 / 马来文版的读者也会看到。有的话请换一张。</span></div></div>
        ${field({ k: 'src_lang', label: '这篇报道是用什么语言写的？', type: 'chips', hint: '读者切到这种语言时，这篇会排在前面。可以选多个。', options: [{ v: 'zh', t: '中文' }, { v: 'en', t: 'English' }, { v: 'ms', t: 'Bahasa' }] }, D.src_lang)}
        ${!F.entry ? '' : `<button class="btn ghost block" data-url>改报道链接</button>`}
        ${bar(`<button class="btn primary" data-next>下一步：看三种语言</button>`)}`;
      bindInputs(D);
      app.querySelector('[data-file]').addEventListener('change', async (e) => {
        const f = e.target.files[0]; if (!f) return;
        const p = await API.prepareImage(f); D.image = p.url; D.noImage = false; F.upload = p; render();
      });
      app.querySelector('[data-noimg]')?.addEventListener('click', () => { D.noImage = true; render(); });
      app.querySelector('[data-useimg]')?.addEventListener('click', () => { D.noImage = false; render(); });
      app.querySelector('[data-url]')?.addEventListener('click', () => sheet(`<h3>报道链接</h3>${field({ k: 'url', label: '链接', type: 'url' }, D.url)}<button class="btn primary" data-close>好了</button>`, (bg) => bg.querySelectorAll('[data-k]').forEach((el) => el.addEventListener('input', () => { D.url = el.value; }))));
      app.querySelector('[data-next]').addEventListener('click', () => {
        const miss = [!D.title.trim() && '标题', !D.source.trim() && '媒体', !D.date && '日期', !D.src_lang.length && '报道语言'].filter(Boolean);
        if (miss.length) return toast(`还差：${miss.join('、')}`);
        F.step = 3; toPreview(F);
      });
      return;
    }
    if (F.step === 3) return previewScreen(F, 3, 4);
    if (F.step === 'done') return doneScreen(F);
  }

  // ------------------------------------------------------------------ 观点
  const ART_BY_CAT = { politics: 'ballot', economy: 'wage', penang: 'traffic', property: 'houses', youth: 'stairs' };
  const TONES = ['wine', 'ink', 'paper2'];
  function viewFlow(entry) {
    const d = entry?.data;
    // 正文 body(Markdown);旧观点只有 excerpt,就把它当正文
    const bodyTri = d ? Object.fromEntries(LANGS.map((l) => [l, d[l].body || d[l].excerpt || ''])) : null;
    const D = d ? { title: d[S.wl].title, body: bodyTri[S.wl], cat: d[S.wl].cat, url: d[S.wl].url || '', date: d[S.wl].date, image: d[S.wl].image?.src || d[S.wl].image || '' }
      : { title: '', body: '', cat: '', url: '', date: today(), image: '' };
    const F = {
      kind: 'view', D, entry, step: 1, of: 3, file: entry?.file,
      orig: d ? { title: tri(d, 'title'), body: bodyTri } : null,
      labelOf: (k) => ({ title: '题目', body: '内容' })[k],
      rich: ['body'],
      texts: () => ({ title: D.title.trim(), body: D.body.trim() }),
      build: (tr) => Object.fromEntries(['ms', 'en', 'zh'].map((l) => {
        const base = d ? clone(d[l]) : { cta: 'read', tone: TONES[S.c.views.length % 3] };
        Object.assign(base, { date: D.date, cat: D.cat, url: D.url, title: tr[l].title, body: tr[l].body, art: base.art || ART_BY_CAT[D.cat] || 'ballot' });
        delete base.excerpt; // 卡片摘要从正文自动截
        if (D.image) base.image = { src: F.upload && D.image === F.upload.url ? (F.imgPath || D.image) : D.image, alt: tr.en.title }; else delete base.image;
        return [l, base];
      })),
      preview: PREVIEW.view,
      get message() { return entry ? `content: 修改观点「${D.title}」（简易后台）` : `content: 新增观点「${D.title}」（简易后台）`; },
      liveUrl: '/#views',
      fileFor: () => `content/views/${D.date}-${wordSlug(F.tr.en.title)}.json`,
      assignPaths: () => {
        const base = `/images/uploads/views/${D.date}-${slug(F.tr.en.title)}`;
        if (F.upload && D.image === F.upload.url) F.imgPath = `${base}-${Date.now().toString(36)}.jpg`;
        F.bodyUps = assignBodyImages(F.tr, 'body', base);
        F.liveUrl = `/views/${(F.file || F.fileFor()).split('/').pop().replace(/\.json$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '')}`;
      },
      uploads: () => [...(F.imgPath && F.upload && D.image === F.upload.url ? [{ path: F.imgPath, blob: F.upload.blob }] : []), ...(F.bodyUps || [])],
    };
    return F;
  }
  function renderView(F) {
    const D = F.D;
    if (F.step === 1) {
      app.innerHTML = `${top(F.entry ? '修改观点' : '发观点')}${steps(1, 3)}
        <h2 class="h">${F.entry ? '改一改' : '你想说什么？'}</h2><p class="lead">网站上会变成一篇文章：首页显示开头几行，点进去看全文。</p>
        ${wlSwitch()}
        ${field({ k: 'title', label: '题目', type: 'textarea', rows: 2, max: 80, ph: S.wl === 'zh' ? '例：短租要规管，不是禁止' : 'e.g. Regulate short-term rentals, don’t ban them' }, D.title)}
        ${field({ k: 'body', label: '内容', type: 'rich', hint: '想写多长都可以。选中文字后点上面的按钮：粗体、标题、列表、颜色、链接；点图片按钮在文中插照片。' }, D.body)}
        ${field({ k: 'cat', label: '属于哪一类', type: 'chips', options: catOptions('view') }, D.cat)}
        ${field({ k: 'url', label: '原文链接', type: 'url', optional: true, hint: '如果是 Facebook / Instagram 帖子或文章，贴上链接，读者可以点进去看全文。' }, D.url)}
        ${field({ k: 'date', label: '日期', type: 'date' }, D.date)}
        <div class="field"><div class="label">配图 <span class="opt">（可不填）</span></div><p class="hint">不放的话，网站会按类别配一张插画。</p>
          <div class="one-photo">${D.image ? `<img src="${esc(D.image)}" alt="">` : `<div class="none" style="background:var(--wine-soft);color:var(--wine)">${D.cat ? art(ART_BY_CAT[D.cat]).replace('<svg', '<svg width="70" height="50"') : '插画'}</div>`}
          <div class="acts"><label class="btn line small">${D.image ? '换一张' : '用自己的照片'}<input type="file" accept="image/*" hidden data-file></label>${D.image ? '<button class="btn ghost small" data-noimg>改用插画</button>' : ''}</div></div></div>
        ${bar(`<button class="btn primary" data-next>下一步：看三种语言</button>`)}`;
      bindInputs(D, () => {});
      app.querySelectorAll('[data-chip="cat"]').forEach((b) => b.addEventListener('click', () => render()));
      app.querySelector('[data-file]').addEventListener('change', async (e) => { const f = e.target.files[0]; if (!f) return; const p = await API.prepareImage(f); D.image = p.url; F.upload = p; render(); });
      app.querySelector('[data-noimg]')?.addEventListener('click', () => { D.image = ''; render(); });
      app.querySelector('[data-next]').addEventListener('click', () => {
        const miss = [!D.title.trim() && '题目', !D.body.trim() && '内容', !D.cat && '类别'].filter(Boolean);
        if (miss.length) return toast(`还差：${miss.join('、')}`);
        F.step = 2; toPreview(F);
      });
      return;
    }
    if (F.step === 2) return previewScreen(F, 2, 3);
    if (F.step === 'done') return doneScreen(F);
  }

  // ------------------------------------------------------------------ 相册
  function albumFlow(entry) {
    const d = entry?.data;
    const D = d ? { title: d[S.wl].title, place: d[S.wl].place, cat: d[S.wl].cat, date: toIso(d[S.wl].date), url: d[S.wl].url || '',
      photos: d[S.wl].photos.map((p, i) => ({ image: p.image, _url: p.image, caption: p.caption || '', _i: i })) }
      : { title: '', place: '', cat: '', date: today(), url: '', photos: [] };
    const F = {
      kind: 'album', D, entry, step: entry ? 2 : 1, of: 4, file: entry?.file,
      orig: d ? { title: tri(d, 'title'), place: tri(d, 'place') } : null,
      labelOf: (k) => ({ title: '活动名称', place: '地点 / 一句话' })[k],
      texts: () => ({ title: D.title.trim(), place: D.place.trim() }),
      build: (tr) => {
        const id = d?.en.id || `${slug(tr.en.title)}-${D.date.slice(0, 4)}`;
        const inCat = S.c.gallery.filter((g) => g.data.en.cat === D.cat && g.file !== entry?.file).map((g) => +g.data.en.order || 0);
        const order = d && d.en.cat === D.cat ? d.en.order : (Math.max(0, ...inCat) + 10);
        return Object.fromEntries(['ms', 'en', 'zh'].map((l) => {
          const base = d ? clone(d[l]) : { hidden: false };
          Object.assign(base, { id, title: tr[l].title, place: tr[l].place, cat: D.cat, date: dmy(D.date), order, url: D.url,
            photos: D.photos.map((p, i) => ({ image: p.image || p.path || p._url, _url: p._url, caption: p._i != null && d ? (d[l].photos[p._i]?.caption || '') : '' })) });
          return [l, base];
        }));
      },
      preview: PREVIEW.album,
      get message() { return entry ? `content: 修改相册「${D.title}」（简易后台）` : `content: 新增相册「${D.title}」（简易后台）`; },
      liveUrl: '/gallery',
      fileFor: () => `content/gallery/${slug(F.tr.en.title)}-${D.date.slice(0, 4)}.json`,
      assignPaths: () => {
        const id = d?.en.id || `${slug(F.tr.en.title)}-${D.date.slice(0, 4)}`; const stamp = Date.now().toString(36);
        D.photos.forEach((p, i) => { if (p.blob && !p.path) p.path = `/images/uploads/gallery/${id}-${stamp}-${String(i + 1).padStart(2, '0')}.jpg`; });
      },
      uploads: () => D.photos.filter((p) => p.blob && p.path).map((p) => ({ path: p.path, blob: p.blob })),
    };
    return F;
  }
  function sortKey(s) { const iso = toIso(s, ''); if (iso) return iso; const ys = String(s).match(/\d{4}/g); return ys ? `${ys.at(-1)}-00-00` : '0000'; }
  function toIso(s, dflt = today()) { const m = String(s).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : dflt; }
  function renderAlbum(F) {
    const D = F.D;
    if (F.step === 1 || (F.step === 2 && F.entry && F.editPhotos)) {
      const saved = D.photos.reduce((a, p) => a + (p.before ? p.before - p.after : 0), 0);
      app.innerHTML = `${top(F.entry ? '修改相册' : '加相册')}${F.entry ? '' : steps(1, 4)}
        <h2 class="h">选照片</h2><p class="lead">第一张会当封面。点照片上的 × 可以拿掉。</p>
        <label class="drop"><b>+ 从手机相册选照片</b><span class="muted">可以一次选很多张</span><input type="file" accept="image/*" multiple hidden data-files></label>
        ${D.photos.length ? `<div class="photos">${D.photos.map((p, i) => `<div class="ph"><img src="${esc(p._url)}" alt="照片 ${i + 1}">${i === 0 ? '<span class="cover">封面</span>' : `<button class="mk" data-cover="${i}">设为封面</button>`}<button class="x" data-rm="${i}" aria-label="拿掉第 ${i + 1} 张">×</button></div>`).join('')}</div>
          <p class="muted" style="margin-top:10px">共 ${D.photos.length} 张${saved > 0 ? `，已自动压缩（省了 ${(saved / 1048576).toFixed(1)} MB）` : ''}</p>` : ''}
        ${bar(`<button class="btn primary" data-next ${D.photos.length ? '' : 'disabled'}>${F.entry ? '好了' : '下一步'}</button>`)}`;
      app.querySelector('[data-files]').addEventListener('change', async (e) => {
        const files = [...e.target.files];
        app.querySelector('.drop b').textContent = `正在处理 ${files.length} 张照片…`;
        for (const f of files) { const p = await API.prepareImage(f); D.photos.push({ _url: p.url, blob: p.blob, before: p.before, after: p.after }); }
        render();
      });
      app.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { D.photos.splice(+b.dataset.rm, 1); render(); }));
      app.querySelectorAll('[data-cover]').forEach((b) => b.addEventListener('click', () => { const [p] = D.photos.splice(+b.dataset.cover, 1); D.photos.unshift(p); render(); }));
      app.querySelector('[data-next]').addEventListener('click', () => { F.editPhotos = false; F.step = 2; render(); });
      return;
    }
    if (F.step === 2) {
      app.innerHTML = `${top(F.entry ? '修改相册' : '加相册')}${steps(2, 4)}
        <h2 class="h">是什么活动？</h2>
        ${wlSwitch()}
        ${field({ k: 'title', label: '活动名称', ph: S.wl === 'zh' ? '例：升旗山社青团党员大会' : 'e.g. DAPSY Bukit Bendera AGM' }, D.title)}
        ${field({ k: 'place', label: '地点 / 一句话', optional: true, ph: S.wl === 'zh' ? '例：亚依淡 · 101 名团员出席' : 'e.g. Air Itam · 101 members attended' }, D.place)}
        ${field({ k: 'cat', label: '属于哪一类', type: 'chips', options: catOptions('album') }, D.cat)}
        ${field({ k: 'date', label: '活动日期', type: 'date' }, D.date)}
        ${field({ k: 'url', label: 'Facebook 帖子链接', type: 'url', optional: true }, D.url)}
        ${F.entry ? `<div class="field"><div class="label">照片(${D.photos.length} 张)</div><button class="btn line block" data-photos>加 / 删照片</button></div>` : ''}
        ${bar(`${F.entry ? '' : '<button class="btn line" data-prev>上一步</button>'}<button class="btn primary" data-next>下一步：看三种语言</button>`)}`;
      bindInputs(D);
      app.querySelector('[data-prev]')?.addEventListener('click', () => { F.step = 1; render(); });
      app.querySelector('[data-photos]')?.addEventListener('click', () => { F.editPhotos = true; render(); });
      app.querySelector('[data-next]').addEventListener('click', () => {
        const miss = [!D.title.trim() && '活动名称', !D.cat && '类别', !D.date && '日期'].filter(Boolean);
        if (miss.length) return toast(`还差：${miss.join('、')}`);
        F.step = 3; toPreview(F);
      });
      return;
    }
    if (F.step === 3) return previewScreen(F, 3, 4);
    if (F.step === 'done') return doneScreen(F);
  }

  // ------------------------------------------------------------------ 我的资料(改现有的段落)
  const SECTIONS = [
    { id: 'intro', title: '一句话介绍', where: '首页最上面，名字下面那段话', file: 'home',
      fields: [{ p: 'hero.kicker', label: '名字上面的小字' }, { p: 'hero.role', label: '介绍', type: 'textarea' }] },
    { id: 'stats', title: '首页的四个数字', where: '首页照片旁边的四张小卡', file: 'home',
      list: { p: 'hero.stats', name: '卡片', fixed: true, fields: [{ k: 'value', label: '大字' }, { k: 'label', label: '说明', type: 'textarea' }] } },
    { id: 'stance', title: '我的立场', where: '首页「立场」那一段：一句引言 + 几个主张', file: 'home',
      fields: [{ p: 'stance.quote', label: '引言', type: 'textarea' }, { p: 'stance.cite', label: '出处' }, { p: 'stance.note', label: '底下的补充', type: 'textarea' }],
      list: { p: 'stance.planks', name: '主张', fields: [{ k: 'title', label: '主张' }, { k: 'body', label: '说明', type: 'textarea' }] } },
    { id: 'journey', title: '我的历程', where: '首页「历程」时间线', file: 'home',
      list: { p: 'journey.items', name: '经历', fields: [{ k: 'when', label: '时间（例：2024 – 2026）' }, { k: 'title', label: '标题' }, { k: 'body', label: '说明', type: 'textarea' }] } },
    { id: 'about', title: '关于我', where: '「关于」页的开头和基本资料', file: 'about',
      fields: [{ p: 'lead', label: '开头介绍', type: 'textarea' }],
      list: { p: 'facts', name: '资料', fields: [{ k: 'term', label: '项目(例：职务)' }, { k: 'value', label: '内容' }] } },
    { id: 'story', title: '我的故事', where: '「关于」页下面的几个章节', file: 'about',
      list: { p: 'chapters', name: '章节', noAdd: true, fields: [{ k: 'title', label: '章节标题' }, { k: 'paragraphs', label: '内容（空一行 = 分段）', type: 'textarea', paras: true, rows: 8 }] } },
    { id: 'contact', title: '联系方式', where: '每一页最下面', file: 'site',
      fields: [{ p: 'contact.title', label: '标题' }],
      list: { p: 'contact.channels', name: '联系方式', fields: [{ k: 'label', label: '名称（例：Facebook）' }, { k: 'url', label: '链接', type: 'url', same: true }] } },
  ];
  function sectionFlow(sec) {
    const entry = S.c[sec.file];
    const d = entry.data;
    const val = (o) => (Array.isArray(o) ? o.map((x) => x.text).join('\n\n') : o ?? '');
    const D = {};
    const orig = {};
    for (const f of sec.fields || []) { D[f.p] = get(d[S.wl], f.p) ?? ''; orig[f.p] = { ms: get(d.ms, f.p) ?? '', en: get(d.en, f.p) ?? '', zh: get(d.zh, f.p) ?? '' }; }
    const items = sec.list ? (get(d[S.wl], sec.list.p) || []).map((it, i) => {
      const o = { _i: i };
      for (const f of sec.list.fields) {
        o[f.k] = val(it[f.k]);
        if (!f.same) orig[`${i}.${f.k}`] = Object.fromEntries(LANGS.map((l) => [l, val(get(d[l], sec.list.p)[i]?.[f.k])]));
      }
      return o;
    }) : [];
    const F = {
      kind: 'section', sec, D, items, step: 1, of: 3, file: entry.file, orig,
      labelOf: (k) => {
        const f = sec.fields?.find((x) => x.p === k); if (f) return f.label;
        const [i, kk] = k.split('.'); const idx = items.findIndex((x) => String(x._key) === i);
        return `${sec.list.name} ${idx + 1} · ${(sec.list.fields.find((x) => x.k === kk)?.label || '').replace(/（例.*?）/, '')}`;
      },
      texts: () => {
        const t = {};
        for (const f of sec.fields || []) t[f.p] = String(D[f.p]).trim();
        items.forEach((it) => { for (const f of sec.list.fields) if (!f.same) t[`${it._key}.${f.k}`] = String(it[f.k] || '').trim(); });
        return t;
      },
      build: (tr) => Object.fromEntries(['ms', 'en', 'zh'].map((l) => {
        const base = clone(d[l]);
        for (const f of sec.fields || []) set(base, f.p, tr[l][f.p]);
        if (sec.list) {
          const old = get(d[l], sec.list.p) || [];
          set(base, sec.list.p, items.map((it) => {
            const o = it._i != null ? clone(old[it._i]) : {};
            for (const f of sec.list.fields) {
              const v = f.same ? it[f.k] : tr[l][`${it._key}.${f.k}`];
              o[f.k] = f.paras ? v.split(/\n\s*\n/).map((s) => ({ text: s.trim() })).filter((p) => p.text) : v;
            }
            return o;
          }));
        }
        return [l, base];
      })),
      message: `content: 修改「${sec.title}」（简易后台）`,
      liveUrl: sec.file === 'about' ? '/about' : '/',
    };
    items.forEach((it) => { it._key = it._i; });
    // 原文 key 用原来的序号；新加的项给一个新号
    F.nextKey = items.length + 100;
    return F;
  }
  function renderSection(F) {
    const { sec, D, items } = F;
    if (F.step === 1) {
      app.innerHTML = `${top(sec.title, { back: '#/me' })}${steps(1, 3)}
        <div class="note">${I.info}<span>在网站上的位置：${esc(sec.where)}</span></div>
        ${wlSwitch()}
        ${(sec.fields || []).map((f) => field({ k: f.p, label: f.label, type: f.type, rows: 3 }, D[f.p])).join('')}
        ${sec.list ? items.map((it, n) => `<div class="list" style="padding:4px 14px 6px;margin-top:16px" data-item="${n}">
            <div style="display:flex;align-items:center;justify-content:space-between;padding-top:10px"><b>${esc(sec.list.name)} ${n + 1}</b>
            ${sec.list.fixed || sec.list.noAdd ? '' : `<button class="btn ghost small" data-del="${n}">删除</button>`}</div>
            ${sec.list.fields.map((f) => field({ k: `${n}::${f.k}`, label: f.label, type: f.type, rows: f.rows || 3 }, it[f.k])).join('')}</div>`).join('')
          + (sec.list.fixed || sec.list.noAdd ? '' : `<button class="btn line block" style="margin-top:14px" data-add>+ 加一项${esc(sec.list.name)}</button>`) : ''}
        ${bar(`<button class="btn primary" data-next>下一步：看三种语言</button>`)}`;
      const proxy = new Proxy({}, { set: (_, k, v) => { if (k.includes('::')) { const [n, kk] = k.split('::'); items[+n][kk] = v; } else D[k] = v; return true; } });
      bindInputs(proxy);
      app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => sheet(`<h3>删除${esc(sec.list.name)} ${+b.dataset.del + 1}?</h3><p class="muted">发布后网站上就不会再显示这一项。</p><button class="btn primary" data-yes>删除</button>`, (bg, close) => bg.querySelector('[data-yes]').addEventListener('click', () => { items.splice(+b.dataset.del, 1); close(); render(); }))));
      app.querySelector('[data-add]')?.addEventListener('click', () => { const o = { _key: F.nextKey++ }; for (const f of sec.list.fields) o[f.k] = ''; items.push(o); render(); setTimeout(() => app.querySelector(`[data-item="${items.length - 1}"] .input`)?.focus(), 50); });
      app.querySelector('[data-next]').addEventListener('click', () => { F.step = 2; toPreview(F); });
      F.onWl = () => { const nf = sectionFlow(sec); Object.assign(F, nf); S.flow = F; };
      return;
    }
    if (F.step === 2) return previewScreen(F, 2, 3);
    if (F.step === 'done') return doneScreen(F);
  }

  // ------------------------------------------------------------------ 首页 / 列表
  function recent() {
    const rows = [
      ...S.c.news.map((e) => ({ kind: 'news', e, date: e.data.en.date, title: L(e.data).title, img: e.data.en.image?.src, hidden: e.data.en.hidden })),
      ...S.c.views.map((e) => ({ kind: 'view', e, date: e.data.en.date, title: L(e.data).title, img: e.data.en.image?.src, hidden: e.data.en.hidden })),
      ...S.c.gallery.map((e) => ({ kind: 'album', e, date: sortKey(e.data.en.date), text: e.data[S.wl].date, title: L(e.data).title, img: e.data.en.photos?.[0]?.image, hidden: e.data.en.hidden })),
    ];
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }
  const KIND = { news: '新闻', view: '观点', album: '相册' };
  function renderHome() {
    const h = new Date().getHours();
    const hi = h < 12 ? '早安' : h < 18 ? '午安' : '晚上好';
    const rows = recent();
    const shown = S.showAll ? rows : rows.slice(0, 6);
    app.innerHTML = `${top('网站管理', { back: '', right: `<button class="icon-btn" data-menu aria-label="我的帐号">${I.me}</button>` })}
      <div class="hello"><h2>${hi}，${esc(S.me?.name || 'Alwin')}</h2><p>今天想在网站上更新什么？</p></div>
      <nav class="tiles" aria-label="要做的事">
        <a class="tile" href="#/new/news"><span class="ico">${I.news}</span><b>发新闻报道</b><span>有媒体报道你？贴上链接就好</span></a>
        <a class="tile" href="#/new/view"><span class="ico">${I.view}</span><b>发观点</b><span>说说你对一件事的看法</span></a>
        <a class="tile" href="#/new/album"><span class="ico">${I.album}</span><b>加相册</b><span>活动照片，一次上传</span></a>
        <a class="tile" href="#/me"><span class="ico">${I.me}</span><b>改我的资料</b><span>介绍、立场、历程、联系方式</span></a>
      </nav>
      <h3 class="sec-title">最近的内容 · 点一下可以修改或下架</h3>
      <div class="list">${shown.map((r, i) => `<button class="row" data-row="${i}">
          ${r.img ? `<img class="thumb" src="${esc(r.img)}" alt="" loading="lazy">` : `<span class="thumb" style="display:grid;place-items:center;color:var(--wine)">${I[r.kind]}</span>`}
          <span class="txt"><span class="t1">${esc(r.title)}</span><span class="t2"><span class="tag">${KIND[r.kind]}</span>${r.hidden ? '<span class="tag off">已下架</span>' : ''}${esc(r.text || fmtDate(r.date))}</span></span>
          <span class="chev">${I.chev}</span></button>`).join('')}
        ${rows.length > 6 ? `<button class="more" data-all>${S.showAll ? '收起' : `看全部 ${rows.length} 条`}</button>` : ''}</div>
      <p class="muted" style="text-align:center;margin-top:26px"><a href="/" target="_blank" rel="noopener">打开网站 ${I.ext}</a></p>`;
    app.querySelector('[data-all]')?.addEventListener('click', () => { S.showAll = !S.showAll; renderHome(); });
    app.querySelectorAll('[data-row]').forEach((b) => b.addEventListener('click', () => rowMenu(shown[+b.dataset.row])));
    app.querySelector('[data-menu]').addEventListener('click', () => sheet(`<h3>${esc(S.me?.name)}</h3><p class="muted">用户名：${esc(S.me?.username)}</p>
      ${S.me?.role === 'admin' ? '<a class="btn line" href="/admin/">进阶模式（Sveltia）</a>' : ''}<button class="btn danger" data-out>登出</button>`, (bg, close) => bg.querySelector('[data-out]').addEventListener('click', () => { API.logout(); S.me = null; close(); go('#/login'); })));
  }
  function rowMenu(r) {
    const hidden = !!r.hidden;
    sheet(`<h3>${esc(r.title)}</h3><p class="muted">${KIND[r.kind]} · ${esc(r.text || fmtDate(r.date))}</p>
      <button class="btn primary" data-edit>修改</button>
      <button class="btn line" data-hide>${hidden ? '重新放回网站' : '暂时从网站拿下来'}</button>
      <p class="muted" style="margin-top:6px;font-size:13px">${hidden ? '' : '拿下来不会删掉，之后随时可以放回去。'}</p>`, (bg, close) => {
      bg.querySelector('[data-edit]').addEventListener('click', () => { close(); S.flow = { news: newsFlow, view: viewFlow, album: albumFlow }[r.kind](r.e); go(`#/edit/${r.kind}`); });
      bg.querySelector('[data-hide]').addEventListener('click', async () => {
        close();
        const data = clone(r.e.data); for (const l of LANGS) data[l].hidden = !hidden;
        try { await API.publish({ files: [{ path: r.e.file, json: data }], message: `content: ${hidden ? '放回' : '下架'}「${r.title}」（简易后台）` }); }
        catch (e) { toast(e.message); return; }
        r.e.data = data; toast(hidden ? '已放回，约 1 分钟后网站上看得到' : '已拿下来，约 1 分钟后网站上就看不到了'); renderHome();
      });
    });
  }
  function renderMe() {
    app.innerHTML = `${top('改我的资料')}
      <h2 class="h">要改哪一部分？</h2><p class="lead">这些是网站上关于你的固定内容。</p>
      <div class="list">${SECTIONS.map((s) => `<a class="row" href="#/me/${s.id}"><span class="txt"><span class="t1">${esc(s.title)}</span><span class="t2">${esc(s.where)}</span></span><span class="chev">${I.chev}</span></a>`).join('')}</div>`;
  }
  function renderLogin() {
    app.innerHTML = `<div class="login">
      <div class="mark">Alwin Lim<span>林智成</span></div>
      <h2 class="h" style="margin-top:8px">网站管理</h2><p class="lead">登录后就可以更新网站。</p>
      ${API.demo ? '<div class="note warn">示意版：随便填一个用户名和密码就能进去。</div>' : ''}
      <form id="lf">
        <div class="field"><label for="u">用户名</label><input class="input" id="u" autocomplete="username" autocapitalize="off" required></div>
        <div class="field"><label for="p">密码</label><input class="input" id="p" type="password" autocomplete="current-password" required></div>
        <button class="btn primary block" type="submit">登录</button>
      </form><p class="muted" style="margin-top:18px">忘了密码？请找 Eden 重设。</p></div>`;
    app.querySelector('#lf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const b = e.target.querySelector('button'); b.disabled = true; b.textContent = '登录中…';
      try { S.me = await API.login(app.querySelector('#u').value.trim(), app.querySelector('#p').value); go('#/'); }
      catch (err) { toast(err.message || '用户名或密码不对'); b.disabled = false; b.textContent = '登录'; }
    });
  }

  async function renderInvite(token) {
    app.innerHTML = '<div class="loading"><div class="spinner"></div><p>载入中…</p></div>';
    let who;
    try { who = await API.invite(token); } catch (e) {
      app.innerHTML = `<div class="login"><h2 class="h">这个链接用不了</h2><p class="lead">${esc(e.message)}</p><a class="btn line block" href="#/login">去登录</a></div>`;
      return;
    }
    app.innerHTML = `<div class="login">
      <div class="mark">Alwin Lim<span>林智成</span></div>
      <h2 class="h" style="margin-top:8px">你好，${esc(who.name)}</h2>
      <p class="lead">先设一个你自己的密码。以后用<b>用户名 ${esc(who.username)}</b> 和这个密码登录。</p>
      <form id="inv">
        <input type="text" autocomplete="username" value="${esc(who.username)}" hidden readonly>
        <div class="field"><label for="p1">新密码</label><p class="hint">至少 8 个字，建议用一句好记的话。</p><input class="input" id="p1" type="password" autocomplete="new-password" minlength="8" required></div>
        <div class="field"><label for="p2">再输入一次</label><input class="input" id="p2" type="password" autocomplete="new-password" minlength="8" required></div>
        <button class="btn primary block" type="submit">设好了，进去</button>
      </form></div>`;
    app.querySelector('#inv').addEventListener('submit', async (e) => {
      e.preventDefault();
      const a = app.querySelector('#p1').value; const b = app.querySelector('#p2').value;
      if (a.length < 8) return toast('密码至少 8 个字');
      if (a !== b) return toast('两次输入的不一样');
      const btn = e.target.querySelector('button'); btn.disabled = true; btn.textContent = '设定中…';
      try { S.me = await API.acceptInvite(token, a); toast('设好了！以后用这个密码登录'); location.hash = '#/'; }
      catch (err) { toast(err.message); btn.disabled = false; btn.textContent = '设好了，进去'; }
    });
  }

  // ------------------------------------------------------------------ 路由
  async function render(nav = false) {
    const h = location.hash || '#/';
    const inv = h.match(/^#\/invite\/([\w-]{20,})$/);
    if (inv) return renderInvite(inv[1]);
    if (!S.me) { if (h !== '#/login') { location.hash = '#/login'; return; } return renderLogin(); }
    if (h === '#/login') { location.hash = '#/'; return; }
    if (!S.c) { app.innerHTML = '<div class="loading"><div class="spinner"></div><p>载入中…</p></div>'; S.c = await API.load(); }
    if (nav) window.scrollTo(0, 0);
    const m = h.match(/^#\/(new|edit)\/(news|view|album)$/);
    if (m) {
      if (m[1] === 'new' && (!S.flow || (nav && (S.flow.kind !== m[2] || S.flow.entry || S.flow.step === 'done')))) S.flow = { news: newsFlow, view: viewFlow, album: albumFlow }[m[2]]();
      if (m[1] === 'edit' && !S.flow) return go('#/');
      return { news: renderNews, view: renderView, album: renderAlbum }[m[2]](S.flow);
    }
    const ms = h.match(/^#\/me\/(\w+)$/);
    if (ms) {
      const sec = SECTIONS.find((s) => s.id === ms[1]); if (!sec) return go('#/me');
      if (!S.flow || (nav && (S.flow.sec !== sec || S.flow.step === 'done'))) S.flow = sectionFlow(sec);
      return renderSection(S.flow);
    }
    S.flow = null;
    if (h === '#/me') return renderMe();
    return renderHome();
  }
  render(true);
})();
