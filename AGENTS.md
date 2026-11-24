# AGENTS.md

> 动这个仓库之前，把这一页读完。这里只写**会让你踩坑的事实**,不重复 README 里的功能介绍。

## 0. 三十秒了解

朋友 Alwin Lim Zh Chen(林智成,DAPSY Bukit Bendera 团长、槟城)的个人政治人物网站。静态站，零依赖的小构建;三语(BM / EN / 中文)。
Alwin 自己在 **alwinlim.com/admin**(Sveltia CMS)改内容，说明见 `docs/admin.md`。

```
content/*.json(全部文字与资料，{ ms, en, zh } 三段;后台 /admin 改的就是它们)
src/layout.mjs + src/pages/*.mjs(模板)──scripts/build.mjs──▶ _site/index.html、about.html、gallery.html、gallery-data.js
   └─ 页面里每个可翻译元素带 data-ms / data-en / data-zh;script.js setLang(lang) 把对应 data-* 写进 innerHTML
styles.css(纸色 + 酒红设计 token、版式、槟城元素)、script.js、gallery.js、images/ 原样拷进 _site/
main 有新提交 → .github/workflows/deploy.yml 构建 + 检查 → GitHub Pages → https://alwinlim.com/(约 1–2 分钟)
```

**三件必须先知道的事:**

1. **仓库是公开的。** `profile.md`(收集的背景资料)和 `images/team.jpg` 只在用户本机，已 gitignore、也从历史里清掉了。不要把私人资料、未公开的电话 / 地址提交进来。
2. **合并到 main 就是上线**(deploy.yml 构建 `_site/` 发布到 Pages;Pages 来源是「GitHub Actions」,不是分支根目录)。PR 上的检查 `ci`(构建 + 内容检查 + 三语结构 + 日志体检)全过,面板 / GitHub 就**自动合并 = 自动上线**。检查只管结构，不管措辞与排版 —— 改内容的 PR 开出来前先自己截图看过。
   **根目录没有 index.html 了**:要改文字改 `content/*.json`(或让 Alwin 在后台改),要改结构改 `src/`。直接写 `_site/` 下次构建就被覆盖。
3. 网站以朋友的名义对外发言：引语、立场、新闻标题的马来文 / 英文是 agent 翻译的，改措辞前想清楚，新增的翻译要在交付时提醒用户请本人确认。

## 1. 开学礼包：必读顺序

| # | 文件 | 读它是为了 | 时间 |
|---|---|---|---|
| 1 | 本文件 | 硬约束与坑 | 3 min |
| 2 | `docs/admin.md` + `admin/config.yml` | 后台能改什么、内容字段 | 5 min |
| 3 | `scripts/build.mjs` + `src/pages/index.mjs` | 内容怎么变成页面、内容检查 | 5 min |
| 3b | `script.js` | 语言切换、新闻排序、滚动显现 | 2 min |
| 4 | **`log.md` + `logs/entries/`** | **改动史。重点读每条的 `ripples`** —— git log 里读不到 | 5 min |

**接手具体任务前**,先用关键词搜一遍改动史里你要动的模块:`grep -rn "<关键词>" log.md logs/entries/`

## 2. 起服务

```bash
node /Users/MacBookPro/Developer/Project/personal-dashboard/scripts/wt.mjs preview <worktree 目录>
# 读 .worktree-preview.json:build.mjs --watch(改 content/ src/ 自动重建)+ python3 http.server 伺服 _site/,端口现取空闲的
npm run build        # 只构建一次
```
预览链接后面加 `/admin/` → 「使用本地仓库」选 worktree 根目录，可以在本机用后台改内容(写进本机 content/,不提交)。

坑：用户自己开着的预览显示的是主目录，看不到 worktree 的改动 —— 每轮都要把 `wt.mjs preview` 打印的链接给用户。

## 3. 硬约束 —— 违反不会报错，只会静默出错

- **模板里可翻译的元素一律用 `src/h.mjs` 的 `T()`**:`<h2${T(x)}</h2>` 会写出三个 `data-*` 并把马来文当默认文字(三种语言相同时只写文字)。`script.js` 加载时只有语言不是 `ms` 才调用 `setLang`,默认文字不是马来文，马来文版就会显示错的语言。
- **后台字段 ↔ 模板是一对**:改 `admin/config.yml` 的字段名 / 加字段，要同步改 `src/pages/*.mjs`;反过来模板读了新字段，后台没有就改不了。列表字段一律 `i18n: duplicate` + 子字段 `i18n: true`(三种语言条数自动同步)。
- **内容检查在 `scripts/build.mjs`**(缺翻译、BM / EN 里有中文、中文半角标点、图片找不到…),构建失败 = CI 红 = 不上线。`seo` 下的字段不查中文(搜索描述里故意放了中文名)。
- **马来文 / 英文版不能出现中文**(用户 2026-11-15 定的):中文名用 `.brand-zh` / `.name-zh`(CSS 在非 `zh` 时隐藏),新闻标题、来源名都要有 BM / EN 翻译。**图片里烧进去的中文也算** —— 新加新闻图先看一眼，有中文字就裁掉。
- 中文全文用全角标点(,。:;)。
- 照片用 `mix-blend-mode: multiply` 融进纸色背景，放照片的容器必须有纸色底，不然会透出下层。
- 新闻卡片带 `data-src-lang`(报道的原文语言，可多个、空格分隔);新加卡片不写它，就永远排在后面(PR #4 起)。
- 三页的 `<head>`(含 GA)、页首导航、天际线、页脚都在 `src/layout.mjs`,只有一份。
- 相册数据在 `content/gallery/*.json`,构建时写成 `_site/gallery-data.js`(`window.GALLERY`),`gallery.js` 读它;载入顺序 gallery-data.js → gallery.js → script.js。缩略图:有 `<名>-t.jpg` 就用，没有就构建时生成(本机 sips、CI 上 ImageMagick)。
- 后台上传的图片在 `images/uploads/`(自动转 webp、长边 ≤1600)。内容里的本地图片路径以 `/images/` 开头。

## 4. 改完怎么自证

```bash
npm run check        # 构建 + 内容检查 + 三语结构 + 日志体检(和 PR 上的 ci 同一套)
# 桌面 + 手机两档整页截图，三种语言各看一次
node ~/.claude/skills/ui-review/scripts/shoot.mjs "<预览链接>?lang=ms" --full --wait 1500 --out <scratchpad>/ms
node ~/.claude/skills/ui-review/scripts/shoot.mjs "<预览链接>?lang=zh" --full --wait 1500 --out <scratchpad>/zh
# 上线后
curl -s -o /dev/null -w "%{http_code}\n" https://alwinlim.com/
```

`?lang=` 参数会覆盖 localStorage 里存的语言，截图时用它切语言。

## 5. 改完必须补日志

非平凡改动都要追加一条 `###` 条目，格式约定写在 `log.md` 开头。
七个字段里,**`ripples` 是最重要也最容易写空的一栏**:

> 改了这里,**谁的假设失效了**?**谁必须跟着改**?**下次谁会因为不知道这件事而踩坑**?
> 答不出就写「无」,不要留空。

**必须用 `npm run log:append < entry.md` 追加**,不要读整个文件再写回。本仓库已启用 `logs/entries/`:脚本一条一个文件写进那里、不碰 `log.md`,几个 PR 并行也不会在日志上冲突。
**不要把 `log.md` 加进 `.gitignore`。** 写完跑 `npm run log:check`、`npm run log:home`;`home.html` 是产物，已 gitignore。

## 6. 已知的坑与漂移

| 现象 | 真相 |
|---|---|
| 某些新闻网站的图片下载失败 | 诗华日报等有防盗链。不要伪造 Referer 去绕，改用 `.type-cover` 纯色报头卡 |
| Facebook 帖子抓不到正文 | Facebook 对程序只给标题。帖子网址里的 slug 往往就是标题，可以从 slug 取 |
| Sidang Muda 页面的 og 图片 | 看起来是另一个人，不要用 |
| 改了中文版的显示，马来文版没变 | `[lang="zh"]` 的 CSS 只在中文版生效;非中文版的规则写 `html:not([lang="zh"])` |
| 改了 Exabytes 的 DNS / 删了根目录 `CNAME` 文件 | 域名 alwinlim.com 在 Exabytes 注册,DNS 区域在 Exabytes DNS Manager(4 条 `@ A 185.199.108-111.153` + `www CNAME edent95.github.io`)。`CNAME` 文件被删,Pages 会丢掉自定义域名 |
| 删了 / 改了页面 `<head>` 里的 GA 代码(`G-QY6LH8XMJN`) | Search Console(网址资源 `https://alwinlim.com/`)是**靠这段 GA 代码验证的**,删掉它验证就掉，面板 SEO 页的排名 / 收录跟着停更。新加页面要贴同一段代码;要换掉 GA,先在 Search Console 设置 → 所有权验证里加 DNS TXT 等别的验证方式。GA 账户「Alwin Lim」,媒体资源 ID 564806669 |
| Facebook 抓图第二张起没下载 | Chrome 每个分页只放行第一次自动下载，每张开新分页 |
| 手机版天际线只露左半边 | 故意的:`preserveAspectRatio="xMinYMax slice"`,保住升旗山(Bukit Bendera) |

## 7. 还没做的

待办在 `log.md` 的 frontmatter `milestones` 里。**接新需求前先看一眼**,避免重复劳动。
