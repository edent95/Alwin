# Alwin Lim Zh Chen · 林智成

Personal site for Alwin Lim (Ketua DAPSY Bukit Bendera 2024–2026, Penang). Static site, trilingual (BM / EN / 中文), no dependencies.

- `content/*.json` — all text and data, `{ ms, en, zh }`; edited by Alwin in the CMS at **/admin** (Sveltia CMS, see `docs/admin.md`)
- `src/` — page templates; `scripts/build.mjs` renders them into `_site/` and checks the content
- `styles.css`, `script.js`, `gallery.js` — styles, language toggle, scroll reveal, gallery
- `images/` — photos, news previews, logos; CMS uploads go to `images/uploads/`
- `.github/workflows/deploy.yml` — builds and publishes `_site/` to GitHub Pages on every push to `main`

Preview locally: `npm run dev` (rebuilds on change), then `python3 -m http.server 4719 --directory _site` and open http://127.0.0.1:4719/ (CMS: http://127.0.0.1:4719/admin/ → "Work with Local Repository").

Before changing anything, read `AGENTS.md`. Change log: `log.md` + `logs/entries/` (append with `npm run log:append < entry.md`).
