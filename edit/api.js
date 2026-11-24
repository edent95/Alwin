// 简易后台的接口层(真的):登录、翻译、读链接、上传照片、发布都走 Worker alwin-edit(源码 edit-worker/)。
// 示意版在 api-demo.js(网址加 ?demo)。两份对外的函数一样,app.js 不用分。
(() => {
  const BASE = 'https://alwin-edit.d-tytern.workers.dev';
  const TOKEN = 'edit-token';
  const ME = 'edit-me';
  let snapshot = null;

  async function call(path, { method = 'GET', json, body, headers = {}, raw = false } = {}) {
    let r;
    try {
      r = await fetch(BASE + path, {
        method,
        headers: { ...(localStorage.getItem(TOKEN) ? { authorization: `Bearer ${localStorage.getItem(TOKEN)}` } : {}), ...(json ? { 'content-type': 'application/json' } : {}), ...headers },
        body: json ? JSON.stringify(json) : body,
      });
    } catch { throw new Error('连不上网络，请检查一下再试'); }
    if (r.status === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/invite')) {
      API.logout(); location.hash = '#/login';
      throw new Error((await r.json().catch(() => ({}))).error || '请重新登录');
    }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '出了点问题，请再试一次');
    return raw ? r : r.json();
  }
  const signIn = ({ token, me }) => { localStorage.setItem(TOKEN, token); localStorage.setItem(ME, JSON.stringify(me)); return me; };

  window.API = {
    demo: false,

    login: async (username, password) => signIn(await call('/api/login', { method: 'POST', json: { username, password } })),
    me() { try { return localStorage.getItem(TOKEN) && JSON.parse(localStorage.getItem(ME)); } catch { return null; } },
    logout() { localStorage.removeItem(TOKEN); localStorage.removeItem(ME); },
    invite: (token) => call(`/api/invite/${token}`),
    acceptInvite: async (token, password) => signIn(await call(`/api/invite/${token}`, { method: 'POST', json: { password } })),

    /** 网站上的内容快照(构建时生成);加时间戳绕过 CDN 缓存 */
    async load(fresh = false) {
      if (snapshot && !fresh) return snapshot;
      const r = await fetch(`content.json?t=${Date.now()}`, { cache: 'no-store' });
      snapshot = await r.json();
      return snapshot;
    },

    readLink: (url) => call('/api/read-link', { method: 'POST', json: { url } }),
    fetchImage: async (url) => (await call(`/api/image?url=${encodeURIComponent(url)}`, { raw: true })).blob(),
    translate: (fields, from, to) => call('/api/translate', { method: 'POST', json: { fields, from, to } }),

    /** 照片:压缩到长边 1600、JPEG 82% */
    async prepareImage(file) {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
      return { url: URL.createObjectURL(blob), blob, before: file.size, after: blob.size, w: c.width, h: c.height };
    },

    /**
     * 发布:先逐张上传照片,再把内容和照片一次提交到 main。
     * change = { files: [{ path, json }], images: [{ path, blob }], message }
     */
    async publish(change, onProgress) {
      const files = [...change.files];
      let n = 0;
      for (const img of change.images || []) {
        onProgress?.(`正在上传照片 ${++n} / ${change.images.length}…`);
        const { sha } = await call('/api/blob', { method: 'POST', body: img.blob, headers: { 'content-type': img.blob.type || 'image/jpeg' } });
        files.push({ path: img.path.replace(/^\//, ''), sha });
      }
      onProgress?.('正在保存…');
      const { commit } = await call('/api/publish', { method: 'POST', json: { files, message: change.message } });
      return { id: commit };
    },
    async status(id) { return (await call(`/api/status?commit=${id}`)).state; },
  };
})();
