# _shot.py — Playwright 截图走查（唯一事实来源见 DESIGN.md §0/§3/§9）
#
# 功能：
#   1. 四个页签（PROFILE / ARCHIVE / TEARDOWN / WORKS）整页截图 → %TEMP%\shots\
#   2. 逐页 computed-style 字号断言：所有可见文字 ≥ 14px（DESIGN.md §3 铁律）
#   3. 控制台零报错断言（console error + pageerror）
#
# 用法：
#   pip install playwright          # 只需装 Python 包
#   python _shot.py                 # 用系统 Edge（channel='msedge'），无需 playwright install
#
# 退出码：0 = 全部通过；1 = 有字号违规或控制台报错（明细打印在 stdout）。

import os
import sys
import tempfile

from playwright.sync_api import sync_playwright

# Windows 中文系统控制台默认 GBK，避免 ✓/✗ 等字符触发 UnicodeEncodeError
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = os.path.dirname(os.path.abspath(__file__))
URL = "file:///" + os.path.join(ROOT, "index.html").replace(os.sep, "/")
OUT_DIR = os.path.join(tempfile.gettempdir(), "shots")

MIN_FONT_PX = 14.0
PAGES = ["profile", "archive", "teardown", "works"]

# 收集所有「直接包含文本节点且可见」的元素，断言 computed font-size ≥ 14px。
# 不检查 opacity（滚动揭示中的元素 opacity=0 但仍受字号铁律约束）；
# display:none 的非激活页签会被 getClientRects() 自动过滤。
FONT_AUDIT_JS = """(minPx) => {
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    let hasText = false;
    for (const n of el.childNodes) {
      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) { hasText = true; break; }
    }
    if (!hasText) continue;
    if (!el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const size = parseFloat(cs.fontSize);
    if (size < minPx - 0.01) {
      const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\\s+/).slice(0, 3).join('.');
      bad.push({ tag: el.tagName.toLowerCase(), cls, size, text: el.textContent.trim().slice(0, 30) });
    }
  }
  return bad;
}"""

# 缓慢滚动整页：触发 lazy 图片加载与滚动揭示，最后回到顶部。
SCROLL_PASS_JS = """async () => {
  const step = window.innerHeight * 0.7;
  for (let y = 0; y <= document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 80));
  }
  window.scrollTo(0, 0);
  await Promise.race([
    Promise.all([...document.images].filter(i => !i.complete).map(i =>
      new Promise(r => { i.onload = i.onerror = r; }))),
    new Promise(r => setTimeout(r, 4000)),
  ]);
}"""


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    console_errors = []   # [(page, message)]
    font_failures = []    # [str]

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        # reduced_motion='reduce'：全站动效直出（DESIGN.md §6 的既定回退路径），
        # 保证整页截图不受滚动揭示透明度影响，结果可复现。
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            reduced_motion="reduce",
        )
        page = ctx.new_page()

        current = {"name": "profile"}
        page.on("console", lambda m: console_errors.append((current["name"], m.text)) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append((current["name"], str(e))))

        page.goto(URL, wait_until="load")
        page.wait_for_timeout(1000)  # 等 CDN（GSAP / Oswald）与首屏渲染

        for i, name in enumerate(PAGES, 1):
            current["name"] = name
            if name != "profile":
                page.click(f'.nav-tab[data-page="{name}"]')
                page.wait_for_timeout(600)  # 页签转场（reduced-motion 下为直接切换）
            page.evaluate(SCROLL_PASS_JS)
            page.wait_for_timeout(400)

            shot = os.path.join(OUT_DIR, f"{i}-{name}.png")
            page.screenshot(path=shot, full_page=True)
            print(f"[截图] {shot}")

            for b in page.evaluate(FONT_AUDIT_JS, MIN_FONT_PX):
                cls = f".{b['cls']}" if b["cls"] else ""
                font_failures.append(
                    f"[{name}] <{b['tag']}{cls}> {b['size']:g}px < {MIN_FONT_PX:g}px — 「{b['text']}」"
                )

        browser.close()

    print()
    if font_failures:
        print(f"✗ 字号违规 {len(font_failures)} 处（铁律：所有文字 ≥ {MIN_FONT_PX:g}px）：")
        for line in font_failures:
            print("  " + line)
    else:
        print(f"✓ 字号断言通过（四页签全部 ≥ {MIN_FONT_PX:g}px）")

    if console_errors:
        print(f"✗ 控制台报错 {len(console_errors)} 条：")
        for pg, msg in console_errors:
            print(f"  [{pg}] {msg}")
    else:
        print("✓ 控制台零报错")

    ok = not font_failures and not console_errors
    print(f"\n{'通过' if ok else '未通过'} — 截图输出目录：{OUT_DIR}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
