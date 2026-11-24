// 简易后台 /edit 的服务端(Cloudflare Worker「alwin-edit」)
// 登录(账号密码,KV 存 PBKDF2 哈希)、翻译(Gemini)、读报道链接、上传照片、发布(一次提交写进 GitHub main)、查上线进度。
// 密钥都在 Worker secrets:GITHUB_TOKEN(细粒度 PAT,只有 edent95/Alwin 的 Contents 读写 + Actions 读)、GEMINI_KEY、SESSION_SECRET。

const REPO = 'edent95/Alwin';
const BRANCH = 'main';
const ALLOWED_ORIGINS = ['https://alwinlim.com', 'https://www.alwinlim.com'];
const LOCAL_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/;
const SESSION_DAYS = 60;
const PBKDF2_ITER = 100000;
const CJK = /[㐀-鿿豈-﫿]/;

// ------------------------------------------------------------------ 小工具
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const b64 = (bytes) => { let s = ''; const u = new Uint8Array(bytes); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const rand = (n = 24) => b64u(crypto.getRandomValues(new Uint8Array(n)));
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}
async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return b64u(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64u(salt), iterations: PBKDF2_ITER }, key, 256));
}
const safeEq = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

async function makeSession(env, username) {
  const body = b64u(enc.encode(JSON.stringify({ u: username, exp: Date.now() + SESSION_DAYS * 864e5 })));
  return `${body}.${await hmac(env.SESSION_SECRET, body)}`;
}
async function readSession(env, req) {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  const [body, sig] = tok.split('.');
  if (!body || !sig || !safeEq(sig, await hmac(env.SESSION_SECRET, body))) throw new HttpError(401, '请重新登录');
  const { u, exp } = JSON.parse(new TextDecoder().decode(fromB64u(body)));
  if (exp < Date.now()) throw new HttpError(401, '登录过期了，请重新登录');
  const user = await env.KV.get(`user:${u}`, 'json');
  if (!user || user.disabled) throw new HttpError(401, '这个帐号不能用了，请找 Eden');
  return { username: u, ...user };
}
const publicUser = (u) => ({ username: u.username, name: u.name, role: u.role || 'editor' });

// ------------------------------------------------------------------ GitHub
async function gh(env, path, init = {}) {
  const r = await fetch(`https://api.github.com${path.startsWith('/repos') ? path : `/repos/${REPO}${path}`}`, {
    ...init,
    headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28',
      'user-agent': 'alwin-edit', ...(init.body ? { 'content-type': 'application/json' } : {}) },
  });
  if (!r.ok) {
    const t = await r.text();
    console.log('github error', path, r.status, t.slice(0, 300));
    throw new HttpError(r.status === 409 || r.status === 422 ? 409 : 502, `GitHub ${r.status}`);
  }
  return r.status === 204 ? null : r.json();
}

// 只允许写这些位置
const PATH_OK = [
  /^content\/(news|views|gallery)\/[a-z0-9][a-z0-9-]{0,80}\.json$/,
  /^content\/(home|about|site|gallery-page)\.json$/,
  /^images\/uploads\/(news|views|gallery)\/[a-z0-9][a-z0-9._-]{0,100}\.(jpg|jpeg|png|webp)$/,
];
function checkContent(path, data) {
  if (!data || typeof data !== 'object' || !['ms', 'en', 'zh'].every((l) => data[l] && typeof data[l] === 'object')) throw new HttpError(400, `${path}:内容格式不对`);
  const bad = [];
  const walk = (node, trail) => {
    if (typeof node === 'string') { if (CJK.test(node) && !/(^|\.)(seo|url|src|href|image|name_zh)(\.|$)/.test(trail)) bad.push(trail); return; }
    if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) walk(v, `${trail}.${k}`);
  };
  walk(data.ms, 'ms'); walk(data.en, 'en');
  if (bad.length) throw new HttpError(400, `英文 / 马来文里还有中文：${bad.slice(0, 3).join('、')}`);
}

async function publish(env, user, { files, message }) {
  if (!Array.isArray(files) || !files.length || files.length > 80) throw new HttpError(400, '没有要发布的内容');
  const tree = files.map((f) => {
    if (!PATH_OK.some((re) => re.test(f.path))) throw new HttpError(400, `不能写这个位置：${f.path}`);
    if (f.json !== undefined) {
      if (!f.path.startsWith('content/')) throw new HttpError(400, '内容只能写进 content/');
      checkContent(f.path, f.json);
      return { path: f.path, mode: '100644', type: 'blob', content: `${JSON.stringify(f.json, null, 2)}\n` };
    }
    if (typeof f.sha === 'string' && /^[0-9a-f]{40}$/.test(f.sha) && f.path.startsWith('images/uploads/')) return { path: f.path, mode: '100644', type: 'blob', sha: f.sha };
    throw new HttpError(400, `文件不完整：${f.path}`);
  });
  const msg = `${String(message || 'content: 简易后台更新').slice(0, 200)}\n\n由 ${user.name}(${user.username})在 /edit 发布`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await gh(env, `/git/ref/heads/${BRANCH}`);
    const head = await gh(env, `/git/commits/${ref.object.sha}`);
    const t = await gh(env, '/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: head.tree.sha, tree }) });
    const c = await gh(env, '/git/commits', { method: 'POST', body: JSON.stringify({ message: msg, tree: t.sha, parents: [ref.object.sha],
      author: { name: user.name, email: `${user.username}@edit.alwinlim.com` } }) });
    try {
      await gh(env, `/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
      return { commit: c.sha };
    } catch (e) { if (e.status !== 409) throw e; } // main 刚好被别人推进了：重来
  }
  throw new HttpError(409, '网站刚好在更新，请再按一次发布');
}

async function status(env, commit) {
  if (!/^[0-9a-f]{40}$/.test(commit || '')) throw new HttpError(400, 'commit?');
  const r = await gh(env, `/actions/runs?head_sha=${commit}&per_page=10`);
  const run = r.workflow_runs.find((x) => x.path?.endsWith('deploy.yml') || x.name === 'Deploy');
  if (!run) return { state: 'building' };
  if (run.status !== 'completed') return { state: 'building' };
  return { state: run.conclusion === 'success' ? 'live' : 'failed', url: run.html_url };
}

// ------------------------------------------------------------------ 翻译
const LANG = { zh: 'Simplified Chinese (Malaysian usage)', en: 'English', ms: 'Bahasa Melayu (Malaysia)' };
const GLOSSARY = `Fixed names (use exactly):
- 林智成 = Alwin Lim (in English / Malay never write the Chinese name)
- 行动党 / 民主行动党 = DAP; 社青团 = DAPSY (Sosialis Muda DAP); 升旗山 = Bukit Bendera; 亚依淡 = Air Itam; 槟城 = Penang (EN) / Pulau Pinang (MS)
- 升旗山社青团 = DAPSY Bukit Bendera; 团长 = Chief (EN) / Ketua (MS)
- 首长 = Chief Minister (EN) / Ketua Menteri (MS); 州议员 = State Assemblyman (EN) / ADUN (MS)
- 中小企业 = SMEs (EN) / PKS (MS); 最低薪金 = minimum wage (EN) / gaji minimum (MS)
- 东方日报 = Oriental Daily; 中国报 = China Press; 星洲日报 = Sin Chew Daily; 光华日报 = Kwong Wah Yit Poh`;
async function translate(env, { fields, from, to }) {
  if (!fields || typeof fields !== 'object' || !LANG[from] || !Array.isArray(to) || !to.every((l) => LANG[l])) throw new HttpError(400, '翻译参数不对');
  const keys = Object.keys(fields).filter((k) => String(fields[k] || '').trim());
  const out = Object.fromEntries(to.map((l) => [l, Object.fromEntries(Object.keys(fields).map((k) => [k, '']))]));
  if (!keys.length) return out;
  if (JSON.stringify(fields).length > 20000) throw new HttpError(400, '一次要翻译的字太多了');
  const src = Object.fromEntries(keys.map((k) => [k, String(fields[k])]));
  const prompt = `You translate short texts for the personal website of Alwin Lim, a young Malaysian politician (DAPSY Bukit Bendera, Penang) and property agent.
Translate every value of the JSON object below from ${LANG[from]} into: ${to.map((l) => `${l} = ${LANG[l]}`).join('; ')}.
Rules:
- Keep the meaning, tone and length; this is public political communication in his name. Do not add or soften claims.
- Natural, plain wording a Malaysian reader would use. Keep numbers, dates, RM amounts, URLs, names of people and organisations.
- English and Malay output must contain NO Chinese characters at all.
- Chinese output uses full-width punctuation (，。：；！？「」).
- Keep line breaks (\\n) and blank lines exactly.
${GLOSSARY}
Return JSON: { ${to.map((l) => `"${l}": { same keys }`).join(', ')} }.
Input:
${JSON.stringify(src, null, 1)}`;
  const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }),
  });
  if (!r.ok) { console.log('gemini', r.status, (await r.text()).slice(0, 300)); throw new HttpError(502, r.status === 429 ? '翻译服务太忙，请过一分钟再试' : '翻译服务出错了，请再试一次'); }
  const j = await r.json();
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  let got;
  try { got = JSON.parse(text.replace(/^```(json)?|```$/g, '').trim()); } catch { throw new HttpError(502, '翻译结果读不懂，请再试一次'); }
  for (const l of to) for (const k of keys) out[l][k] = String(got?.[l]?.[k] ?? '').trim();
  return out;
}

// ------------------------------------------------------------------ 读报道链接
const MEDIA = { 'chinapress.com.my': '中国报', 'orientaldaily.com.my': '东方日报', 'sinchew.com.my': '星洲日报', 'kwongwah.com.my': '光华日报',
  'guangming.com.my': '光明日报', 'enanyang.my': '南洋商报', 'thestar.com.my': 'The Star', 'malaymail.com': 'Malay Mail', 'nst.com.my': 'New Straits Times',
  'freemalaysiatoday.com': 'Free Malaysia Today', 'bharian.com.my': 'Berita Harian', 'hmetro.com.my': 'Harian Metro', 'sinarharian.com.my': 'Sinar Harian',
  'buletinmutiara.com': 'Buletin Mutiara', 'facebook.com': 'Facebook', 'instagram.com': 'Instagram' };
const unent = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
async function readLink(url) {
  let u; try { u = new URL(url); } catch { throw new HttpError(400, '这个链接打不开，请检查一下'); }
  if (!/^https?:$/.test(u.protocol)) throw new HttpError(400, '这个链接打不开，请检查一下');
  const host = u.hostname.replace(/^(www|m|penang|northern)\./, '');
  const source = Object.entries(MEDIA).find(([d]) => host.endsWith(d))?.[1] || '';
  let html = '';
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; alwinlim.com link preview)', accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (r.ok) html = (await r.text()).slice(0, 400000);
  } catch { /* 读不到就只回媒体名 */ }
  const meta = (name) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*>`, 'i');
    const tag = html.match(re)?.[0];
    return tag ? unent(tag.match(/content=["']([^"']*)["']/i)?.[1] || '').trim() : '';
  };
  let title = meta('og:title') || unent(html.match(/<title[^>]*>([^<]*)/i)?.[1] || '').trim();
  title = title.replace(/\s*[|\-–—_]\s*(中国报|東方日報|东方日报|星洲日报|光华日报|The Star|Malay Mail|Berita Harian|Facebook)[^|]*$/i, '').trim();
  // Facebook 对程序只给登录页：帖子网址里的 slug 往往就是标题
  if ((!title || /log in|facebook$/i.test(title)) && host.endsWith('facebook.com')) {
    const seg = decodeURIComponent(u.pathname).split('/').find((s) => s.length > 12 && !/^\d+$/.test(s) && s !== 'posts');
    title = seg ? seg.replace(/[-_]+/g, ' ').trim() : '';
  }
  const published = meta('article:published_time') || meta('og:published_time') || meta('pubdate') || '';
  const dateFromUrl = u.pathname.match(/(20\d\d)[/-]?(\d\d)[/-]?(\d\d)/);
  const date = /^\d{4}-\d\d-\d\d/.test(published) ? published.slice(0, 10) : dateFromUrl ? `${dateFromUrl[1]}-${dateFromUrl[2]}-${dateFromUrl[3]}` : '';
  const sample = `${title} ${meta('og:description')}`;
  const lang = CJK.test(sample) ? 'zh' : /\b(dan|yang|untuk|kepada|dengan|tidak)\b/i.test(sample) ? 'ms' : sample.trim() ? 'en' : '';
  let image = meta('og:image') || meta('twitter:image');
  if (image) try { image = new URL(image, u).href; } catch { image = ''; }
  return { title, source: source || meta('og:site_name') || host, date, lang, image: host.endsWith('facebook.com') ? '' : image };
}
async function proxyImage(url) {
  let u; try { u = new URL(url); } catch { throw new HttpError(400, 'url?'); }
  if (!/^https?:$/.test(u.protocol)) throw new HttpError(400, 'url?');
  const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; alwinlim.com link preview)' }, signal: AbortSignal.timeout(8000) });
  const type = r.headers.get('content-type') || '';
  if (!r.ok || !type.startsWith('image/')) throw new HttpError(404, '这张照片拿不到');
  const buf = await r.arrayBuffer();
  if (buf.byteLength > 8e6) throw new HttpError(413, '照片太大');
  return new Response(buf, { headers: { 'content-type': type } });
}

// ------------------------------------------------------------------ 路由
async function route(req, env) {
  const url = new URL(req.url);
  const p = url.pathname;
  const body = async () => { try { return await req.json(); } catch { throw new HttpError(400, '格式不对'); } };

  if (p === '/api/login' && req.method === 'POST') {
    const { username, password } = await body();
    const name = String(username || '').trim().toLowerCase();
    const failKey = `fail:${name}`;
    const fails = +(await env.KV.get(failKey)) || 0;
    if (fails >= 8) throw new HttpError(429, '密码错太多次了，请 15 分钟后再试');
    const user = await env.KV.get(`user:${name}`, 'json');
    if (!user || user.disabled || !safeEq(await hashPassword(String(password || ''), user.salt), user.hash)) {
      await env.KV.put(failKey, String(fails + 1), { expirationTtl: 900 });
      throw new HttpError(401, '用户名或密码不对');
    }
    await env.KV.delete(failKey);
    return { token: await makeSession(env, name), me: publicUser({ username: name, ...user }) };
  }
  const inv = p.match(/^\/api\/invite\/([\w-]{20,})$/);
  if (inv) {
    const data = await env.KV.get(`invite:${inv[1]}`, 'json');
    if (!data) throw new HttpError(404, '这个链接已经用过或过期了，请找 Eden 要一个新的');
    if (req.method === 'GET') return { username: data.username, name: data.name };
    if (req.method === 'POST') {
      const { password } = await body();
      if (String(password || '').length < 8) throw new HttpError(400, '密码至少 8 个字');
      const old = await env.KV.get(`user:${data.username}`, 'json');
      const salt = rand(16);
      const user = { ...(old || {}), name: data.name, role: data.role || old?.role || 'editor', salt, hash: await hashPassword(password, salt), disabled: false, since: old?.since || new Date().toISOString() };
      await env.KV.put(`user:${data.username}`, JSON.stringify(user));
      await env.KV.delete(`invite:${inv[1]}`);
      return { token: await makeSession(env, data.username), me: publicUser({ username: data.username, ...user }) };
    }
  }

  const user = await readSession(env, req);
  if (p === '/api/me') return publicUser(user);
  if (p === '/api/translate' && req.method === 'POST') return translate(env, await body());
  if (p === '/api/read-link' && req.method === 'POST') return readLink((await body()).url);
  if (p === '/api/image' && req.method === 'GET') return proxyImage(url.searchParams.get('url'));
  if (p === '/api/blob' && req.method === 'POST') {
    const type = req.headers.get('content-type') || '';
    if (!/^image\/(jpeg|png|webp)$/.test(type)) throw new HttpError(400, '只收照片');
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 6e6) throw new HttpError(413, '照片太大');
    const r = await gh(env, '/git/blobs', { method: 'POST', body: JSON.stringify({ content: b64(buf), encoding: 'base64' }) });
    return { sha: r.sha };
  }
  if (p === '/api/publish' && req.method === 'POST') return publish(env, user, await body());
  if (p === '/api/status') return status(env, url.searchParams.get('commit'));
  if (p === '/api/health' && user.role === 'admin') {
    const models = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': env.GEMINI_KEY || '' } }).then((r) => r.json()).catch((e) => ({ error: e.message }));
    const repo = await gh(env, '').catch((e) => ({ error: e.message }));
    return { gemini: models.models?.map((m) => m.name).filter((n) => /flash/.test(n)) ?? models, model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite', repo: repo.full_name || repo, push: repo.permissions?.push };
  }
  throw new HttpError(404, 'not found');
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const okOrigin = ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin);
    const cors = okOrigin ? { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST', 'access-control-max-age': '86400', vary: 'origin' } : {};
    if (req.method === 'OPTIONS') return new Response(null, { status: okOrigin ? 204 : 403, headers: cors });
    if (origin && !okOrigin) return new Response('forbidden', { status: 403 });
    try {
      const r = await route(req, env);
      if (r instanceof Response) { for (const [k, v] of Object.entries(cors)) r.headers.set(k, v); return r; }
      return Response.json(r, { headers: { ...cors, 'cache-control': 'no-store' } });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.log('error', e.stack || e.message);
      return Response.json({ error: status === 500 ? '出了点问题，请再试一次' : e.message }, { status, headers: cors });
    }
  },
};
