#!/usr/bin/env python3
"""从 Zeon Properties 抓两份数据(首页两个栏目读它们):

    listings.js  window.LISTINGS —— Alwin 经纪页上的全部房源(二手 / 出租,「Senarai」栏目)
    projects.js  window.PROJECTS —— Zeon 在槟城代理的新盘项目(「Projek」栏目)

    python3 -I scripts/zeon-projects.py            # 写两个文件
    python3 -I scripts/zeon-projects.py --dry-run  # 只打印条数

Zeon 是 Next.js 站:经纪页 / 项目页一次把全部数据塞在 self.__next_f 里,
网页上的「下一页」只是前端切片 —— 所以每页抓一次 HTML 就够，不用翻页。
只留展示要用的字段;不写经纪电话(页面底部已有联系方式)。
Alwin 本人 2026-11-23 定义:「Projects」= 我们在卖的新盘项目,「Listings」= 房源。
项目页是全公司的(吉隆坡 + 槟城),只留 state == Penang 的 —— Alwin 带的是槟城团队。
"""
import json, re, sys, urllib.request
from pathlib import Path

AGENT_URL = "https://www.zeonproperties.com.my/find-agent/alwin-lim-38297"
PROJECT_URL = "https://www.zeonproperties.com.my/project"
ROOT = Path(__file__).resolve().parent.parent


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (alwinlim.com project list)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8")


def payload(html):
    chunks = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)</script>', html, re.S)
    return "".join(json.loads('"' + c + '"') for c in chunks)


def listings(txt):
    m = re.search(r'\[\{"id":"[0-9a-f-]{36}","slug":', txt)
    if not m:
        sys.exit("找不到房源数组:Zeon 经纪页结构可能改了")
    arr, _ = json.JSONDecoder().raw_decode(txt[m.start():])
    seen, out = set(), []
    for x in arr:
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
    return out


def norm_size(s):
    """'1,324 Sq.ft - 3,466 sqft' → '1,324 – 3,466 sq ft'(Zeon 各项目写法不一)。"""
    nums = re.findall(r"\d[\d,]*", re.sub(r"\(.*?\)", "", s or ""))
    nums = [f"{int(n.replace(',', '')):,}" for n in nums]
    return (" – ".join(nums[:2]) + " sq ft") if nums else ""


def projects(txt):
    i = txt.find('{"projects":[')
    if i < 0:
        sys.exit("找不到项目数组:Zeon 项目页结构可能改了")
    arr = json.JSONDecoder().raw_decode(txt[i:])[0]["projects"]
    out = []
    for x in arr:
        if x.get("state") != "Penang":
            continue
        kind = (x.get("propertyType") or "").lower()
        out.append({
            "t": x["title"].strip(),
            "u": "https://www.zeonproperties.com.my/project/" + x["slug"],
            "img": x.get("image") or "",
            "a": (x.get("address") or "").strip(),
            "dev": (x.get("developer") or "").strip(),
            "k": "commercial" if "commercial" in kind else "mixed" if "mixed" in kind else "residential",
            "st": "upcoming" if "UPCOMING" in (x.get("launchStatus") or "") else "new",
            "p": x.get("priceFrom") or x.get("price") or 0,
            "sz": norm_size(x.get("buildUp")),
            "ten": "freehold" if "free" in (x.get("tenure") or "").lower() else "leasehold" if x.get("tenure") else "",
            "done": (x.get("completionDate") or "").strip(),
        })
    return out


def write(name, var, src, data):
    body = json.dumps(data, ensure_ascii=False, indent=0)
    (ROOT / name).write_text(
        "// 由 scripts/zeon-projects.py 从 Zeon 生成,不要手改;重跑脚本即可更新。\n"
        f"// 来源:{src}\n"
        f"window.{var} = {body};\n",
        encoding="utf-8",
    )
    print(f"写入 {name}:{len(data)} 条")


def main():
    ls = listings(payload(fetch(AGENT_URL)))
    ps = projects(payload(fetch(PROJECT_URL)))
    if "--dry-run" in sys.argv:
        print("房源", len(ls), "条;槟城新盘", len(ps), "个")
        return
    write("listings.js", "LISTINGS", AGENT_URL, ls)
    write("projects.js", "PROJECTS", PROJECT_URL + "(只留槟城)", ps)


if __name__ == "__main__":
    main()
