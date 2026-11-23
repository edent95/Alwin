#!/usr/bin/env python3
"""从 Alwin 的 Zeon 经纪页抓全部房源,写成 projects.js(首页「Projek」栏目读它)。

    python3 -I scripts/zeon-projects.py            # 写 projects.js
    python3 -I scripts/zeon-projects.py --dry-run  # 只打印条数

Zeon 是 Next.js 站:经纪页一次把全部房源(约 60 条)塞在 self.__next_f 里,
网页上的「下一页」只是前端切片 —— 所以抓一次 HTML 就够,不用翻页。
只留展示要用的字段;不写经纪电话(页面底部已有联系方式)。
"""
import json, re, sys, urllib.request
from pathlib import Path

URL = "https://www.zeonproperties.com.my/find-agent/alwin-lim-38297"
OUT = Path(__file__).resolve().parent.parent / "projects.js"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (alwinlim.com project list)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def listings(html):
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>', html, re.S)
    txt = "".join(json.loads('"' + c + '"') for c in chunks)
    m = re.search(r'\[\{"id":"[0-9a-f-]{36}","slug":', txt)
    if not m:
        sys.exit("找不到房源数组:Zeon 页面结构可能改了")
    arr, _ = json.JSONDecoder().raw_decode(txt[m.start():])
    return arr


def main():
    raw = listings(fetch(URL))
    seen, out = set(), []
    for x in raw:
        title = re.sub(r"\s*!+\s*$", "", x["title"].strip()).strip()
        if title in seen:  # Zeon 上有同一套房贴了两次
            continue
        seen.add(title)
        out.append({
            "t": title,
            "u": "https://www.zeonproperties.com.my/listing/" + x["slug"],
            "img": x.get("image") or "",
            "s": "rent" if "RENT" in x["status"] else "sale",
            "k": x.get("propertyType") or "",
            "p": x.get("price") or 0,
            "sq": x.get("sqft") or 0,
        })
    if "--dry-run" in sys.argv:
        print(len(raw), "条,去重后", len(out))
        return
    body = json.dumps(out, ensure_ascii=False, indent=0)
    OUT.write_text(
        "// 由 scripts/zeon-projects.py 从 Zeon 经纪页生成,不要手改;重跑脚本即可更新。\n"
        f"// 来源:{URL}\n"
        f"window.PROJECTS = {body};\n",
        encoding="utf-8",
    )
    print(f"写入 {OUT.name}:{len(out)} 条")


if __name__ == "__main__":
    main()
