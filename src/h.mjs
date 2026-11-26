// 模板小工具。内容里的三语文字在加载时被合成 { ms, en, zh }(见 scripts/build.mjs 的 merge)。
// 文字值按 HTML 片段处理(和 script.js 的 setLang 写 innerHTML 一致),只在属性里转义。

export const LANGS = ['ms', 'en', 'zh'];

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const isL = (x) => x !== null && typeof x === 'object' && !Array.isArray(x) && 'ms' in x && 'en' in x && 'zh' in x && typeof x.ms === 'string';

/**
 * 正在构建的语言。每页按语言各构建一份(scripts/build.mjs 先 setLang 再渲染):
 *   en → 根目录 /…(主语言,x-default);ms → /ms/…;zh → /zh/…
 */
let CUR = 'en';
export const setLang = (l) => { CUR = l; };
export const lang = () => CUR;
export const PREFIX = { en: '', ms: '/ms', zh: '/zh' };
/** 站内页面网址加上当前语言的前缀:'/about' → '/ms/about';'/' → '/ms/';锚点、外链、/images/ 等资源原样 */
export const P = (href, l = CUR) => {
  const u = String(href ?? '');
  if (!/^\/(?:$|#|about\b|gallery\b|views\/)/.test(u)) return u;
  return PREFIX[l] + (u === '/' && PREFIX[l] ? '/' : u);
};

/** 取值:三语文字取当前语言,其余原样 */
export const v = (x) => (isL(x) ? x[CUR] : x);

/**
 * 元素的「属性 + 内容」:`<h2${T(x)}</h2>` →
 *   三种语言不同:` data-ms="…" data-en="…" data-zh="…">当前语言的文字`
 *   三种语言相同:`>文字`(不用切换)
 */
export const T = (x) => {
  if (!isL(x)) return `>${x ?? ''}`;
  if (x.en === x.ms && x.zh === x.ms) return `>${x.ms}`;
  return ` data-ms="${esc(x.ms)}" data-en="${esc(x.en)}" data-zh="${esc(x.zh)}">${x[CUR]}`;
};

/** 外链带 target=_blank;站内锚点 / 页面不带 */
export const link = (url) => {
  const u = v(url);
  return /^https?:/.test(u) ? `href="${esc(u)}" target="_blank" rel="noopener"` : `href="${esc(P(u))}"`;
};

export const ARROW = '<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** YYYY-MM-DD → DD.MM.YYYY;YYYY-MM → MM.YYYY;别的原样 */
export const dmy = (d) => {
  const s = v(d);
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[3]}.${m[2]}.${m[1]}`;
  m = /^(\d{4})-(\d{2})$/.exec(s);
  if (m) return `${m[2]}.${m[1]}`;
  return s;
};

/** 作者写的轻量格式(和 WhatsApp 一样):*粗体* → <strong>,换行 → <br>。用在观点等作者自己写的长文字上 */
const richOne = (s) => String(s ?? '').replace(/\*([^*\n]+?)\*/g, '<strong>$1</strong>').replace(/\r?\n/g, '<br>');
export const rich = (x) => (isL(x) ? Object.fromEntries(LANGS.map((l) => [l, richOne(x[l])])) : richOne(x));

export const join = (arr, f) => (arr || []).map(f).join('\n');
