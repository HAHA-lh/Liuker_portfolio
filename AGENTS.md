# LIUKER Portfolio — 项目接手说明

> 本文件是本项目的长期接手上下文。面向继续开发本项目的同事、Codex 或其他编程代理。
> 修改代码前先阅读本文件；文档内容与当前 `main` 分支实现对应。

## 1. 项目目标

这是 LIUKER 的双语视频创作者作品集，主要服务于招聘展示和个人品牌传播。网站不是通用模板，而是围绕视频、动态设计、CGI 和鼠标/滚轮交互构建的沉浸式作品集。

当前产品方向：

- 品牌名称固定为 `LIUKER`。
- 中文为默认语言，同时提供英文切换。
- 默认深色主题，同时提供浅色主题。
- 第一屏以滚轮控制视频时间轴，不使用鼠标左右移动控制视频。
- Showreel 是与首屏交互视频分开的第二套播放入口，仅在点击按钮后加载并播放。
- 作品区包含 20 个项目，并提供球形项目菜单、Masonry/MagicBento 风格卡片和单项目详情页。
- 关于、经历和联系区域保留强互动性，但不能让高成本 Canvas/WebGL 在屏幕外持续运行。
- 设计/开发环境可直接编辑部分文字；生产部署后所有文字必须不可编辑。
- 生产网站以 GitHub `main` 分支触发 Vercel 自动部署。

## 2. 当前线上与仓库

- 线上网站：<https://liuker-portfolio.vercel.app/>
- GitHub：<https://github.com/HAHA-lh/Liuker_portfolio>
- 默认分支：`main`
- Git 远程：`origin`
- 视频文件由 Git LFS 管理，见 `.gitattributes`。
- `.openai/hosting.json` 已绑定一个 ChatGPT Sites 项目；不要删除或改写其中的 `project_id`。
- 当前主要公开站点是 Vercel。ChatGPT Sites 备用镜像会因为约 470 MB 的构建素材包出现上传超时，因此不要把 Sites 镜像是否更新当作 Vercel 发布成功与否的判断标准。

生产发布原则：只有在用户明确要求同步、发布或当前任务本身就是部署任务时，才提交并推送。推送 `main` 后应检查 Vercel 页面是否已经出现新内容。

### 2.1 关键演进决策

下面是此前多轮设计和性能调整后已经确认的方向，后续不要在不知情的情况下回退：

1. 品牌从 LIKER 统一为 `LIUKER`。
2. 作品清单从少量 demo 扩充到 20 个项目，并改成 CSV 批量维护。
3. 作品浏览同时保留 WebGL 球形菜单和 Masonry 卡片墙，两者使用同一份项目数据。
4. 全站加入鼠标互动，但移除了高消耗、干扰画面的 SplashCursor 流体光迹。
5. 首屏改为全屏视频，最终交互确定为“滚轮控制时间轴”，取消鼠标左右移动控制。
6. 首屏滚轮视频与点击播放的 Showreel 被明确拆成两个独立素材和两套交互。
7. 为解决卡顿，首屏、Showreel、项目视频和 WebGL 场景均改为按需加载或视口暂停。
8. About、Experience、Toolkit 和 Contact 的部分文字曾支持页面内编辑，最终要求为“仅开发环境可编辑，部署后不可编辑”。
9. 项目已经接入 GitHub、Git LFS 和 Vercel；后续修改应保留可持续迭代能力。
10. 经历时间线已从占位内容更新为 2018 至今的三段真实方向，当前内容见第 6.2 节。
11. 首页入口增加关键资源 Loading：进入前完整缓存当前设备对应的首屏交互视频并解码首帧；Showreel 和项目视频仍保持按需加载。

## 3. 技术栈

- React 19
- Next.js 16 App Router
- vinext + Vite 8（本地开发和 ChatGPT Sites/Cloudflare Worker 构建）
- TypeScript 5，严格模式
- Framer Motion / `framer-motion`
- GSAP
- Three.js、React Three Fiber、Drei、Rapier、meshline
- OGL
- gl-matrix / WebGL2
- Lucide React
- Tailwind CSS 4 仅作为全局 CSS 构建依赖；页面主要使用手写 CSS
- Kanit 本地字体包，中文回退到 PingFang SC / Microsoft YaHei

运行时要求：Node.js `>=22.13.0`，并安装 Git LFS。

## 4. 目录结构

```text
.
├─ app/
│  ├─ page.tsx                    # 首页入口，只渲染 PortfolioHome
│  ├─ portfolio-home.tsx          # 首页主要结构、状态、弹窗和交互编排
│  ├─ hero-media.ts               # 首屏/Showreel 路径、设备选源与首屏完整缓存
│  ├─ content.ts                  # 网站主文案、经历、技能、项目模板与数据合并
│  ├─ project-rows.generated.ts   # 由 CSV 自动生成，禁止手改
│  ├─ globals.css                 # 全站视觉、布局、响应式和主要区块样式
│  ├─ language.tsx                # 中英文状态和 localStorage
│  ├─ theme.tsx                   # 深浅主题状态和 localStorage
│  ├─ layout.tsx                  # Provider、全局 DotField、字体和分享元数据
│  ├─ components/                 # React Bits 改造后的交互组件
│  └─ work/[slug]/                # 静态生成的项目详情页
├─ content/
│  ├─ projects.csv                # 20 个项目的权威素材清单
│  ├─ LIUKER-作品素材清单.xlsx      # 便于人工维护的表格副本
│  └─ README.md                   # 素材清单说明
├─ public/
│  ├─ media/projects/             # 项目视频、首屏交互视频、项目封面
│  ├─ media/showreel/             # 独立 Showreel 视频
│  ├─ hero-posts/                 # 首屏备用/历史海报资源
│  └─ og.*                        # 社交分享图
├─ scripts/sync-projects.mjs      # CSV → TypeScript 数据生成器
├─ scripts/prepare-video.mjs      # 母版 → 预览、完整视频与双格式封面
├─ scripts/audit-media.mjs        # 扫描编码、色深、帧率、体积与 faststart
├─ build/sites-vite-plugin.ts     # Sites/vinext 构建适配
├─ worker/index.ts                # Cloudflare Worker/vinext 入口
├─ vercel.json                    # Vercel 使用 Next.js 构建
├─ vite.config.ts                 # vinext + Sites + Cloudflare 插件
├─ .openai/hosting.json           # ChatGPT Sites 绑定信息
├─ .gitattributes                 # Git LFS 视频规则
└─ package.json
```

## 5. 页面架构

### 5.1 首页 `/`

首页由 `app/portfolio-home.tsx` 中的 `PortfolioHome` 组织，顺序固定为：

1. `LoadingScreen`
   - 仅首页显示，先加载 AVIF/WebP 海报、字体和当前设备对应的首屏交互视频。
   - 视频完整缓存到内存并完成首帧解码后，实际 `ScrollHero` 才接管素材。
   - 最长等待约 18 秒；异常网络或解码失败时自动进入流式降级，不能无限卡在 Loading。
   - Loading 期间暂停 DotField 动画，避免 Canvas 与视频下载/解码争抢资源。
2. `Header`
   - 左上 LIUKER 品牌标记。
   - 右上 `StaggeredMenu` 抽屉菜单。
   - 菜单内包含作品、关于、经历、联系锚点，以及主题和语言切换。
3. `ScrollHero`
   - 100svh sticky 首屏，外部滚动区桌面约 340svh、移动端约 190svh。
   - 轻量 AVIF/WebP 海报先显示。
   - Loading 成功时直接复用内存 Blob；降级时才在用户第一次滚动后请求网络视频。
   - 滚动进度映射到视频时间，不自动播放。
   - 中央 `SHOWREEL` 渐变大字的透明度随滚动从约 10% 增长到 70%。
   - Showreel 按钮打开独立播放弹窗。
4. `Marquee` / `InfiniteMenu`
   - 20 个项目映射成 WebGL2 球形菜单。
   - 鼠标或触摸拖拽旋转，松开后自动吸附到最近项目。
   - 点击中心动作按钮打开对应项目的视频弹窗。
5. `#work`
   - 20 个项目的 Masonry 卡片墙。
   - 带聚光、边缘发光、粒子、轻微倾斜/磁吸和点击效果。
   - 卡片可打开视频弹窗或项目详情页。
6. `#about`
   - OGL `Orb` 动态背景。
   - 标题使用 `TextPressure`。
   - 正文使用 `VariableProximity`，鼠标靠近时改变可变字体参数。
7. `#experience`
   - 中轴线随滚动生长的编辑式时间线。
   - 三段经历交错排版，下面是软件工具和专业能力。
8. `#contact`
   - Three.js + Rapier 的可拖拽 `Lanyard` 联系卡。
   - 当前真实联系方式仍是占位状态。
9. 全页外层 `ClickSpark`
   - 点击产生轻量火花。
10. 全局背景 `DotField`
   - 在 `app/layout.tsx` 中渲染，覆盖整个页面背景并响应鼠标。

### 5.2 项目详情 `/work/[slug]`

- `generateStaticParams()` 根据 `projects` 生成全部项目路径。
- 页面包含项目标题、分类、年份、职责、时长、工具、主视频、Challenge/Process/Result、媒体区和下一项目入口。
- 详情文案目前主要来自 6 个基础模板；20 个项目通过 `template_slug` 复用模板。真实案例完善时，需要在数据模型中补充每个项目自己的 summary/challenge/process/result，而不是长期依赖模板占位文案。

## 6. 数据流与内容来源

```text
content/projects.csv
        │ npm run content:sync
        ▼
app/project-rows.generated.ts
        │ 与 6 个 baseProjects 模板合并
        ▼
app/content.ts 中的 projects
        ├─ 首页 InfiniteMenu
        ├─ 首页 Masonry
        ├─ 视频弹窗
        └─ /work/[slug] 详情页
```

### 6.1 网站主文案

编辑 `app/content.ts` 中的 `siteContent`：

- `name`
- `role`
- `heroIntro`
- `about`
- `contact`
- `nav`
- `experience`
- `skills`
- `capabilities`

所有面向用户的长期文案应同时维护 `zh` 和 `en`。

### 6.2 当前经历时间线

当前三段经历已经按用户提供的参考图更新：

1. `2025 — NOW`
   - 中文：`CGI视频创作者 / 自由职业`
   - 英文：`CGI Video Creator / Freelance`
   - 说明：`品牌短片、社交内容与动态视觉。`
2. `2021 — 2024`
   - 中文：`直播礼物动态设计`
   - 英文：`Live Gift Motion Design`
   - 说明：`前期构思、中期制作、礼物上线`
3. `2018 — 2020`
   - 中文：`后期与动态设计`
   - 英文：`Post-production & Motion Design`
   - 说明：`视觉研究、分镜与设计系统。`

### 6.3 项目素材清单

`content/projects.csv` 是 20 个项目列表的权威来源。不要直接修改 `app/project-rows.generated.ts`。

主要字段：

- `order`：显示顺序。
- `slug`：详情页路径，只允许小写字母、数字和连字符。
- `template_slug`：详情文案模板，只能使用 `afterglow`、`neon-pulse`、`quiet-tides`、`kinetic-type`、`orbital-form`、`nocturne`。
- `title_zh` / `title_en`
- `category_zh` / `category_en`
- `year`
- `role_zh` / `role_en`
- `duration`
- `preview_video`：卡片悬停预览。
- `full_video`：视频弹窗与详情页主视频。
- `cover`：海报；生成器会把 `.jpg/.jpeg/.png` 路径规范化为 `.webp`。
- `visual`：无海报时的 CSS 渐变。
- `featured`
- `enabled`

CSV 可以包含绝对 Windows 路径；同步脚本会截取 `/public` 之后的部分并转成网站路径。保存 Excel 导出的 CSV 时必须使用 UTF-8。

修改 CSV 后运行：

```bash
npm run content:sync
```

`npm run dev` 和 `npm run build` 也会自动先同步。

### 6.4 当前 20 个项目目录

以下顺序来自 `content/projects.csv`，是首页和详情路由的当前顺序：

| # | slug | 中文标题 | 英文标题 | 分类 | 年份 | 素材状态 |
|---:|---|---|---|---|---:|---|
| 01 | `afterglow` | 百龄坛 | Ballantine_30s | 品牌短片 | 2026 | 本地视频与封面 |
| 02 | `neon-pulse` | BMW | BMW | 广告 | 2026 | 本地视频与封面 |
| 03 | `quiet-tides` | 播 | BO | 品牌短片 | 2025 | 本地视频与封面 |
| 04 | `kinetic-type` | HOW_Bra | HOW_Bra | 品牌短片 | 2025 | 本地视频与封面 |
| 05 | `orbital-form` | 华为荣耀 | HR Designer | 品牌短片 | 2025 | 本地视频与封面 |
| 06 | `nocturne` | 华为 Y9 | HUAWEI Y9 | 广告 | 2024 | 本地视频与封面 |
| 07 | `morning-haze` | LOL片头 | LOL | 品牌短片 | 2025 | 本地视频与封面 |
| 08 | `echo-cuts` | 力士 | LUX | 广告 | 2025 | 本地视频与封面 |
| 09 | `glimmer-sequence` | 飞利浦 | PHILPS | 动态设计 | 2025 | 本地视频与封面 |
| 10 | `gravity-study` | QQ全世界圈着玩-穿越AR赛场 | QQ | 三维动画 | 2025 | 本地视频与封面 |
| 11 | `city-breath` | 立顿红茶 | TWININGS | 广告 | 2025 | 本地视频与封面 |
| 12 | `liquid-type` | VSL | VSL | 动态设计 | 2025 | 本地视频与封面 |
| 13 | `spectrum-memory` | 奔驰 | Smart | 三维动画 | 2025 | 本地视频与封面 |
| 14 | `outline-of-wind` | 大众CC | CC | 三维动画 | 2025 | 本地视频与封面 |
| 15 | `pixel-tides` | 冈本_神诞树 | OKAMOTO | 动态设计 | 2025 | 本地视频与封面 |
| 16 | `night-signal` | 杰士邦 | JSB | 动态设计 | 2025 | 本地视频与封面 |
| 17 | `loop-garden` | 仁孚 | Zung FU | 动态设计 | 2025 | 本地视频与封面 |
| 18 | `silent-ad` | 小电视形象展示 | TV | 广告 | 2024 | 本地视频与封面 |
| 19 | `material-study` | 材质实验 | Material Study | 三维动画 | 2025 | 远程占位视频 |
| 20 | `last-frame` | 最后一帧 | Last Frame | 广告 | 2026 | 远程占位视频 |

标题拼写和品牌名称若需修正，应先改 CSV，再重新生成，不要只修页面显示。

## 7. 视频与图片资源

### 7.1 首屏交互视频

代码常量集中位于 `app/hero-media.ts`，`portfolio-home.tsx` 与首页 Loading 共用，媒体工作台也会更新这里的缓存版本：

```ts
const HERO_VIDEO_1080P_SRC = "/media/projects/%E4%B8%BB%E9%A1%B5_scrub_1080p.mp4?...";
const HERO_VIDEO_720P_SRC = "/media/projects/%E4%B8%BB%E9%A1%B5_scrub_720p.mp4?...";
```

实际文件：

```text
public/media/projects/主页_scrub_1080p.mp4
public/media/projects/主页_scrub_720p.mp4
```

首屏海报：

```text
public/media/posters/home-hero.avif
public/media/posters/home-hero.webp
```

替换首屏视频时：

1. 同时提供 1920×1080 与 1280×720 两套 8-bit、浏览器兼容 H.264 素材。
2. 为滚轮拖动优化关键帧间隔，当前两套素材均使用 GOP 2、24fps、无 B 帧。
3. 使用 `faststart`，把 MP4 moov atom 移到文件开头。
4. 更新 `HERO_VIDEO_1080P_SRC` 与 `HERO_VIDEO_720P_SRC` 查询参数以破除 CDN 缓存。
5. 从新视频生成匹配的 AVIF/WebP 首帧或代表帧海报。
6. 不要把首屏改回自动播放，也不要恢复鼠标左右控制。

当前滚轮 seek 逻辑：

- 滚动进度映射到 `duration - 0.05`。
- 活跃滚动期间约每 34ms 合并一次输入，只处理最新目标时间，不再逐段追赶旧目标。
- 大跨度跳转优先使用 `fastSeek()`；滚动停止约 96ms 后再执行一次精确 seek。
- 通过 `requestVideoFrameCallback()` 确认新画面已经提交；不支持时使用 `seeked` 事件降级。
- 小屏、低内存、低核心数、节流网络或开启省流量的设备自动使用 720p，其余设备使用 1080p。
- 视频保持暂停，依靠 `currentTime` 更新画面。
- 首页 Loading 会把选中的 1080p/720p 文件完整缓存为 Blob 并解码首帧；滚轮交互复用该内存地址，网络/解码失败时才回退到首次滚动后按需请求。
- 首屏可见时，全局 DotField 暂停，只保留首屏自身的一层 Canvas，避免双层重绘争用资源。

### 7.2 Showreel

独立文件：

```text
public/media/showreel/LIUKER_Showreel_2026_web.mp4
```

它只在 `ShowreelModal` 打开时出现在 DOM 中，使用 `preload="metadata"` 并尝试自动播放。不要把 Showreel 与首屏滚轮素材合并为同一交互。

### 7.3 项目视频与封面

- 项目视频位于 `public/media/projects/`。
- 封面位于 `public/media/projects/photo/`，每张通常同时提供 `.avif` 和 `.webp`。
- 当前项目 1–18 主要使用本地视频；项目 19、20 仍有远程 Pexels 占位视频。
- 视频、图片和代码中的路径必须保持一致；带空格和中文的文件名可以工作，但新增素材建议使用稳定的 ASCII 名称以减少部署平台差异。
- 所有视频由 Git LFS 追踪。克隆后若缺素材，运行 `git lfs pull`。

### 7.4 新视频入库规范

- 原始母版保存在工作盘或归档盘，不直接放入 `public/`。母版可以是 ProRes、DNxHR 或其他高质量 10-bit 格式。
- 运行 `npm run media:prepare -- --input "D:\\Footage\\master.mov" --slug project-name`，自动生成：
  - `project-name-preview.mp4`：720p、默认 8 秒、静音预览。
  - `project-name-full.mp4`：1080p 完整视频与 AAC 音频。
  - `photo/project-name.webp` 和可用时的同名 AVIF 封面。
- 网页 MP4 统一为 H.264 High、8-bit `yuv420p`、24–30fps、faststart；不要直接把 H.264 High 10 / `yuv420p10le` 当作唯一网页素材。
- 常规完整视频 GOP 约 2 秒即可；只有首屏滚轮素材需要 GOP 2、无 B 帧的高密度关键帧版本。
- `preview_video` 必须指向短小的独立预览文件，不再与 `full_video` 共用长视频。
- AV1、VP9 或 HEVC 可在未来作为额外高清源，但必须保留 8-bit H.264 MP4 回退。
- 入库后运行 `npm run media:audit`。当前历史素材中仍有一批 10-bit H.264，后续应使用此流程逐项迁移，不要直接覆盖母版。
- 当视频数量或访问量继续增长时，把网页版本迁移到 Vercel Blob、OSS、R2 或视频 CDN；CSV 已支持 HTTPS 绝对地址，Git LFS 继续只承担源文件版本管理。

## 8. 性能与生命周期约束

这些优化是之前为解决卡顿和无法播放问题加入的，修改时必须保留：

### 8.1 按需加载

- 首页 Loading 只预载首屏关键视频、海报和字体；不会预载 Showreel 或 20 个项目视频。
- 首屏视频按设备能力选择 1080p/720p，完整缓存并解码首帧后进入；超过安全时限自动回退到流式按需加载。
- 项目预览 `<video>` 使用 `preload="none"`，桌面悬停时才设置 `src`。
- 项目卡离开视口后暂停视频、移除 `src` 并 `load()` 释放解码资源。
- 同一时间只允许一个预览视频播放。
- Showreel 只在点击后挂载。
- 项目弹窗和详情页主视频使用 `preload="metadata"`。
- 详情页视频通过 `LazyVideo` 在接近视口时才设置 `src`；离开视口后暂停，装饰预览会释放解码资源。
- 详情页第二个媒体画面使用懒加载封面，不再同时解码两路重复预览视频。

### 8.2 Canvas/WebGL 懒初始化

`ViewportMount` 使用 `IntersectionObserver`：

- `InfiniteMenu`、`Orb`、`Lanyard` 通过 `React.lazy` 动态导入。
- 第一次进入视口才挂载。
- 离开视口时不卸载 DOM，但把 `active=false` 传给组件，使动画暂停。
- `Orb` 停止 `requestAnimationFrame`。
- `InfiniteMenu` 停止渲染循环。
- `Lanyard` 将 R3F `frameloop` 切换为 `never`。

### 8.3 可访问性和降级

- 所有持续动画应尊重 `prefers-reduced-motion`。
- DotField 在页面不可见、离开视口或系统要求减少动画时停止循环。
- 弹窗必须支持 Escape 关闭；项目视频弹窗包含基本焦点循环。
- 键盘可操作按钮和链接必须保留 `aria-label` / `aria-pressed` / `role="dialog"`。
- 移动设备没有 hover，不应主动加载悬停预览视频。

## 9. 开发环境文字编辑

`app/portfolio-home.tsx` 中：

```ts
const CONTENT_EDITING_ENABLED = process.env.NODE_ENV === "development";
```

行为：

- 只有 `npm run dev` 的开发环境允许直接编辑 About、Experience、Toolkit、Capabilities 和 Contact 的部分文字。
- 编辑结果写入浏览器 `localStorage`，只是当前设备的临时草稿，不会自动写回源代码。
- 生产构建不输出 `contentEditable`、编辑按钮或双击编辑事件。
- 永久修改必须更新 `app/content.ts` 或相关 JSX，然后重新构建和部署。
- 时间线条目使用 `liuker-experience-v2-*` 键，版本号用于避免旧草稿覆盖新的源内容。

不要为了方便而在生产环境重新开启编辑。这是明确的产品要求。

## 10. 主要组件职责

| 组件 | 位置 | 用途 |
|---|---|---|
| `ClickSpark` | `app/components/ClickSpark.tsx` | 全页点击火花 Canvas |
| `DotField` | `app/components/DotField.tsx` | 全局和首屏点阵鼠标互动 |
| `GlassSurface` | `app/components/GlassSurface.tsx` | 语言切换玻璃材质 |
| `GradientText` | `app/components/GradientText.tsx` | 首屏 SHOWREEL 渐变流动文字 |
| `InfiniteMenu` | `app/components/InfiniteMenu.tsx` | WebGL2 球形 20 项目菜单 |
| `Masonry` | `app/components/Masonry.tsx` | 20 个作品卡片与 MagicBento 风格互动 |
| `Orb` | `app/components/Orb.tsx` | About 区 OGL 动态背景 |
| `TextPressure` | `app/components/TextPressure.tsx` | About 标题字体压力 |
| `VariableProximity` | `app/components/VariableProximity.tsx` | About 正文字体邻近变化 |
| `StaggeredMenu` | `app/components/StaggeredMenu.tsx` | 右侧分层抽屉导航 |
| `Lanyard` | `app/components/Lanyard.tsx` | Contact 区物理挂绳卡片 |

这些组件已针对当前页面改造，不应直接用 React Bits 最新示例源码整段覆盖，否则会丢失 TypeScript 类型、生命周期暂停、当前样式和性能修复。

## 11. 主题、语言和视觉系统

- 主题保存在 `localStorage['portfolio-theme']`，值为 `dark` 或 `light`。
- 语言保存在 `localStorage['portfolio-language']`，值为 `zh` 或 `en`。
- `app/layout.tsx` 在 React hydration 前注入主题，避免首屏闪烁。
- CSS 变量集中在 `app/globals.css` 的 `:root` 与 `:root[data-theme="light"]`。
- 主要强调色：紫红 `#b600a8` 与橙色 `#ff6a00`。
- 页面最大宽度：`1600px`。
- 首屏和联系区允许全宽沉浸式布局；内容区通常使用 `.container-wide`。
- 响应式断点主要为 900px 和 640px。
- 新增视觉效果时优先复用现有颜色、圆角、描边和渐变，不要引入第三套品牌风格。

## 12. 常用开发流程

首次克隆：

```bash
git lfs install
git lfs pull
npm install
```

开发预览：

```bash
npm run dev
```

同步项目清单：

```bash
npm run content:sync
```

准备新视频（批量工作台，推荐）：

```bash
npm run media:studio
```

启动本地媒体工作台 `http://127.0.0.1:4178`，批量导入母版、自动转换、自动更新 CSV 和网站数据。工作台只在本机运行，不会部署到线上；所有操作失败时自动回滚，不会破坏旧数据。同 slug 默认只更新视频和封面并保留已有项目资料，只有主动开启“覆盖已有项目资料”才会更新文案与状态。

工作台中的“替换网站现有视频”面板可直接选择已有项目、首屏交互视频或 Showreel：项目替换会锁定并保留原有标题、分类、顺序和状态；首屏替换会自动生成滚轮交互专用的 1080p/720p 视频和 AVIF/WebP 海报，并刷新缓存版本；Showreel 替换会生成带 AAC 音频的 1080p 网页版本。替换前会创建回滚备份，只有转码、校验和数据同步全部成功后才覆盖正式文件。

Windows 用户可以把工作台安装成当前账户的本地快捷应用：

```bash
npm run media:studio:install
```

安装后可从桌面的 `LIUKER Media Studio.cmd` 或开始菜单打开应用。启动器会复用已有工作台，或在后台仅绑定 `127.0.0.1:4178` 启动服务，并优先使用 Edge/Chrome 独立应用窗口。开始菜单同时提供 Stop 和 Uninstall；它不设置开机自启。安装器把兼容的 Node 运行时固定在被 `.gitignore` 忽略的 `.media-studio/runtime/`，因此系统 Node 升级或 Codex 退出不会影响下次打开。快捷方式只适用于当前项目绝对路径；项目移动后需重新运行安装命令。

准备新视频（命令行，单个项目）：

```bash
npm run media:prepare -- --input "D:\\Footage\\project-master.mov" --slug project-name
npm run media:audit
```

类型检查：

```bash
npx tsc --noEmit --pretty false
```

vinext/Sites 构建：

```bash
npm run build
```

Vercel 使用的 Next.js 构建：

```bash
npm run content:sync
npx next build
```

代码检查：

```bash
npm run lint
```

注意：`tests/rendered-html.test.mjs` 仍然是 starter skeleton 的旧测试，与当前产品不一致。不要把 `npm test` 失败直接判断为当前页面回归；应先重写该测试，再恢复它作为发布门槛。

## 13. 部署流程

### GitHub + Vercel（当前主流程）

1. 完成修改。
2. 运行 `npm run content:sync`（若项目 CSV 有变化）。
3. 运行 TypeScript 检查和构建。
4. 检查 `git diff`，不要提交 `dist/`、`outputs/`、`.next/`、`.vinext/`。
5. 提交并推送 `main`。
6. Vercel 自动开始部署。
7. 访问线上 URL 并核对新内容；需要绕过 CDN 缓存时，可临时添加查询参数。

### ChatGPT Sites

- 项目已绑定 `.openai/hosting.json` 中的现有项目，不允许重复创建。
- Sites 使用 vinext/Cloudflare Worker 构建输出。
- 当前 `dist` 约 470 MB，主要由视频组成；上传 Sites 构建包可能在 60 秒文件上传限制下失败。
- 在解决对象存储/CDN 迁移前，Vercel 是更可靠的公开站点。

## 14. 已知问题与技术债

1. `README.md` 和 `content/README.md` 在部分 Windows 终端中会出现中文编码乱码，应统一检查并保存为 UTF-8。
2. `tests/rendered-html.test.mjs` 是旧 starter 测试，尚未适配 LIUKER 页面。
3. 详情页的 20 个项目仍复用 6 套 demo 案例文案，真实经历需要逐项补全。
4. 项目 19、20 仍使用远程 Pexels 视频占位。
5. 联系区没有真实邮箱、社交媒体或招聘入口。
6. Showreel 文件约 78 MB，首次点击仍可能受网络影响；后续建议转移到视频 CDN 或对象存储并提供多码率版本。
7. Git LFS 适合作为源文件版本管理，但不应长期承担面向所有访客的视频分发。
8. 多个本地项目文件名含空格和中文；未来批量素材更新建议统一安全命名规则。
9. 当前项目同时支持 Next/Vercel 与 vinext/Sites 两条构建路径；修改框架配置时必须同时验证，不能只保证其中一条。
10. 当前历史项目中仍有多条 H.264 High 10 / 10-bit 文件，部分浏览器可能转为软件解码或无法播放；使用 `npm run media:audit` 查看清单并逐项迁移。

## 15. 后续优先级建议

### P0：内容真实性

- 替换 About 占位介绍。
- 为 20 个项目补齐真实职责、时长、Challenge、Process、Result 和工具。
- 配置真实联系方式。

### P1：媒体分发

- 将视频迁移到 OSS、R2、Vercel Blob 或专业视频 CDN。
- 根据桌面/移动端提供不同码率。
- 为首屏滚轮视频保留密集关键帧版本。
- 为 Showreel 提供更轻的首播版本和可选高清版本。

### P2：质量保障

- 重写渲染测试，覆盖首页核心区块、20 个项目和生产环境不可编辑。
- 增加首屏视频加载失败和 WebGL2 不支持时的视觉降级。
- 加入 Lighthouse/真实设备性能基线。

### P3：内容维护体验

- 将本地可编辑草稿增加“导出 JSON/CSV”能力，避免只能保存在 localStorage。
- 或引入轻量 CMS，但不要在没有明确需求时增加数据库和登录系统。

## 16. 常见修改指南

### 修改经历文字

编辑 `app/content.ts` 的 `siteContent.experience`，同时维护中英文。不要只在浏览器开发模式里编辑，因为 localStorage 草稿不会进入部署。

### 批量替换项目视频

1. 保留工作盘中的原始母版，不要把母版直接作为网页文件。
2. 推荐打开媒体工作台的“替换网站现有视频”，选择“作品项目”和目标项目，再上传单个高质量母版。
3. 工作台自动生成 preview/full/WebP/AVIF，保留项目原有文案与顺序，并执行内容同步和媒体审计。
4. 如使用命令行，则运行 `npm run media:prepare`，手动更新 CSV 后再运行 `npm run content:sync` 与 `npm run media:audit`。
5. 构建并检查 Git LFS 是否追踪新增视频。

### 替换首屏滚轮视频

推荐在媒体工作台中选择“首屏交互视频”并上传一个母版；工作台会生成 1080p/720p 两套密集关键帧视频、更新海报和缓存版本。不要走 CSV，也不要改变“最新目标合并 + 停止后精确定位”的滚轮 seek 逻辑。

### 替换 Showreel

推荐在媒体工作台中选择 `Showreel` 并上传一个带音频母版；工作台会替换 `public/media/showreel/LIUKER_Showreel_2026_web.mp4` 并刷新缓存版本。必要时仍需手动更新 `ShowreelModal` 的展示时长。

### 增加或删除项目

- 更新 CSV 的 `order`、`slug` 和 `enabled`。
- 当前 UI 主要按 `projects.slice(0, 20)` 展示；若超过 20 个，需要明确决定 InfiniteMenu 和 Masonry 的展示上限。
- 删除项目时检查旧详情 URL 和“下一项目”循环。

## 17. 修改时不要破坏的产品约束

- 不要恢复 SplashCursor 流体光迹。
- 不要用鼠标左右移动控制首屏视频。
- 不要让首屏视频自动从头播放。
- 不要让 Showreel 在页面加载时预载完整视频。
- 不要在生产环境开放文字编辑。
- 不要让 Orb、InfiniteMenu、Lanyard 离开视口后继续满帧运行。
- 不要直接覆盖改造后的 React Bits 组件。
- 不要手改生成文件 `app/project-rows.generated.ts`。
- 不要把大视频从 Git LFS 改回普通 Git blob。
- 不要删除 `.openai/hosting.json` 或更换其 `project_id`。
- 不要在没有明确授权时推送、发布或改动线上配置。

## 18. 完成修改后的检查清单

- [ ] 中文和英文都能正常显示。
- [ ] 深色和浅色主题都可读。
- [ ] 桌面与手机布局没有横向溢出。
- [ ] 首页 Loading 能显示真实进度，首屏视频/海报/字体就绪后平滑退出；异常网络下不超过安全时限并能流式降级。
- [ ] 滚轮可以平滑地向前和向后控制首屏视频。
- [ ] Showreel 仅点击后加载，可关闭并停止播放。
- [ ] InfiniteMenu 可拖拽并能打开正确项目。
- [ ] Masonry 显示正确数量、封面和项目标题。
- [ ] About 字体互动存在，Orb 离开视口会暂停。
- [ ] 经历时间线文字与源数据一致。
- [ ] Lanyard 可拖拽，离开视口会暂停。
- [ ] 生产构建不包含编辑按钮或 `contenteditable`。
- [ ] `npm run content:sync`、TypeScript 检查和构建通过。
- [ ] Git LFS 包含新增/替换的视频。
- [ ] 若任务包含发布，GitHub 与 Vercel 页面已核对。

## 19. 新接手者最短启动路径

```bash
git clone https://github.com/HAHA-lh/Liuker_portfolio.git
cd Liuker_portfolio
git lfs install
git lfs pull
npm install
npm run dev
```

随后按这个顺序阅读：

1. `AGENTS.md`
2. `app/portfolio-home.tsx`
3. `app/content.ts`
4. `content/projects.csv`
5. `app/globals.css`
6. 需要修改的具体 `app/components/*`

若只是更换内容，优先改数据和素材；若只是调整样式，优先改 `globals.css`；只有在交互行为确实需要变化时，才修改 WebGL/Three/OGL 组件。
