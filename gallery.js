// ---------- Gallery: albums by event, filter by category, lightbox ----------
// Photos come from public Facebook posts by Alwin Lim, DAPSY Bukit Bendera and ALTeam Penang.
// Each album: id (= folder under images/gallery/), category, date, trilingual title/place,
// photos: [width, height, optional trilingual caption]. Files: NN.jpg (≤1600px) and NN-t.jpg (≤640px).
const CATS = {
  politik:  { ms: 'Politik',  en: 'Politics',  zh: '政治' },
  komuniti: { ms: 'Komuniti', en: 'Community', zh: '社区' },
  perayaan: { ms: 'Perayaan', en: 'Festive',   zh: '节庆' },
  hartanah: { ms: 'Hartanah', en: 'Property',  zh: '房地产' },
};
const ALBUMS = [
  { id: 'agm-2026', cat: 'politik', date: '14.06.2026',
    t: { ms: 'Mesyuarat Agung DAPSY Bukit Bendera', en: 'DAPSY Bukit Bendera AGM', zh: '升旗山社青团党员大会' },
    p: { ms: 'Penggal 2026–2028 · 101 ahli hadir', en: '2026–2028 term · 101 members attended', zh: '2026–2028 年度 · 101 名团员出席' },
    src: 'https://www.facebook.com/dapsybb.pg/posts/1314150297563678/',
    photos: [[1440, 596], [1440, 628]] },
  { id: 'konvensyen-2025', cat: 'politik', date: '09.11.2025',
    t: { ms: 'Konvensyen Tahunan Negeri DAP Pulau Pinang', en: 'DAP Penang Annual State Convention', zh: '行动党槟州常年代表大会' },
    p: { ms: 'Holiday Inn & Suites, Seberang Prai', en: 'Holiday Inn & Suites, Penang Prai', zh: '北海 Holiday Inn & Suites' },
    photos: [[1080, 810], [1600, 1200], [1600, 1200], [1600, 1200]] },
  { id: 'mesyuarat-2025', cat: 'politik', date: '11.06.2025',
    t: { ms: 'Mesyuarat DAPSY Bukit Bendera', en: 'DAPSY Bukit Bendera meeting', zh: '升旗山社青团会议' },
    p: { ms: 'Bersama barisan jawatankuasa', en: 'With the committee', zh: '与理事会成员' },
    photos: [[1290, 1050], [1290, 1542]] },
  { id: 'rumah-terbuka-2025', cat: 'politik', date: '02.02.2025',
    t: { ms: 'Bersama YB Lim Guan Eng', en: 'With YB Lim Guan Eng', zh: '与林冠英一起' },
    p: { ms: 'DAPSY Bukit Bendera', en: 'DAPSY Bukit Bendera', zh: '升旗山社青团' },
    photos: [[1440, 830]] },
  { id: 'dapsy-2024', cat: 'politik', date: '30.06.2024',
    t: { ms: 'Bersama ahli DAPSY Bukit Bendera', en: 'With DAPSY Bukit Bendera members', zh: '与升旗山社青团团员' },
    p: { ms: 'Selepas pemilihan 2024', en: 'After the 2024 election', zh: '2024 年改选之后' },
    photos: [[1080, 607]] },
  { id: 'tanglung-2025', cat: 'komuniti', date: '08.10.2025',
    t: { ms: 'Pesta Pertengahan Musim Luruh', en: 'Mid-Autumn Festival', zh: '中秋晚会' },
    p: { ms: 'Air Itam, Bukit Bendera', en: 'Air Itam, Bukit Bendera', zh: '亚依淡，升旗山' },
    photos: [[1600, 1200], [1600, 1200], [1600, 1200]] },
  { id: 'bukit-bendera-2025', cat: 'komuniti', date: '12.11.2025',
    t: { ms: 'Majlis komuniti di Air Itam', en: 'Community event in Air Itam', zh: '亚依淡社区活动' },
    p: { ms: 'Bukit Bendera', en: 'Bukit Bendera', zh: '升旗山' },
    photos: [[1600, 1200], [1600, 1200], [1600, 1200], [1600, 1200]] },
  { id: 'futsal-2025', cat: 'komuniti', date: '18.06.2025',
    t: { ms: 'Futsal bersama belia', en: 'Youth futsal', zh: '青年五人足球赛' },
    p: { ms: 'Kinta Futsal Club, George Town', en: 'Kinta Futsal Club, George Town', zh: '乔治市 Kinta Futsal Club' },
    photos: [[1290, 756], [1476, 646], [972, 1600], [971, 1600]] },
  { id: 'perayaan', cat: 'perayaan', date: '2024–2026',
    t: { ms: 'Ucapan perayaan', en: 'Festive greetings', zh: '节日祝福' },
    p: { ms: 'Tahun Baharu Cina, Hari Raya, Krismas', en: 'Chinese New Year, Hari Raya, Christmas', zh: '农历新年、开斋节、圣诞节' },
    photos: [[960, 1280, { ms: 'Tahun Baharu Cina', en: 'Chinese New Year', zh: '农历新年' }],
             [1080, 1080, { ms: 'Selamat Hari Raya Aidilfitri', en: 'Hari Raya Aidilfitri', zh: '开斋节' }],
             [934, 1431, { ms: 'Krismas', en: 'Christmas', zh: '圣诞节' }],
             [874, 1280, { ms: 'Tahun Baharu Cina', en: 'Chinese New Year', zh: '农历新年' }]] },
  { id: 'anugerah-2023', cat: 'hartanah', date: '2023',
    t: { ms: 'Malam Anugerah Tahunan Zeon 2023', en: 'Zeon Annual Award Night 2023', zh: 'Zeon 2023 年度颁奖晚宴' },
    p: { ms: 'Tema “The Great Gatsby”', en: '“The Great Gatsby” theme', zh: '主题“The Great Gatsby”' },
    photos: [[1200, 1600], [1216, 1600], [1600, 1215], [1600, 1068], [1600, 1064], [1600, 1066]] },
  { id: 'al-team', cat: 'hartanah', date: '2021–2024',
    t: { ms: 'AL Team Penang', en: 'AL Team Penang', zh: 'AL Team Penang' },
    p: { ms: 'Pasukan hartanah yang dipimpin Alwin', en: 'The property team Alwin leads', zh: '他带领的房地产团队' },
    src: 'https://www.facebook.com/alteampenang',
    photos: [[1117, 1080, { ms: 'Pameran di National Exhibition and Convention Center, Shanghai · 09.11.2024', en: 'Expo at the National Exhibition and Convention Center, Shanghai · 09.11.2024', zh: '上海国家会展中心展会 · 2024 年 11 月 9 日' }],
             [1280, 852, { ms: 'Eastern & Oriental Hotel, George Town · 04.03.2024', en: 'Eastern & Oriental Hotel, George Town · 04.03.2024', zh: '乔治市东方大酒店 · 2024 年 3 月 4 日' }],
             [1152, 1440, { ms: 'Juara Jualan City of Dreams, Jan–Jun 2021', en: 'City of Dreams Top Sales Champion, Jan–Jun 2021', zh: 'City of Dreams 销售冠军，2021 年 1–6 月' }],
             [1203, 909, { ms: 'Tarian singa Tahun Baharu Cina, Queensbay Mall · 02.02.2022', en: 'Chinese New Year lion dance, Queensbay Mall · 02.02.2022', zh: '皇后湾广场新春舞狮 · 2022 年 2 月 2 日' }]] },
];

const curLang = () => (['ms', 'en', 'zh'].includes(document.documentElement.lang) ? document.documentElement.lang : 'ms');
const attrs = (o) => `data-ms="${o.ms}" data-en="${o.en}" data-zh="${o.zh}"`;
const path = (a, i, thumb) => `images/gallery/${a.id}/${String(i + 1).padStart(2, '0')}${thumb ? '-t' : ''}.jpg`;
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
