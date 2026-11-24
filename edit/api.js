// 简易后台的接口层。原型阶段全是「示意」：读本站的内容快照，保存不会真的发出去。
// 接上真正的服务时只换这个文件,app.js 不动。
(() => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let snapshot = null;
  const LANG_NAME = { zh: '中文', en: 'English', ms: 'Bahasa Melayu' };

  // 在已有内容里找同一句话的现成译文(改旧内容时，示意翻译就用真的)
  const known = new Map();
  const walk3 = (a, b, c) => {
    if (typeof a === 'string' && typeof b === 'string' && typeof c === 'string') {
      known.set(a, { ms: a, en: b, zh: c }); known.set(b, { ms: a, en: b, zh: c }); known.set(c, { ms: a, en: b, zh: c });
      return;
    }
    if (a && b && c && typeof a === 'object') for (const k of Object.keys(a)) walk3(a[k], b?.[k], c?.[k]);
  };

  window.API = {
    demo: true,
    LANG_NAME,

    async login(username, password) {
      await wait(500);
      if (!username || !password) throw new Error('请填用户名和密码');
      const me = { username, name: username === 'alwin' ? 'Alwin' : username };
      sessionStorage.setItem('edit-me', JSON.stringify(me));
      return me;
    },
    me() { try { return JSON.parse(sessionStorage.getItem('edit-me')); } catch { return null; } },
    logout() { sessionStorage.removeItem('edit-me'); },

    async load() {
      if (snapshot) return snapshot;
      const r = await fetch('content.json', { cache: 'no-store' });
      snapshot = await r.json();
      for (const [k, group] of Object.entries(snapshot)) if (k !== 'art') for (const e of [].concat(group)) walk3(e.data.ms, e.data.en, e.data.zh);
      return snapshot;
    },

    /** 贴上报道链接 → 尽量读出标题、媒体、日期、图片、语言 */
    async readLink(url) {
      await wait(1400);
      let host = '';
      try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { throw new Error('这个链接打不开，请检查一下'); }
      const media = { 'chinapress.com.my': '中国报', 'orientaldaily.com.my': '东方日报', 'sinchew.com.my': '星洲日报',
        'kwongwah.com.my': '光华日报', 'thestar.com.my': 'The Star', 'malaymail.com': 'Malay Mail', 'bharian.com.my': 'Berita Harian',
        'facebook.com': 'Facebook', 'buletinmutiara.com': 'Buletin Mutiara' };
      const source = Object.entries(media).find(([d]) => host.endsWith(d))?.[1] || host;
      const zhSite = /chinapress|oriental|sinchew|kwongwah/.test(host);
      return {
        title: zhSite ? '林智成：槟城青年需要更多参与地方事务的机会' : 'Alwin Lim: Penang youth need more room in local affairs',
        source, date: new Date().toISOString().slice(0, 10), lang: zhSite ? 'zh' : /bharian|mutiara/.test(host) ? 'ms' : 'en',
        image: '/images/news/chinapress.jpg',
      };
    },

    /** 把 { 字段： 文字 } 从 from 翻成 to 里的每种语言 → { en: {...}, ms: {...} } */
    async translate(fields, from, to) {
      await wait(1200);
      const out = {};
      for (const l of to) {
        out[l] = {};
        for (const [k, text] of Object.entries(fields)) {
          if (!text) { out[l][k] = ''; continue; }
          const hit = known.get(text);
          out[l][k] = hit ? hit[l] : (l === 'en' ? `(Sample English translation of “${k}”)` : `(Contoh terjemahan Bahasa Melayu untuk “${k}”)`);
        }
      }
      return out;
    },

    /** 手机里选的照片：压缩到长边 1600、JPEG 82%,回传预览用的地址与大小 */
    async prepareImage(file) {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
      return { url: URL.createObjectURL(blob), blob, before: file.size, after: blob.size, w: c.width, h: c.height };
    },

    /** 发布：原型里只是假装 */
    async publish(change) {
      await wait(900);
      console.log('[示意] 会提交：', change);
      return { id: String(Date.now()) };
    },
    /** 发布进度:building → live */
    async status(id) {
      await wait(400);
      return Date.now() - Number(id) > 6000 ? 'live' : 'building';
    },
  };
})();
