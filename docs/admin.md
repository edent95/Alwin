# 后台(/admin)

alwinlim.com/admin 是给 Alwin 自己改网站内容的后台,用的是 [Sveltia CMS](https://sveltiacms.app/)(开源、免费)。
内容存在仓库的 `content/*.json`,后台一保存就是一次提交;`.github/workflows/deploy.yml` 构建、检查通过后 1–2 分钟上线。

```
Alwin 在 /admin 改 → 保存 = 提交到 main → deploy.yml:npm run build(内容检查)→ 发布 _site/ 到 Pages
                                                    └─ 检查没过:不上线,线上停在上一版,自动开 issue 通知
```

## 能改什么

| 后台里 | 网站上 | 文件 |
|---|---|---|
| 新闻报道 | 首页「Berita」卡片 | `content/news/*.json`(一篇一个) |
| 观点 | 首页「Pandangan」卡片 | `content/views/*.json` |
| 相册 | 相册页的每个活动、照片 | `content/gallery/*.json` |
| 页面文字 → 首页 | 首屏介绍、数字卡、立场、历程、各栏标题、搜索引擎描述 | `content/home.json` |
| 页面文字 → 关于页 | 简介、基本资料、五个章节 | `content/about.json` |
| 页面文字 → 相册页 | 相册页标题、分类按钮 | `content/gallery-page.json` |
| 页面文字 → 全站 | 名字、导航、页脚联系方式 | `content/site.json` |

不在后台:新盘 / 房源(`projects.js`、`listings.js`,由 `scripts/zeon-projects.py` 从 Zeon 抓)、版式和颜色(`styles.css`)、观点卡的插画(`src/art/*.svg`,后台里只能从现有七张里选)。

## 第一次设置(2026-11-24 已做完,留作重装 / 排错参考)

1. **登录服务(Sveltia CMS Additions)**:Alwin 用账号密码登录,不用 GitHub 帐号。免费,跑在 Cloudflare Workers 免费档。
   - Worker `alwin-cms`,网址 <https://alwin-cms.d-tytern.workers.dev>(Eden 的 Cloudflare 帐号),已填进 `admin/config.yml` 的 `backend.base_url`。
   - `ADMIN_SECRET` 存在 Eden 的 macOS 钥匙串,名字「alwin-cms ADMIN_SECRET」:`security find-generic-password -s "alwin-cms ADMIN_SECRET" -w | pbcopy`。
   - 帐号:`lengzaialwin`(Eden,admin)、`alwin`(Alwin,editor)。在后台 Administration → Users 管理、重设密码。
   - GitHub App `sveltia-cms-edent95-alwin-4ecf`(App ID 5905724,私有,只装在 `edent95/Alwin`)。
   - **升级 / 重新部署**:用 <https://github.com/sveltia/sveltia-cms-additions> 的 `templates/cloudflare`,`wrangler.jsonc` 的 `name` 改成 `alwin-cms`,在**仓库外**的目录 `pnpm install --ignore-workspace && pnpm exec wrangler deploy`(在 monorepo 里装会解析不到 `@sveltia/cms-additions/cloudflare`)。
   - **坑:设置向导的「Connect to GitHub」报「GitHub responded with an error」**:1.0.0 建 App 前会不带身份查 `GET /users/edent95`,Cloudflare 共用出口 IP 常被 GitHub 限流。当时在部署目录里把 `lib/git/github/app.js` 的 `getAccountType` 改成查不到就当 `User` 再部署;升级后补丁会消失,但只有重新建 App 时才用得到。
   - **坑:GitHub 先要「Confirm access」时,建 App 的 manifest 会丢**(页面显示 We didn't find an App Manifest)。确认身份后回 /admin 重做一次向导即可。
2. **后台保存直接进 main**:旧的分支保护已删,改成两条 ruleset(Settings → Rules):
   - 「main: 禁止强推和删除」:没有任何人可绕过(Sveltia 要求这一条不能让 App 绕过,不然后台 GitHub 页会一直警告)。
   - 「main: 必须过 ci(后台 App 可直接提交)」:要求 `ci` 检查;bypass = 后台 App(5905724)+ 仓库 admin(对应旧保护的 enforce_admins 关闭)。PR 仍要过 `ci` 才会被面板自动合并。
   - 内容检查不会因此跳过:deploy.yml 构建时照样检查,没过就不上线、自动开 issue。
   - 取舍:能登录后台的人等于能直接写 main。后台只有 Eden 和 Alwin;要更保险就把 App 从第二条的 bypass 拿掉、`admin/config.yml` 改成 PR 模式。
3. **一键翻译**:Google Gemini(AI Studio 免费 API key,不用绑卡;免费档的输入可能被 Google 用来改进产品,网站内容本来就公开)。在后台 Administration → Credentials 填一次,所有人共用。
4. **Pages 来源**:GitHub Actions(2026-11-24 切换,PR #24 合并前)。

## 本机预览后台

```bash
node /Users/MacBookPro/Developer/Project/personal-dashboard/scripts/wt.mjs preview <worktree 目录>
```

打开 `<预览链接>/admin/` → **使用本地仓库** → 选 worktree 的根目录(Chrome / Edge)。
改了保存会直接写进本机的 `content/`,`npm run dev` 自动重建,刷新预览页就看到。本地模式不会提交,也不会上线。

## 给 Alwin 的使用说明

**登录**:alwinlim.com/admin,用 Eden 给的账号密码。手机也能用(右上角菜单 → 用手机登录,扫二维码)。

**改字**:左边选栏目 → 点一条 → 左栏英文、右栏中文(右栏上方可以切到马来文)。
用中文或英文写好一栏后,点另一栏右上角的 **文A** 翻译按钮,另外两种语言就填好了。**翻译出来的请过目再保存**,网站是以你的名义说话。

**保存 = 上线**:按右上角 **保存**,1–2 分钟后网站更新。刷新 alwinlim.com 看效果。
如果保存后网站一直没变,多半是内容检查没过(例如马来文 / 英文栏里留了中文),Eden 会收到通知。

**加新闻 / 观点**:进「新闻报道」或「观点」→ 右上角 **新建**。必填的有星号。
- 「报道原文语言」照实选:读者切到那种语言时,那篇会排在前面。
- 新闻有照片最好;照片里有中文字的话,请先裁掉(马来文 / 英文版的读者也会看到)。

**加相册**:进「相册」→ **新建** → 填活动名称、地点、分类、日期 → 照片栏 **添加 照片** 上传。
照片会自动压缩;「排序」数字小的排在前面(同一分类里)。

**暂时下架**:每篇新闻 / 观点 / 相册最下面都有「暂时不在网站上显示」,打开再保存就下架,内容还留着。

**改错了**:每次保存都有记录,Eden 可以退回任何一个版本。

## 给开发者

- 内容格式、字段说明:`admin/config.yml`(字段名改了,`src/pages/*.mjs` 要跟着改)。
- 模板:`src/layout.mjs`(三页共用的 head / 导航 / 页脚)+ `src/pages/{index,about,gallery}.mjs`。
- 构建 + 内容检查:`scripts/build.mjs`(零依赖)。检查项:缺翻译、马来文 / 英文里有中文、中文里有半角 `,;:!?`、各语言条数不一样、图片找不到、观点分类不对。
- `npm run check` = 构建 + 三语结构检查(`_site/*.html`)+ 日志体检,和 PR 上的 `ci` 同一套。
