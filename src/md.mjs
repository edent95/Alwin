// 观点正文的格式:Markdown 的一个小子集 + 限定的字体颜色。网站构建(Node)和简易后台 /edit(浏览器)共用这一份:
// 构建时把本文件去掉 export 写成 _site/edit/md.js(window.MD)。不要引入别的模块,也不要用 Node / DOM 的全局对象
// (htmlToMd 只用传进来的节点)。
//
//   ## 大标题          ### 小标题
//   - 列表             1. 编号列表
//   **粗体** 或 *粗体*(和 WhatsApp 一样,单星号也是粗体)
//   [文字](https://…)  链接
//   ![说明](/images/…) 图片(单独一行)
//   <span class="tc-wine">文字</span>  字体颜色(只认 COLORS 里的几种)
//   空一行 = 新段落;段落里换一行 = 换行

export const COLORS = { wine: '酒红', blue: '深蓝', green: '深绿', grey: '灰色' };

const escH = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SAFE_URL = /^(https?:\/\/|\/|mailto:|tel:|#)/i;
const SPAN_OPEN = /<span class="tc-([a-z]+)">/g;

/** 行内:颜色、粗体、链接、换行 */
export function inline(s) {
  // 1) 先把允许的颜色标签换成占位符,再转义其余 HTML
  const marks = [];
  let t = String(s ?? '').replace(SPAN_OPEN, (m, c) => (COLORS[c] ? `\u0001${marks.push(`<span class="tc-${c}">`) - 1}\u0002` : m))
    .replace(/<\/span>/g, () => `\u0001${marks.push('</span>') - 1}\u0002`);
  t = escH(t);
  // 2) 链接 [文字](网址)
  t = t.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (m, text, url) => {
    const u = url.replace(/&amp;/g, '&');
    if (!SAFE_URL.test(u)) return text;
    const ext = /^https?:/i.test(u) ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${escH(u)}"${ext}>${text}</a>`;
  });
  // 3) 粗体 **x** 与 *x*
  t = t.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\n]+?)\*/g, '<strong>$1</strong>');
  // 4) 还原颜色标签,补齐没关上的
  let open = 0;
  t = t.replace(/\u0001(\d+)\u0002/g, (m, i) => {
    const tag = marks[+i];
    if (tag === '</span>') { if (!open) return ''; open--; return tag; }
    open++; return tag;
  });
  t += '</span>'.repeat(open);
  return t.replace(/\r?\n/g, '<br>');
}

const IMG_LINE = /^!\[([^\]\n]*)\]\(([^)\s]+)\)$/;

/** Markdown 子集 → HTML */
export function mdToHtml(md) {
  const lines = String(md ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let para = [];
  let list = null; // { tag, items }
  const flushPara = () => { if (para.length) out.push(`<p>${inline(para.join('\n'))}</p>`); para = []; };
  const flushList = () => { if (list) out.push(`<${list.tag}>${list.items.map((x) => `<li>${inline(x)}</li>`).join('')}</${list.tag}>`); list = null; };
  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if ((m = /^(#{2,3})\s+(.+)$/.exec(line))) { flushPara(); flushList(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if ((m = IMG_LINE.exec(line.trim()))) {
      flushPara(); flushList();
      // blob: 只在简易后台里出现(还没上传的照片,发布时换成 /images/…)
      if (SAFE_URL.test(m[2]) || m[2].startsWith('blob:')) out.push(`<figure><img src="${escH(m[2])}" alt="${escH(m[1])}" loading="lazy">${m[1] ? `<figcaption>${inline(m[1])}</figcaption>` : ''}</figure>`);
      continue;
    }
    if ((m = /^\s*(?:-|•)\s+(.*)$/.exec(line)) || (m = /^\s*(\d+)[.)]\s+(.*)$/.exec(line))) {
      const tag = m.length === 3 ? 'ol' : 'ul';
      flushPara();
      if (list && list.tag !== tag) flushList();
      list ??= { tag, items: [] };
      list.items.push(m[m.length - 1]);
      continue;
    }
    if (list) flushList();
    para.push(line);
  }
  flushPara(); flushList();
  return out.join('\n');
}

/** 纯文字(卡片摘要、分享描述用):去掉格式,取前 n 个字 */
export function mdToText(md, n = 160) {
  const t = String(md ?? '')
    .replace(/^!\[[^\]]*\]\([^)]*\)$/gm, '')
    .replace(/<\/?span[^>]*>/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*?([^*\n]+?)\*\*?/g, '$1')
    .replace(/^#{2,3}\s+.*$/gm, '') // 摘要里不要小标题
    .replace(/^\s*(?:-|•|\d+[.)])\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const at = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('. '), cut.lastIndexOf('!'), cut.lastIndexOf('?'), cut.lastIndexOf('！'), cut.lastIndexOf('？'));
  return at > n * 0.5 ? cut.slice(0, at + 1) : `${cut.replace(/\s+\S*$/, '')}…`;
}

/** 正文里的本地图片路径(构建时检查文件在不在) */
export const mdImages = (md) => [...String(md ?? '').matchAll(/^!\[[^\]]*\]\(([^)\s]+)\)$/gm)].map((m) => m[1]);

/** 编辑器(contenteditable)的 DOM → Markdown。只在浏览器用,node 是编辑器根元素 */
export function htmlToMd(root) {
  const colorOf = (el) => {
    const cls = [...(el.classList || [])].find((c) => c.startsWith('tc-'));
    if (cls && COLORS[cls.slice(3)]) return cls.slice(3);
    return el.dataset?.tc && COLORS[el.dataset.tc] ? el.dataset.tc : '';
  };
  const inl = (node) => {
    let s = '';
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { s += n.nodeValue.replace(/ /g, ' ').replace(/\*/g, '∗'); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName;
      const inner = inl(n);
      if (tag === 'BR') s += '\n';
      else if (tag === 'B' || tag === 'STRONG' || (tag === 'SPAN' && /bold|[6-9]00/.test(n.style?.fontWeight || ''))) s += inner.trim() ? wrapBold(inner) : inner;
      else if (tag === 'A' && n.getAttribute('href')) s += `[${inner}](${n.getAttribute('href')})`;
      else if (tag === 'IMG') s += `\n![${n.alt || ''}](${n.getAttribute('src')})\n`;
      else if ((tag === 'SPAN' || tag === 'FONT') && colorOf(n)) s += inner ? `<span class="tc-${colorOf(n)}">${inner}</span>` : '';
      else if (/^(DIV|P|H[1-6]|UL|OL|LI|FIGURE)$/.test(tag)) s += `\n${inner}\n`;
      else s += inner;
    }
    return s;
  };
  // 粗体的星号要贴着字:「 **字** 」而不是「** 字 **」
  const wrapBold = (x) => { const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(x); return `${m[1]}**${m[2]}**${m[3]}`; };
  const blocks = [];
  const walk = (node) => {
    for (const n of node.childNodes) {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) blocks.push(inl({ childNodes: [n] }).trim()); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName;
      if (tag === 'H1' || tag === 'H2') blocks.push(`## ${inl(n).replace(/\n+/g, ' ').trim()}`);
      else if (tag === 'H3' || tag === 'H4') blocks.push(`### ${inl(n).replace(/\n+/g, ' ').trim()}`);
      else if (tag === 'UL' || tag === 'OL') {
        const items = [...n.children].filter((li) => li.tagName === 'LI').map((li, i) => `${tag === 'OL' ? `${i + 1}.` : '-'} ${inl(li).replace(/\n+/g, ' ').trim()}`);
        if (items.length) blocks.push(items.join('\n'));
      } else if (tag === 'FIGURE' || tag === 'IMG') {
        const img = tag === 'IMG' ? n : n.querySelector('img');
        const cap = n.querySelector?.('figcaption')?.textContent || img?.alt || '';
        if (img) blocks.push(`![${cap.trim()}](${img.getAttribute('src')})`);
      } else if (tag === 'DIV' && n.querySelector(':scope > p, :scope > div, :scope > h2, :scope > ul, :scope > ol, :scope > figure')) walk(n);
      else if (tag === 'BR') blocks.push('');
      else {
        const t = inl(n).replace(/\n{3,}/g, '\n\n').trim();
        if (t) blocks.push(...t.split(/\n(?=!\[)|(?<=\))\n/).map((x) => x.trim()).filter(Boolean));
      }
    }
  };
  walk(root);
  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').replace(/∗/g, '*').trim();
}
