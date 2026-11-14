# AGENTS.md

> 动这个仓库之前，把这一页读完。这里只写**会让你踩坑的事实**,不重复 README 里的功能介绍。

## 0. 三十秒了解

朋友 Alwin Lim Zh Chen(林智成,DAPSY Bukit Bendera 副团长、槟城)的个人政治人物网站。纯静态 HTML/CSS/JS,没有框架、没有构建、没有依赖;三语(BM / EN / 中文)。

```
index.html(全部文字，每个可翻译元素带 data-ms / data-en / data-zh)
   └─ script.js setLang(lang) → 把对应 data-* 写进 innerHTML、改 <html lang>、存 localStorage、排新闻
styles.css(纸色 + 酒红设计 token、版式、槟城元素)
main 分支 → GitHub Pages(根目录)→ https://edent95.github.io/Alwin/(合并后约 1 分钟生效)
```

**三件必须先知道的事:**

1. **仓库是公开的。** `profile.md`(收集的背景资料)和 `images/team.jpg` 只在用户本机，已 gitignore、也从历史里清掉了。不要把私人资料、未公开的电话 / 地址提交进来。
2. **合并到 main 就是上线**(Pages 从 main 根目录发布)。没有 CI,面板不会自动合并;PR 由用户按 Merge,或用户明说才由 agent 合并。
3. 网站以朋友的名义对外发言：引语、立场、新闻标题的马来文 / 英文是 agent 翻译的，改措辞前想清楚，新增的翻译要在交付时提醒用户请本人确认。

## 1. 开学礼包：必读顺序

| # | 文件 | 读它是为了 | 时间 |
|---|---|---|---|
| 1 | 本文件 | 硬约束与坑 | 3 min |
| 2 | `index.html` | 内容与三语结构 | 5 min |
| 3 | `script.js` | 语言切换、新闻排序、滚动显现 | 2 min |
| 4 | **`log.md` + `logs/entries/`** | **改动史。重点读每条的 `ripples`** —— git log 里读不到 | 5 min |

**接手具体任务前**,先用关键词搜一遍改动史里你要动的模块:`grep -rn "<关键词>" log.md logs/entries/`

## 2. 起服务

```bash
node /Users/MacBookPro/Developer/Project/personal-dashboard/scripts/wt.mjs preview <worktree 目录>
# 读 .worktree-preview.json:python3 http.server,端口现取空闲的
```

坑：用户自己开着的预览显示的是主目录，看不到 worktree 的改动 —— 每轮都要把 `wt.mjs preview` 打印的链接给用户。

## 3. 硬约束 —— 违反不会报错，只会静默出错

- **元素的默认文字必须是马来文(BM)。** `script.js` 加载时只有语言不是 `ms` 才调用 `setLang`;默认文字写成英文 / 中文，马来文版就会显示错的语言。
- **加可翻译的元素要三个 `data-*` 都写。** `setLang` 只遍历 `[data-ms]`;漏了 `data-ms` 的元素不会被切换，漏了 `data-en` / `data-zh` 的会停在旧语言。
- **马来文 / 英文版不能出现中文**(用户 2026-11-15 定的):中文名用 `.brand-zh` / `.name-zh`(CSS 在非 `zh` 时隐藏),新闻标题、来源名都要有 BM / EN 翻译。**图片里烧进去的中文也算** —— 新加新闻图先看一眼，有中文字就裁掉。
- 中文全文用全角标点(,。:;)。
- 照片用 `mix-blend-mode: multiply` 融进纸色背景，放照片的容器必须有纸色底，不然会透出下层。
- 新闻卡片带 `data-src-lang`(报道的原文语言，可多个、空格分隔);新加卡片不写它，就永远排在后面(PR #4 起)。

## 4. 改完怎么自证

```bash
# 桌面 + 手机两档整页截图，三种语言各看一次
node ~/.claude/skills/ui-review/scripts/shoot.mjs "<预览链接>?lang=ms" --full --wait 1500 --out <scratchpad>/ms
node ~/.claude/skills/ui-review/scripts/shoot.mjs "<预览链接>?lang=zh" --full --wait 1500 --out <scratchpad>/zh
# 上线后
curl -s -o /dev/null -w "%{http_code}\n" https://edent95.github.io/Alwin/
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
| 手机版天际线只露左半边 | 故意的:`preserveAspectRatio="xMinYMax slice"`,保住升旗山(Bukit Bendera) |

## 7. 还没做的

待办在 `log.md` 的 frontmatter `milestones` 里。**接新需求前先看一眼**,避免重复劳动。
