// ---------- Gallery: albums by event, filter by category, lightbox ----------
// 相册数据在 gallery-data.js(scripts/build.mjs 从 content/gallery/*.json 生成,在后台「相册」里改)。
// 每张照片:[宽, 高, 三语说明或 null, 原图路径, 缩略图路径]。gallery-data.js 必须在本文件之前载入。
const { cats: CATS, albums: ALBUMS } = window.GALLERY;

const curLang = () => (['ms', 'en', 'zh'].includes(document.documentElement.lang) ? document.documentElement.lang : 'en');
const q = (x) => String(x).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const attrs = (o) => `data-ms="${q(o.ms)}" data-en="${q(o.en)}" data-zh="${q(o.zh)}"`;
const path = (a, i, thumb) => a.photos[i][thumb ? 4 : 3];
const COUNT = { ms: (n) => `${n} foto`, en: (n) => `${n} photo${n > 1 ? 's' : ''}`, zh: (n) => `${n} 张` };

// ---- album cards ----
const grid = document.getElementById('albums');
grid.innerHTML = ALBUMS.map((a, idx) => {
  const n = a.photos.length;
  const count = { ms: COUNT.ms(n), en: COUNT.en(n), zh: COUNT.zh(n) };
  return `<li class="album reveal" data-cat="${a.cat}">
    <button type="button" class="album-btn" data-album="${idx}">
      <span class="album-cover"><img src="${path(a, 0, true)}" alt="" loading="lazy" width="${a.photos[0][0]}" height="${a.photos[0][1]}"></span>
      <span class="album-body">
        <span class="album-meta"><span class="album-cat" ${attrs(CATS[a.cat])}>${CATS[a.cat].ms}</span><time>${a.date}</time></span>
        <span class="album-title" ${attrs(a.t)}>${a.t.ms}</span>
        <span class="album-place" ${attrs(a.p)}>${a.p.ms}</span>
        <span class="album-count" ${attrs(count)}>${count.ms}</span>
      </span>
    </button>
  </li>`;
}).join('');

// ---- filter ----
const chips = [...document.querySelectorAll('.filters button')];
chips.forEach((b) => b.addEventListener('click', () => {
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
  const cat = b.dataset.cat;
  grid.querySelectorAll('.album').forEach((li) => { li.hidden = cat !== 'all' && li.dataset.cat !== cat; });
}));

// ---- lightbox ----
const box = document.getElementById('lightbox');
const boxImg = box.querySelector('.lb-img');
const boxTitle = box.querySelector('.lb-title');
const boxCap = box.querySelector('.lb-cap');
const boxCount = box.querySelector('.lb-count');
const boxSrc = box.querySelector('.lb-src');
let cur = { a: 0, i: 0 };
function show() {
  const a = ALBUMS[cur.a]; const ph = a.photos[cur.i]; const L = curLang();
  boxImg.src = path(a, cur.i, false); boxImg.width = ph[0]; boxImg.height = ph[1];
  boxImg.alt = (ph[2] || a.t)[L];
  boxTitle.textContent = a.t[L];
  boxCap.textContent = ph[2] ? ph[2][L] : `${a.p[L]} · ${a.date}`;
  boxCount.textContent = `${cur.i + 1} / ${a.photos.length}`;
  box.classList.toggle('single', a.photos.length < 2);
  if (a.src) { boxSrc.href = a.src; boxSrc.hidden = false; } else boxSrc.hidden = true;
}
function step(d) { const n = ALBUMS[cur.a].photos.length; cur.i = (cur.i + d + n) % n; show(); }
grid.addEventListener('click', (e) => {
  const b = e.target.closest('.album-btn'); if (!b) return;
  cur = { a: +b.dataset.album, i: 0 }; show(); box.showModal();
});
box.querySelector('.lb-prev').addEventListener('click', () => step(-1));
box.querySelector('.lb-next').addEventListener('click', () => step(1));
box.querySelector('.lb-close').addEventListener('click', () => box.close());
box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
box.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(1);
});
let x0 = null;
box.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
box.addEventListener('touchend', (e) => {
  if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
  if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
});
