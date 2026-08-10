# LIUKER 批量视频工作台——豆包接手任务

> 请把本文件连同整个项目目录一起交给豆包。豆包开始修改前必须先完整阅读根目录 `AGENTS.md`。
>
> 当前工作尚未提交、推送或部署。请先完成本地验证，不要自动操作 GitHub/Vercel。

## 一、用户最终需求

把现有命令行流程：

```powershell
npm run media:prepare -- --input "I:\素材\project.mov" --slug project-name
npm run content:sync
npm run media:audit
```

封装成一个可视化的本地应用。用户以后希望：

1. 一次拖入或选择多个高质量视频母版。
2. 批量填写项目标题、slug、分类、年份、职责和详情模板。
3. 自动排队生成：
   - `<slug>-preview.mp4`
   - `<slug>-full.mp4`
   - `<slug>.webp`
   - `<slug>.avif`
4. 转码成功后自动更新 `content/projects.csv`。
5. 自动运行 `content:sync`，使首页卡片和详情页直接获得新素材。
6. 自动运行媒体审查并在界面中显示结果。
7. 失败时不能破坏旧素材、旧 CSV 或生成数据。

## 二、安全与架构约束

不要把 FFmpeg、文件写入或 CSV 修改接口放进 `app/api`、Server Action、Vercel 或 Cloudflare Worker。

原因：

- 项目同时使用 Next/Vercel 与 vinext/Cloudflare Worker。
- 生产运行时无法访问用户的 `I:` 盘。
- 大视频会超过线上函数上传大小和执行时间限制。
- Node `child_process` 和本机文件系统不适合 Cloudflare Worker。

正确架构是独立本地工具：

```text
npm run media:studio
        ↓
http://127.0.0.1:4178
        ↓
本机上传暂存 → FFmpeg 转码 → 结果验证 → 原子更新网站文件
```

必须保留：

- 只监听 `127.0.0.1`。
- 随机会话令牌。
- 同源检查。
- 客户端不能传任意输出路径。
- FFmpeg 使用参数数组，禁止 `shell: true`。
- 运行态文件全部放在已忽略的 `.media-studio/`。
- 不自动 commit、push 或 deploy。

## 三、已经完成的代码

### 1. 工作台启动入口

`package.json` 已增加：

```json
"media:studio": "node tools/media-studio/server.mjs"
```

`.gitignore` 已增加：

```text
/.media-studio/
```

### 2. 本地服务端

已新增：

```text
tools/media-studio/server.mjs
tools/media-studio/projects-csv.mjs
```

目前实现了：

- `GET /`：工作台页面。
- `GET /api/status`：FFmpeg/FFprobe 状态和队列状态。
- `GET /api/jobs`：转码任务列表。
- `GET /api/projects`：读取当前 CSV 项目。
- `POST /api/upload`：原始文件流上传。
- `POST /api/audit`：运行媒体审查。
- 上传文件写入 `.media-studio/uploads/`。
- 单并发串行转码，避免多个 FFmpeg 同时抢占 CPU/硬盘。
- 隔离目录生成 Preview、Full、WebP、AVIF。
- 发布前验证 H.264、8-bit `yuv420p`、尺寸和帧率。
- 转码成功后才移动到 `public/media/projects/`。
- CSV 使用临时文件重命名。
- CSV/内容同步失败时尝试恢复旧 CSV 与旧媒体。
- 任务完成后自动运行媒体审查。

### 3. 本地工作台界面

已新增：

```text
tools/media-studio/public/index.html
tools/media-studio/public/styles.css
tools/media-studio/public/app.js
```

界面包含：

- 批量拖放和文件选择。
- 每个文件可编辑 slug、中文标题、英文标题。
- 批次默认分类、年份、职责、模板、预览起点和时长。
- XHR 上传进度。
- 转码任务阶段和错误信息。
- 网站项目列表。
- 媒体审查报告。
- 本地网站预览链接。
- 响应式和 `prefers-reduced-motion`。

### 4. 媒体读取降级

联调时发现这台机器可以运行：

```text
C:\Windows\System32\ffmpeg.exe
```

但普通终端找不到 `ffprobe.exe`。

因此已新增：

```text
scripts/lib/media-probe.mjs
```

它的策略：

1. 如果有 FFprobe，优先读取 FFprobe JSON。
2. 如果没有 FFprobe，自动解析 `ffmpeg -i` 输出。
3. fallback 已用 `主页_scrub_720p.mp4` 验证，正确读到：
   - H.264 High
   - 1280×720
   - yuv420p
   - 24fps
   - 9.13 秒
4. `media:audit` 在强制缺失 FFprobe 的情况下仍能完成，结果仍为：
   - 5 个通过
   - 17 个旧素材需要处理

以下脚本已经改为支持 `FFMPEG_PATH` / `FFPROBE_PATH` 和 fallback：

```text
scripts/prepare-video.mjs
scripts/audit-media.mjs
tools/media-studio/server.mjs
```

### 5. 首页项目数量

`app/portfolio-home.tsx` 已把 Masonry 卡片从：

```ts
projects.slice(0, 20)
```

改为：

```ts
projects
```

所以新项目会进入卡片墙和详情路由。

注意：WebGL `InfiniteMenu` 仍只展示前 20 个项目，这是有意保留的性能限制。需要在界面中向用户提示：第 21 个及之后的项目会进入卡片墙和详情页，但不会自动进入球形精选菜单。

## 四、当前停留位置

已经完成的检查：

- `server.mjs` 语法检查通过。
- `projects-csv.mjs` 语法检查通过。
- `public/app.js` 语法检查通过。
- 新增 Node/JS 文件的定向 ESLint 通过。
- 本地页面返回 HTTP 200。
- `/api/projects` 能读取 20 个项目。
- fallback 媒体探测通过。
- fallback `media:audit` 通过执行。

上一次本地服务联调发生在 fallback 加入之前，因此 `/api/status` 当时显示：

```json
{
  "ffmpeg": true,
  "ffprobe": false
}
```

这并不再是阻塞问题，因为现在应显示 `probeMode: "ffmpeg-fallback"` 并允许处理。需要重新启动服务后验证。

## 五、豆包下一步必须完成

请按顺序执行，不要跳过：

### 1. 静态检查

```powershell
node --check tools/media-studio/server.mjs
node --check tools/media-studio/projects-csv.mjs
node --check tools/media-studio/public/app.js
npx eslint tools/media-studio/server.mjs tools/media-studio/projects-csv.mjs tools/media-studio/public/app.js scripts/prepare-video.mjs scripts/audit-media.mjs --quiet
```

项目要求 Node `>=22.13.0`。如果系统 Node 是 20，请使用 Codex 工作区的 Node 24，不要降低项目版本要求。

### 2. 重启并验证工作台

```powershell
npm run media:studio
```

检查：

- 页面能打开 `http://127.0.0.1:4178`。
- `GET /api/status` 返回：
  - `ffmpeg: true`
  - `probeMode: "ffmpeg-fallback"` 或 `"ffprobe"`
- `/api/projects` 返回当前 20 个项目。
- 页面中文无乱码。
- 不带会话令牌访问 API 时返回 403。

### 3. 修复并验证前后端字段对应

客户端目前发送 snake_case：

```text
title_zh
title_en
category_zh
category_en
role_zh
role_en
template_slug
preview_start
preview_duration
```

服务端 `decodeMetadata()` 已做 camelCase 映射。请逐项核对，特别是：

- `original_name → fileName`
- `template_slug → templateSlug`
- `preview_start → previewStart`
- `preview_duration → previewDuration`
- `poster_time → posterTime`

### 4. 做一次不会污染正式内容的端到端测试

建议复制一个很短的视频到 `.media-studio/test-input/`，使用临时仓库副本或先备份：

```text
content/projects.csv
app/project-rows.generated.ts
public/media/projects/
```

验证完整流程：

1. 浏览器选择短视频。
2. 上传完成。
3. Preview/Full/WebP/AVIF 全部生成。
4. 工作台任务变成 `done`。
5. CSV 新增或更新正确行。
6. `project-rows.generated.ts` 自动刷新。
7. 本地网站能打开新详情页。
8. 测试结束后恢复正式数据并删除测试素材。

不要直接拿正式项目 slug 做破坏性测试。

### 5. 重点审查原子回滚

重点检查 `publishJob()`：

- 移动第 2/3/4 个文件失败时，第 1 个文件能恢复。
- CSV 写入后 `content:sync` 失败时，旧 CSV、旧媒体和 generated TS 都恢复。
- AVIF 生成失败时任务应失败，旧项目不能被半更新。
- 同一个 slug 连续进入两个任务时不能并发覆盖。
- Windows 同一仓库内 `rename` 可以工作；不要支持任意跨盘目标路径。

### 6. 补文档

更新：

```text
content/README.md
AGENTS.md
```

至少说明：

```powershell
npm run media:studio
```

以及：

- 工作台只在本机运行。
- 母版不会直接成为网页文件。
- 成功后自动更新 CSV 和网站数据。
- 不自动发布到 GitHub/Vercel。
- InfiniteMenu 只展示前 20 个，Masonry 展示全部项目。

### 7. 最终验证

```powershell
npm run content:sync
npx tsc --noEmit --pretty false
npm run media:audit
npm run build
npx next build
```

已知：全量 `npm run lint` 会命中 `app/portfolio-home.tsx` 里此前存在的 `react-hooks/set-state-in-effect` 错误，这不是本工作台新增问题。不要顺带大改无关编辑功能；只要定向 lint 和构建通过即可记录为已知问题。

## 六、仍需考虑但不要擅自扩展

这些属于后续增强，不是本次交付门槛：

- 32MiB 分片上传和断点续传。
- 转码任务取消按钮。
- 输出文件加入内容 hash，避免 CDN 同路径缓存。
- 整批 dry-run / confirm / apply，而不是逐个任务完成即应用。
- JSON/CSV 批量导入项目元数据。
- 自动生成多码率 HLS。
- 视频迁移到 OSS、R2、Vercel Blob 或专业视频 CDN。

如果实现这些增强，仍然不能把本机文件写入接口部署到生产环境。

## 七、完成标准

只有同时满足以下条件才能宣布完成：

- 批量选择至少 2 个视频可进入队列。
- 每个视频可以独立编辑 slug 和中英文标题。
- 串行转码可显示阶段和错误。
- 生成四类网页素材。
- 新项目或替换项目能正确更新 CSV。
- 内容同步后网站能读取新项目。
- 任一步失败不会破坏旧网站数据。
- 没有 FFprobe 时仍能使用 FFmpeg fallback。
- 生产构建不包含上传/写文件接口。
- TypeScript、vinext build、Next build 均通过。
- 未经用户明确要求，不提交、不推送、不部署。
