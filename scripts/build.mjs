#!/usr/bin/env node
/**
 * 构建(零依赖):content/*.json + src/ 模板 → _site/(GitHub Pages 由 .github/workflows/deploy.yml 发布这个目录)
 *
 *   node scripts/build.mjs            # 构建一次;内容有问题(缺翻译、马来文 / 英文里有中文…)就列出来并退出 1
 *   node scripts/build.mjs --watch    # 预览用:content/、src/ 或静态文件一改就重建
 *
 * 内容文件是 Sveltia CMS 的 i18n single_file 格式:{ "ms": {...}, "en": {...}, "zh": {...} }。
 * 加载时把三份合成一棵树:文字叶子变成 { ms, en, zh },别的(数字、数组、布尔)取一份。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mdImages } from '../src/md.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const LANGS = ['ms', 'en', 'zh'];
const CJK = /[㐀-鿿豈-﫿　-〿＀-￯]/;

/** 原样拷进 _site 的文件 / 目录 */
const STATIC = ['styles.css', 'script.js', 'gallery.js', 'projects.js', 'listings.js', 'favicon.svg', 'favicon-32.png',
  'apple-touch-icon.png', 'robots.txt', 'sitemap.xml', 'llms.txt', 'CNAME', 'images', 'admin', 'edit'];

// ---------------------------------------------------------------- 内容加载与检查

/** 不当作「要翻译的文字」的键:网址、图片路径、中文名、选项值 */
const NOT_TEXT = /(^|_)(url|src|href|image|key|cat|cta|tone|art|style|anchor|date|order|id)$|_zh$/;

export function loadContent(root = ROOT) {
  const problems = [];
  const C = path.join(root, 'content');

  const merge = (byLang, where, key = '') => {
    const vals = LANGS.map((l) => byLang[l]);
    const first = vals.find((x) => x !== undefined && x !== null);
    if (first === undefined) return undefined;
    if (typeof first === 'string') {
      const o = {};
      for (const l of LANGS) {
        const x = byLang[l];
        o[l] = typeof x === 'string' ? x : '';
      }
      const filled = LANGS.filter((l) => o[l].trim());
      if (filled.length && filled.length < 3 && !NOT_TEXT.test(key)) {
        for (const l of LANGS) if (!o[l].trim()) problems.push(`${where}:${LANG_NAME[l]}没填(其他语言有)`);
      }
      for (const l of LANGS) if (!o[l].trim()) o[l] = o.ms.trim() ? o.ms : o.en.trim() ? o.en : o.zh;
      if (!NOT_TEXT.test(key)) {
        if (!/\.seo\./.test(where)) for (const l of ['ms', 'en']) if (CJK.test(stripZhName(o[l]))) problems.push(`${where}:${LANG_NAME[l]}里有中文「${o[l].slice(0, 40)}」`);
        if (/[一-鿿][,;:!?]/.test(o.zh)) problems.push(`${where}:中文要用全角标点(,;:!?)「${o.zh.slice(0, 40)}」`);
      }
      return o;
    }
    if (Array.isArray(first)) {
      if (first.length && typeof first[0] !== 'object') return first; // 字符串数组(如 src_lang):取一份
      const lens = LANGS.map((l) => (Array.isArray(byLang[l]) ? byLang[l].length : null)).filter((n) => n !== null);
      if (new Set(lens).size > 1) problems.push(`${where}:各语言的条数不一样(${lens.join(' / ')})`);
      return first.map((_, i) => merge(Object.fromEntries(LANGS.map((l) => [l, byLang[l]?.[i]])), `${where}[${i + 1}]`, key));
    }
    if (typeof first === 'object') {
      const keys = new Set(LANGS.flatMap((l) => (byLang[l] && typeof byLang[l] === 'object' ? Object.keys(byLang[l]) : [])));
      const o = {};
      for (const k of keys) {
        const m = merge(Object.fromEntries(LANGS.map((l) => [l, byLang[l]?.[k]])), where ? `${where}.${k}` : k, k);
        if (m !== undefined) o[k] = m;
      }
      return o;
    }
    return first;
  };

  const load = (rel) => {
    const file = path.join(C, rel);
    let json;
    try { json = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { problems.push(`content/${rel}:读不了(${e.message})`); return null; }
    if (!LANGS.some((l) => json[l])) { problems.push(`content/${rel}:没有 ms / en / zh 三段`); return null; }
    const m = merge(json, `content/${rel}`);
    m._file = rel;
    return m;
  };
  const folder = (dir) => (fs.existsSync(path.join(C, dir)) ? fs.readdirSync(path.join(C, dir)).filter((f) => f.endsWith('.json')).sort().map((f) => load(`${dir}/${f}`)).filter(Boolean) : []);
  const s = (x) => (x && typeof x === 'object' && 'ms' in x ? x.ms : x) ?? '';

  // 观点、新闻:日期新到旧,同一天按文件名
  const byDate = (a, b) => s(b.date).localeCompare(s(a.date)) || a._file.localeCompare(b._file);
  const content = {
    site: load('site.json'),
    home: load('home.json'),
    about: load('about.json'),
    galleryPage: load('gallery-page.json'),
    views: folder('views').filter((x) => !x.hidden).sort(byDate),
    news: folder('news').filter((x) => !x.hidden).sort(byDate),
    albums: folder('gallery').filter((x) => !x.hidden),
  };
  // 相册:先按分类(页面上分类的顺序),同类按「排序」小的在前
  const catOrder = (content.galleryPage?.cats || []).map((c) => s(c.key));
  content.albums.sort((a, b) => catOrder.indexOf(s(a.cat)) - catOrder.indexOf(s(b.cat)) || (a.order ?? 999) - (b.order ?? 999) || a._file.localeCompare(b._file));

  // 结构检查:必须有的
  for (const n of content.news) {
    if (!n.src_lang?.length) problems.push(`content/${n._file}:没选「报道原文语言」`);
    if (!s(n.url)) problems.push(`content/${n._file}:没有链接`);
  }
  for (const a of content.albums) if (!a.photos?.length) problems.push(`content/gallery/${a._file}:相册里没有照片`);
  const viewCats = new Set((content.home?.views?.cats || []).map((c) => s(c.key)));
  // 网址名 = 文件名去掉日期:两篇撞名会互相覆盖
  const seenSlug = new Map();
  for (const x of content.views) {
    const sl = x._file.replace(/^.*\//, '').replace(/\.json$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(sl)) problems.push(`content/${x._file}:网址名「${sl}」只能用小写字母、数字和 -`);
    if (seenSlug.has(sl)) problems.push(`content/${x._file}:网址 /views/${sl} 和 ${seenSlug.get(sl)} 重复`);
    seenSlug.set(sl, x._file);
  }
  for (const x of content.views) if (!viewCats.has(s(x.cat))) problems.push(`content/${x._file}:分类「${s(x.cat)}」不在观点分类里`);
  // 观点正文里插的图片要在仓库里
  for (const x of content.views) for (const l of LANGS) for (const src of mdImages(x.body?.[l])) {
    if (!/^https?:/.test(src) && !fs.existsSync(path.join(root, src.replace(/^\//, '')))) problems.push(`content/${x._file}:正文里的图片 ${src} 找不到`);
  }
  return { content, problems };
}

const LANG_NAME = { ms: '马来文', en: '英文', zh: '中文' };
/** 中文名放在 .brand-zh / .name-zh 里(非中文版用 CSS 藏起来),查中文时先剥掉 */
const stripZhName = (s) => s.replace(/<(\w+)[^>]*class\s*=\s*["'][^"']*\b(?:brand|name)-zh\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/g, '');

// ---------------------------------------------------------------- 图片尺寸(零依赖读文件头)

export function imageSize(file) {
  let b;
  try { b = fs.readFileSync(file); } catch { return null; }
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  }
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const t = b.toString('ascii', 12, 16);
    if (t === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (t === 'VP8L') { const n = b.readUInt32LE(21); return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 }; }
    if (t === 'VP8X') return { w: (b.readUIntLE(24, 3)) + 1, h: (b.readUIntLE(27, 3)) + 1 };
  }
  if (b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  const txt = b.toString('utf8', 0, 2000);
  if (/<svg/i.test(txt)) {
    const w = /\swidth="([\d.]+)"/.exec(txt), h = /\sheight="([\d.]+)"/.exec(txt);
    if (w && h) return { w: Math.round(+w[1]), h: Math.round(+h[1]) };
    const vb = /viewBox="[\d.\s-]*?\s([\d.]+)\s+([\d.]+)"/.exec(txt);
    if (vb) return { w: Math.round(+vb[1]), h: Math.round(+vb[2]) };
  }
  return null;
}

/** 给内容里所有 { src } 图片对象补上 w / h(本地文件才补) */
function annotateImages(node, root, problems, where = '') {
  if (Array.isArray(node)) return node.forEach((x, i) => annotateImages(x, root, problems, `${where}[${i + 1}]`));
  if (!node || typeof node !== 'object' || 'ms' in node) return;
  const src = node.src && (typeof node.src === 'object' ? node.src.ms : node.src);
  if (typeof src === 'string' && src && !/^https?:/.test(src)) {
    const sz = imageSize(path.join(root, src.replace(/^\//, '')));
    if (sz) Object.assign(node, sz); else problems.push(`${where}:图片 ${src} 找不到或读不了`);
  }
  for (const [k, x] of Object.entries(node)) if (k !== '_file') annotateImages(x, root, problems, where ? `${where}.${k}` : k);
}

// ---------------------------------------------------------------- 缩略图

const THUMB = 640;
const thumbOf = (src) => src.replace(/(\.[a-z]+)$/i, '-t.jpg');
let thumbTool;
function makeThumb(from, to) {
  if (thumbTool === undefined) {
    thumbTool = null;
    for (const t of ['sips', 'magick', 'convert']) { try { execFileSync('which', [t], { stdio: 'ignore' }); thumbTool = t; break; } catch {} }
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (thumbTool === 'sips') execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '80', '-Z', String(THUMB), from, '--out', to], { stdio: 'ignore' });
  else if (thumbTool) execFileSync(thumbTool, [from, '-resize', `${THUMB}x${THUMB}>`, '-quality', '80', to], { stdio: 'ignore' });
  else { fs.copyFileSync(from, to); return false; }
  return true;
}

// ---------------------------------------------------------------- 构建

export async function build({ root = ROOT, out = OUT, quiet = false } = {}) {
  const t0 = Date.now();
  const { content, problems } = loadContent(root);
  if (problems.length && Object.values(content).some((x) => x === null)) return { problems };
  annotateImages(content, root, problems);

  // 模板每次重新载入(watch 时改模板马上生效)
  const bust = `?t=${Date.now()}`;
  const imp = async (rel) => (await import(pathToFileURL(path.join(root, rel)).href + bust)).default;
  const art = (name) => {
    const f = path.join(root, 'src', 'art', `${name}.svg`);
    if (!fs.existsSync(f)) { problems.push(`观点插画「${name}」不存在(src/art/)`); return ''; }
    return fs.readFileSync(f, 'utf8').trim();
  };

  // 只清空里面,不删目录本身:预览服务器的工作目录就是它
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(out)) fs.rmSync(path.join(out, f), { recursive: true, force: true });
  for (const f of STATIC) {
    const from = path.join(root, f);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(out, f), { recursive: true });
  }

  const renderIndex = await imp('src/pages/index.mjs');
  const renderAbout = await imp('src/pages/about.mjs');
  const renderGallery = await imp('src/pages/gallery.mjs');
  fs.writeFileSync(path.join(out, 'index.html'), renderIndex({ ...content, art }));
  fs.writeFileSync(path.join(out, 'about.html'), renderAbout(content));
  fs.writeFileSync(path.join(out, 'gallery.html'), renderGallery(content));

  // 观点文章页 /views/<网址名>(文件 views/<网址名>.html)+ sitemap
  const renderView = await imp('src/pages/view.mjs');
  const { viewSlug } = await import(pathToFileURL(path.join(root, 'src/pages/view.mjs')).href + bust);
  fs.mkdirSync(path.join(out, 'views'), { recursive: true });
  for (const it of content.views) fs.writeFileSync(path.join(out, 'views', `${viewSlug(it)}.html`), renderView({ ...content, it, art }));
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').replace('</urlset>',
    content.views.map((it) => `  <url><loc>https://alwinlim.com/views/${viewSlug(it)}</loc><lastmod>${(it.date?.ms || '').slice(0, 10)}</lastmod></url>\n`).join('') + '</urlset>');
  fs.writeFileSync(path.join(out, 'sitemap.xml'), sm);
  // 旧网址 → 新网址的跳转页(redirects.json)
  const redirects = JSON.parse(fs.readFileSync(path.join(root, 'redirects.json'), 'utf8'));
  for (const [from, to] of Object.entries(redirects)) {
    if (from.startsWith('_')) continue;
    const file = path.join(out, `${from}.html`);
    if (fs.existsSync(file)) throw new Error(`redirects.json:旧网址 /${from} 和现有页面撞了`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const abs = `https://alwinlim.com${to}`;
    fs.writeFileSync(file, `<!doctype html>\n<html lang="ms">\n<head>\n  <meta charset="utf-8">\n  <title>Alwin Lim</title>\n  <meta name="robots" content="noindex">\n  <link rel="canonical" href="${abs}">\n  <meta http-equiv="refresh" content="0; url=${to}">\n  <script>location.replace(${JSON.stringify(to)} + location.search + location.hash)</script>\n</head>\n<body><p><a href="${to}">${abs}</a></p></body>\n</html>\n`);
  }
  // 简易后台用同一份正文格式转换(src/md.mjs → window.MD)
  const mdSrc = fs.readFileSync(path.join(root, 'src/md.mjs'), 'utf8');
  const mdNames = [...mdSrc.matchAll(/^export (?:const|function) (\w+)/gm)].map((m) => m[1]);
  fs.writeFileSync(path.join(out, 'edit', 'md.js'), `// 由 scripts/build.mjs 从 src/md.mjs 生成,不要手改\n(() => {\n${mdSrc.replace(/^export /gm, '')}\nwindow.MD = { ${mdNames.join(', ')} };\n})();\n`);

  // 相册数据 + 缩略图
  const s = (x) => (x && typeof x === 'object' && 'ms' in x ? x.ms : x) ?? '';
  const L3 = (x) => (x && typeof x === 'object' && 'ms' in x ? { ms: x.ms, en: x.en, zh: x.zh } : null);
  let made = 0;
  const albums = content.albums.map((a) => ({
    id: s(a.id) || a._file.replace(/\.json$/, ''),
    cat: s(a.cat), date: s(a.date), t: L3(a.title), p: L3(a.place), src: s(a.url) || undefined,
    photos: (a.photos || []).filter((p) => s(p.image)).map((p) => {
      const src = s(p.image).replace(/^\//, '');
      const sz = imageSize(path.join(root, src)) || { w: 1200, h: 900 };
      let thumb = thumbOf(src);
      if (!fs.existsSync(path.join(root, thumb))) {
        try { makeThumb(path.join(root, src), path.join(out, thumb)); made++; } catch { thumb = src; }
      }
      return [sz.w, sz.h, v3(p.caption), src, thumb];
    }),
  }));
  function v3(c) { const x = L3(c); return x && (x.ms || x.en || x.zh) ? x : null; }
  const cats = Object.fromEntries((content.galleryPage?.cats || []).map((c) => [s(c.key), L3(c.label)]));
  fs.writeFileSync(path.join(out, 'gallery-data.js'),
    `// 由 scripts/build.mjs 从 content/gallery/*.json 生成,不要手改\nwindow.GALLERY = ${JSON.stringify({ cats, albums })};\n`);

  // 简易后台 /edit 读的内容快照(仓库本来就公开)
  const rawDir = (d) => fs.readdirSync(path.join(root, 'content', d)).filter((f) => f.endsWith('.json')).sort()
    .map((f) => ({ file: `content/${d}/${f}`, data: JSON.parse(fs.readFileSync(path.join(root, 'content', d, f), 'utf8')) }));
  const rawFile = (f) => ({ file: `content/${f}`, data: JSON.parse(fs.readFileSync(path.join(root, 'content', f), 'utf8')) });
  fs.mkdirSync(path.join(out, 'edit'), { recursive: true });
  fs.writeFileSync(path.join(out, 'edit', 'content.json'), JSON.stringify({
    news: rawDir('news'), views: rawDir('views'), gallery: rawDir('gallery'),
    art: Object.fromEntries(fs.readdirSync(path.join(root, 'src/art')).filter((f) => f.endsWith('.svg')).map((f) => [f.slice(0, -4), fs.readFileSync(path.join(root, 'src/art', f), 'utf8').trim()])),
    home: rawFile('home.json'), about: rawFile('about.json'), site: rawFile('site.json'), galleryPage: rawFile('gallery-page.json'),
  }));

  if (!quiet) console.log(`✓ 构建完成 → _site/(${Date.now() - t0} ms${made ? `,生成 ${made} 张缩略图` : ''})`);
  return { problems };
}

// ---------------------------------------------------------------- 命令行

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = (problems) => {
    if (!problems.length) return true;
    console.error(problems.map((p) => `  ✗ ${p}`).join('\n'));
    console.error(`\n✗ 内容有 ${problems.length} 处问题`);
    return false;
  };
  const { problems } = await build();
  const ok = report(problems);
  if (process.argv.includes('--watch')) {
    let timer = null;
    const again = () => { clearTimeout(timer); timer = setTimeout(async () => { try { report((await build()).problems); } catch (e) { console.error(e); } }, 150); };
    for (const d of ['content', 'src', ...STATIC]) {
      const p = path.join(ROOT, d);
      if (fs.existsSync(p)) fs.watch(p, { recursive: true }, again);
    }
    console.log('… 监视 content/ src/ 与静态文件,改动后自动重建');
  } else if (!ok) process.exit(1);
}
