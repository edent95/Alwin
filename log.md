---
project: alwin
title: Alwin Lim 林智成 个人网站
status: in-progress
version: 0.1.0
updated: 2026-11-15
progress: 70
priority: medium
tags: [static-site, html, css, javascript, i18n, github-pages]
log_format: rag-v1
links:
  ui: https://edent95.github.io/Alwin/
  repo: https://github.com/edent95/Alwin
milestones:
  - { name: "朋友本人审阅马来文/英文翻译(立场、引语、新闻标题)", done: false }
  - { name: "决定是否放 WhatsApp(Zeon 页面上的 +60 13-488 5988 是房地产用号码)", done: false }
  - { name: "确认韩江(Han Chiang)Kickboxing 2018 那格是否保留 logo", done: false }
  - { name: "用活动照片替换纯色 type-cover 新闻封面", done: false }
  - { name: "自定义域名(如 alwinlim.my)", done: false }
---

# Alwin Lim 个人网站 开发日志

## 格式约定 (rag-v1)

> 这一节位于第一条 `## YYYY-MM-DD` 之前。解析器只从**第一个以完整日期开头的二级标题**
> 开始切条目,因此这段内容对解析器不可见,只服务于读原文的人和 agent。

**这份 log 是写给检索的,不是写给连读的。** 每条 `###` 条目都是一个独立的 RAG chunk,
被单独召回时必须自解释 —— 所以每条都重复主语、不使用「它/上述/前面那个」这类指代。

每条条目的固定字段:

| 字段 | 作用 | 取值 |
|---|---|---|
| `type` | 改动种类,用于过滤 | `feat` `fix` `refactor` `ui` `perf` `docs` `config` `chore` `data` |
| `scope` | 改动落在哪一层 | `content`(index.html 文字/链接) `style`(styles.css) `script`(script.js) `assets`(images/) `config`(仓库、Pages、脚本) `docs` |
| `impact` | 影响半径 | `local` `module` `cross-cutting` |
| `changed` | **改了什么** —— 文件 + 每个文件为什么被改 | 路径 + 一句话 |
| `ripples` | **牵连到了什么** —— 因此被耦合、未来必须一起改的东西 | 自然语言,写清耦合方向 |
| `verified` | 凭什么说这条是成立的 | 命令 / 观测到的结果 |
| `keywords` | 检索词,中英并列 | 逗号分隔 |
| `related` | 关联条目 ID | `E-YYYY-MM-DD-NN` |

条目 ID 规则:`E-<日期>-<当天序号>`,**由 `npm run log:append` 分配**,一经写下不再变更。

写 `ripples` 的判断标准 —— 问三个问题:改了这里,**谁的假设失效了**?**谁必须跟着改**?
**下次谁会因为不知道这件事而踩坑**?答不出就写 `无`,不要留空。

**追加条目必须用 `npm run log:append`。** 不要「读整个文件 → 拼接 → 整文件写回」:
这个仓库可能有多个写入方(你、用户、另一个 agent 会话),整文件写回会静默吃掉别人的条目。

**两级分块,不要混淆:**

- 按 `##`(天)聚合是给汇总用的粒度;
- **外部 RAG 索引请按 `###` 切块**,一条条目一个 chunk。按 `##` 切会把一整天糊成一块。
- 每天的条目数没有上限;条目多的日子不要合并写,宁可多开几条 `###`。

---
