# 周子骐求职作品集 — 设计与工程规范

> 本文件是这个网站的**唯一事实来源**。换设备、换协作者（包括 AI）修改网页前，先读此文。
> 交付物只有一个文件：`index.html`（单文件 SPA，约 2900 行，含全部 CSS/JS，无构建步骤，双击即可打开）。

---

## 0. 快速上手

| 事项 | 说明 |
|---|---|
| 运行 | 直接双击 `index.html`，或任意静态服务器。无需 npm/构建 |
| 外部依赖 | 仅两个 CDN（均 jsDelivr，国内可达）：GSAP 3.12.5（页签转场）、Oswald 字体（@fontsource，英文展示字体）。挂了都能优雅回退 |
| 资源目录 | `assets/img/`（证件照、视频封面、demo 截图）、`assets/video/`（压缩后 mp4）、`resume.pdf`（对外简历副本，改简历后需与本地 `简历.pdf` 手动同步） |
| 验证脚本 | `_shot.py`：Playwright 截图走查（用系统 Edge，`channel='msedge'`，无需下载 Chromium），输出到 `%TEMP%\shots\` |
| 页面结构 | 4 个页签：首页 PROFILE / 游戏经历 ARCHIVE / Demo WORKS / 拆解案 TEARDOWN（2026-08-21 起 Demo 提到第三位） |

定位代码时不要记行号（会漂），用注释锚点搜索，例如 `=========== 顶部导航`、`FIG.04`、`字号下限·统一`、`滚动揭示`。

---

## 1. 设计语言：明日方舟官网（浅色适配版）

风格基准 = 明日方舟官网（ak.hypergryph.com）的**机能工业风**，按本站"黑框架 + 白画布"原则做了浅色适配（2026-08-18 与用户共同确认）：

- **黑框架**：导航条、首页 Hero 横带、页脚 = 纯黑底 + 标志性青色 + 半调网点纹理
- **白画布**：长文阅读区（拆解案四篇长文）保持浅色底，保证阅读性
- **已放弃的方案**：全站深色（长文阅读累）；全浅色（离官网太远）

### 官网 DNA 取证（2026-08-18 从官网 CSS/截图提取）

- 色彩：`#000` / `#fff` / 标志青 `#18D1FF`，深灰面 `#1D1F20`
- 字体：中文思源黑体；英文 Bender（鹰角定制，**无公开授权，本站不用**）→ 本站用免费可商用的 **Oswald** 替代
- 官网正文最常用字号 = **14px**（与本站字号铁律一致）
- 签名元素：巨号裁切英文背景字、`2026 // 08 / 18` 日期格式、`HTTPS://…` URL 字符串、半调网点、青底黑字按钮、黑导航（英文大写在上、中文小字在下、当前项青色）

---

## 2. 设计令牌（`:root`，搜索 "DESIGN TOKENS"）

```css
--bg: #F7F8F7;          /* 浅底 */
--surface: #FFFFFF;     /* 卡片面 */
--ink: #17191B;         /* 主文字/深色块 */
--gray-1: #454B4F;      /* 次要文字 */
--gray-2: #6E7477;      /* 再次要/装饰文字（对比度已合规，勿再调浅） */
--line: #DCDFDD;        /* 细线 */
--accent: #0E7C86;      /* 浅底上的强调青（文字/描边用，对比度合规） */
--accent-deep: #09565E;
--accent-tint: #E4F1F2; /* 浅青底 */
--ak-cyan: #18D1FF;     /* 官网标志青——只用于深底上或图形元素 */
--ak-black: #07090B;    /* 黑框架 */
--ak-dark: #1D1F20;
--font-en-display: "Oswald", "Arial Narrow", "PingFang SC", "Microsoft YaHei", sans-serif;
--font-body: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
--font-mono: "SFMono-Regular", "JetBrains Mono", Consolas, "Liberation Mono", monospace;
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--chamfer: 14px;        /* 切角幅度（右上+左下） */
--max-w: 1120px;
```

### 色彩使用铁律

- `#18D1FF` 在**白底上对比度不达标**：只用于深底上的文字/描边/色块，或浅底上的**非文字图形元素**（箭头、色块、高亮边）
- 浅底上的强调**文字**一律用 `--accent`（深青）
- 不要引入新颜色。功能色只有黑/白/灰/两档青

---

## 3. 字号下限铁律（用户反复强调过两次）

> **所有文字 ≥ 14px。无一例外。** 标题、按钮、导航、装饰英文、图注，全部遵守。

- 需要"小字感"时：保持 14px，用**常规字重（400) + `--gray-2` 灰 + letter-spacing 拉开**来降级，绝不缩小字号
- 检查方法：`_shot.py` 里有逐页 computed-style 断言，跑一遍就知道有没有漏网
- 新写组件时直接写 ≥14px；SVG 里不放文字（viewBox 缩放会击穿下限，连线标签用 HTML 定位元素）
- 中文正文：15.5px/1.75（`.td-body p`）；展示大字用 clamp（如 `.page-title` clamp(38,5.4vw,56)、Hero 巨字 clamp(130px,21vw,300px)）

### 字体分工

| 用途 | 字体 |
|---|---|
| 中文/正文 | `--font-body`（纯系统栈，不加载中文字体——太大） |
| 英文展示/导航/大数字/FIG 编号 | `--font-en-display`（Oswald，jsDelivr fontsource 500/600/700，失败回退 Arial Narrow） |
| 编号/标签/meta 信息 | `--font-mono` |

---

## 4. 全局组件

### 4.1 导航条（黑）
- 68px 高，纯黑 + 半调网点（`radial-gradient(rgba(255,255,255,.05) 1px, transparent 1.5px) 0 0/22px 22px`）
- 页签 = Oswald 英文（上，`order:-1` 实现）+ 中文（下）；当前页签中文白色加粗、英文青色、青色下划线 scaleX 展开
- ≤700px：隐藏英文行 + 隐藏 logo 后缀（版式适配，不是缩小字号）

### 4.2 Hero 黑横带（首页）
- 结构：`.hero-band > .hero-bg-word + .wrap > .hero + .hero-scroll`
- 巨号描边裁切字："ZHOU ZIQI"（`-webkit-text-stroke: 1.5px rgba(255,255,255,.13)`，透明填充，底部出血）
- 证件照：切角框 + 四角青色括号 + 背后实心青色衬板（`.hero-photo::before`）
- 底部 SCROLL 提示（≤900px 隐藏）

### 4.3 页脚（黑）
姓名（Oswald + 青色高亮）→ 角色行 → 联系方式（fk 青色 / fv 白）→ 版权行。全部 ≥14px。

### 4.4 浅底页面装饰
- 巨号描边背景字：`.section[data-bgword]::before`，`z-index: -1` 压底
  - ⚠️ **教训**：不要给 section 子元素强行 `position:relative` 来压层——会覆盖 `.td-subtabs` 的 `position:sticky`（特异性更高）。用负 z-index 即可
- 日期格式：`2024 // 09 — 至今`（官网 `//` 风格）
- 按钮语言：`.dl-btn` 黑底白字 hover 变青底黑字；`.td-next a` 描边款 hover 变黑；`.works-arrow` 同
- 细分隔线 `.rule` 带 `+` 端点

### 4.5 页签转场（wipe）
GSAP 时间线：`.wipe-panel.p1`（墨黑）→ `.p2`（**官网青**）双斜板扫过 + 中央 Oswald 页码（`data-code`）。`activate()` 时停所有视频、滚回顶。无 GSAP/reduced-motion 时直接切换。

---

## 5. 拆解案图形组件库（FIG.01–08）

统一容器：`.diagram.chamfer > .d-title(FIG.0x — 名称)` + 内容。**每个图是 `.td-body` 的单个直接子元素**（踏浪动效按此拾取整组）。

### 原子件

| 类 | 用途 |
|---|---|
| `.d-node` | 节点盒（`.nk` 小标 / `.nv` 主名 / `.nd` 说明）；`.hub` = 黑底青字核心节点；`.key` = 青描边高亮 |
| `.d-arr` | 竖箭头（`.al` 标签 + `.ln` 线 + `.hd` 三角头）；`.up` 朝上 |
| `.d-arr-r` | 横箭头；`.rev` 朝左。≤700px 自动转竖向 |
| `.d-chip` | 小芯片（`b` + `.cs` 注）；`.key` 青底高亮 |
| `.elbl` | 独立边标签（mono 14px 灰） |

### 布局件

| 类 | 图 | 结构 |
|---|---|---|
| `.loop-layer` 嵌套 + `.loop-back` | FIG.01 三层循环 | 大层套小层 + `.d-arr` 驱动箭头，底部虚线回环条 |
| `.net` | FIG.02 四系统网络 | 2 列 grid，`.span2` 跨列居中（宽 52%），`.arr-cell` 边标签+箭头 |
| `.fork-head` + `.fork-lines` + `.fork-arms` | FIG.03 双轨 / FIG.07 双层 | 顶节点 → 分岔线 → 双卡 |
| `.cyc` | FIG.04 闭环 | 3 列 grid：节点 横箭头 节点 / 上箭头 中心 caption 下箭头 / 节点 反向横箭头 节点；中心 `.cyc-center` |
| `.reflow` | FIG.05 日随循环 | 纵向步骤流 + 左侧青色回流线 + 竖排 `.rf-tag` |
| `.map-row` | FIG.06 映射 | 左 `.map-src` → 箭头 → 右 `.map-tgts` chips |
| `.funnel` | FIG.08 汇聚 | 5 列：源 chips → 箭头 → hub → 箭头 → 去向 chips |

**移动端（≤700px）全部自动纵向堆叠**，规则已写在组件库 media query 里；新增图形组件时往同一个 media query 里补堆叠规则。

### 已有的数据图形（第三版，沿用）

`.timeline`（演进史）、`.cmp-grid`/`.cmp-self`（对比卡组）、`.conf-grid`（VS 冲突卡）、`.aud-list`（受众分层条）。

---

## 6. 动效规范

### 踏浪进场（滚动揭示）
- 目标选择器：`.entry, .skill-card, .td-lead, .td-quick .qc, .td-body > *, .work-block, .media-carousel, .stat-band, .works-nav, .work-head, .work-meta, .work-awards`
- **方向规则（第四版改）**：同区域同向，区域间交替
  - 拆解文 `.td-body`：按 `h2` 分章，同章同向、遇 h2 换向，每篇从 `rv-l` 起；`.td-lead` 固定左、速查卡固定右
  - 其他页：按容器分组交替（`.like-grid / .skill-grid / .cat-list / .work-panel / .section`）
- **可重播**：元素离开视口即移除 `revealed`，再次进入重新切入（上下滚动都触发）
- 同批 stagger 65ms（上限 320ms）；`prefers-reduced-motion` 时全部直出

### 媒体轮播
- 4.5s 自动轮播；**视频播放时停止轮播**；视频封面点击→播放（controls 出现），暂停/结束→恢复封面
- 横滑容器 `touch-action: pan-y`；`pointerdown` 对 `button, a, video, .video-cover, .media-dots` 提前 return（否则 pointer capture 吃掉内部点击）

### 吸顶
拆解案篇章条 `.td-subtabs` sticky，`top: 68px`（= 导航高度，改导航高度要同步改这里）。

---

## 7. 内容决策记录（已和用户确认，勿擅改）

- SNK 职位写"**系统策划实习生**"；教育背景只一行"北邮·数字媒体设计（硕士在读）"
- 首页**不要**数据亮点卡、**不要**定位语；简介为 2026-08-21 版：教育背景 → 能力（游戏先广度后深度）→ 实习经历 → Demo 与拆解案；教育背景含本科（苏州工学院·数字媒体技术）+ 主修课程；技能卡英语只留六级 550（GDC 已删）；Hero 有「下载简历」按钮（`resume.pdf`），页尾有「下一页」按钮（`data-goto-page`）
- 移动端 Hero 照片为右上角小图（96×124，absolute 定位），勿恢复大图独占一行
- 游戏经历三档命名：**本命 / 常驻 / 涉猎**（2026-08-21 改，原"挚爱 / 偏爱 / 欣赏"）；大卡内 insight 块叫「思考沉淀 — TAKEAWAYS」
- 拆解案默认显示整体拆解全文，经济/社交/养成三篇用吸顶子页签切换；不放证据徽章和数据来源
- 5 个 Demo 同页签左右滑动：GameIntern / Loomfall / 龙舟消消乐（原 DragonBoat，2026-08-18 改名）/ 梗纪元 / 永夜轮回；**4 个 AI demo 有"AI 使用与收获"区块（放在制作心得之前），仅梗纪元没有**
- 视频 slide 排最前，默认封面+播放键暂停态
- 策划/analysis（SNK 内部架构）**不放**（保密）

## 8. 待补素材（用户侧）

1. ~~每个 demo 五张运行截图~~ **已完成**（2026-08-18）：`assets/img/<demo拼音>-N.jpg|png`，大体积 PNG 已压成 JPG（≤1920 宽，q85）。命名：`gameintern-1..8.png`、`loomfall-1..5.jpg`、`longzhouxiaoxiaole-1..5.jpg`、`gengjiyuan-1..6.jpg`、`yongyelunhui-1..5.jpg`；原始截图仍在 `demo/<游戏>/截图/`
2. 网盘分享链接 ×5 → 替换 `.dl-btn` 的 `href="#"` 和"网盘链接待补"
3. 各 demo 制作心得（问题→方案）+ 4 个 AI demo 的 AI 使用细节 → 填 `.work-block` 里的"待补充"
4. ~~GitHub 用户名 → GitHub Pages 部署~~ **已完成**（2026-08-18）：`Anm7su/Anm7su.github.io`，线上地址 **https://anm7su.github.io/**（链接已写入 README.md）；`demo/`、`.venv/`、`简历.pdf` 不进仓库（见 `.gitignore`）

## 9. 修改时的硬性约束

- 保持**单文件**：CSS/JS 都写在 `index.html` 里，不拆文件
- CDN 只用 jsDelivr（国内稳）；不新增其他外部依赖；中文字体永远走系统栈
- 新增文字 ≥14px；新增颜色用既有令牌；新组件跟随 `.diagram`/卡片既有语言（白卡+细线+切角+mono 小标）
- 改完跑 `_shot.py` 走查：四页签截图 + 字号断言 + 控制台零报错
