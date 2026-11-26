#!/usr/bin/env node
/**
 * 三语结构检查(CI 与本地共用,零依赖):把 AGENTS.md「硬约束」里静默出错的几条变成会报错的检查。
 *
 *   node scripts/check-i18n.mjs            # 查构建产物 _site/ 里全部 *.html(先跑 npm run build)
 *
 * 1. 带 data-ms / data-en / data-zh 任意一个的元素,三个都要有,且不能是空的。
 *    (setLang 只遍历 [data-ms];漏 data-ms 不会切换,漏 data-en / data-zh 会停在旧语言)
 * 2. data-ms / data-en 里不能有中文 —— 马来文 / 英文版不能出现中文。
 *    例外:class 带 brand-zh / name-zh 的元素(CSS 在非中文版隐藏),先剥掉再查。
 * 3. 新闻卡片(article.story)要有 data-src-lang,否则永远排在最后。
 *
 * 只认双引号 / 单引号包起来的属性值;解析是逐字符扫标签(属性值里可以有 `>`)。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CJK = /[㐀-鿿豈-﫿　-〿＀-￯]/
const LANGS = ['data-ms', 'data-en', 'data-zh']

const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** 逐个产出 { name, attrs, line } —— 只看开始标签;跳过注释、<script>、<style> 的内容 */
function* tags(html) {
  let i = 0
  let line = 1
  const advance = (to) => { for (; i < to; i++) if (html[i] === '\n') line++ }
  while (i < html.length) {
    const lt = html.indexOf('<', i)
    if (lt < 0) return
    advance(lt)
    if (html.startsWith('<!--', i)) { const end = html.indexOf('-->', i); advance(end < 0 ? html.length : end + 3); continue }
    const m = /^<([a-zA-Z][\w-]*)/.exec(html.slice(i, i + 40))
    if (!m) { advance(i + 1); continue }
    const start = i
    const startLine = line
    let j = i + m[0].length
    let quote = ''
    for (; j < html.length; j++) {
      const c = html[j]
      if (quote) { if (c === quote) quote = '' } else if (c === '"' || c === "'") quote = c
      else if (c === '>') break
    }
    const body = html.slice(start + m[0].length, j)
    advance(j + 1)
    const attrs = {}
    for (const a of body.matchAll(/([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
      attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '')
    }
    const name = m[1].toLowerCase()
    yield { name, attrs, line: startLine }
    if (name === 'script' || name === 'style') {
      const end = html.toLowerCase().indexOf(`</${name}`, i)
      advance(end < 0 ? html.length : end)
    }
  }
}

/** 剥掉 class 带 brand-zh / name-zh 的元素(只处理不嵌套同名标签的简单情况,本站够用) */
const stripZhOnly = (s) => s.replace(/<(\w+)[^>]*class\s*=\s*["'][^"']*\b(?:brand|name)-zh\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/g, '')

export function checkHtml(html, file = '') {
  const problems = []
  const at = (line) => `${file}:${line}`
  for (const t of tags(html)) {
    const has = LANGS.filter((k) => k in t.attrs)
    if (has.length) {
      const missing = LANGS.filter((k) => !(k in t.attrs))
      if (missing.length) problems.push(`${at(t.line)} <${t.name}> 有 ${has.join(' / ')},缺 ${missing.join(' / ')}`)
      for (const k of has) if (!t.attrs[k].trim()) problems.push(`${at(t.line)} <${t.name}> 的 ${k} 是空的`)
      for (const k of ['data-ms', 'data-en']) {
        if (k in t.attrs && CJK.test(stripZhOnly(t.attrs[k]))) problems.push(`${at(t.line)} <${t.name}> 的 ${k} 里有中文:${t.attrs[k].slice(0, 60)}`)
      }
    }
    if (t.name === 'article' && /\bstory\b/.test(t.attrs.class ?? '') && !(t.attrs['data-src-lang'] ?? '').trim()) {
      problems.push(`${at(t.line)} 新闻卡片 <article class="story"> 没有 data-src-lang`)
    }
  }
  return problems
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const SITE = path.join(ROOT, '_site')
  if (!fs.existsSync(SITE)) { console.error('✗ 没有 _site/:先跑 npm run build'); process.exit(1) }
  const files = [...fs.readdirSync(SITE), ...(fs.existsSync(path.join(SITE, 'views')) ? fs.readdirSync(path.join(SITE, 'views')).map((f) => `views/${f}`) : [])].filter((f) => f.endsWith('.html')).sort()
    .filter((f) => !fs.readFileSync(path.join(SITE, f), "utf8").includes("<meta name=\"robots\" content=\"noindex\">")) // redirects.json 生成的跳转页
  const problems = files.flatMap((f) => checkHtml(fs.readFileSync(path.join(SITE, f), 'utf8'), f))
  if (problems.length) {
    console.error(problems.join('\n'))
    console.error(`\n✗ ${problems.length} 处三语问题(${files.join('、')})`)
    process.exit(1)
  }
  console.log(`✓ 三语检查通过:${files.length} 页(${files.filter((f) => !f.includes('/')).join('、')} + ${files.filter((f) => f.includes('/')).length} 篇观点)`)
}
