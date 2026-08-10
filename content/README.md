# LIUKER 作品素材批量更新

`projects.csv` 是作品区的权威素材清单，可直接使用 Excel 编辑。源工程和高码率母版不要放入 `public/`；网站只保存经过压缩的网页版本。

## 推荐流程：可视化工作台（推荐）

批量导入多个母版、自动转换并更新网站数据，请使用本地媒体工作台：

```bash
npm run media:studio
```

工作台会在 `http://127.0.0.1:4178` 启动，提供以下功能：

- 批量拖入或选择多个视频母版
- 每个视频独立设置 slug、中英文标题
- 批量设置分类、年份、职责、详情模板、预览参数
- 自动串行转码，实时显示进度和错误
- 成功后自动更新 `projects.csv` 和网站数据
- 内置媒体规范检查

**重要说明：**
- 工作台只在本机运行，不会部署到线上
- 原始母版不会直接成为网页文件，只会生成标准网页素材
- 所有更新失败时会自动回滚，不会破坏旧素材和旧数据
- 同 slug 默认只替换视频与封面，保留已有标题、分类、年份、模板、精选和启用状态；只有主动勾选“覆盖已有项目资料”才会更新这些字段
- 不会自动提交、推送或部署到 GitHub/Vercel
- 第 21 个及之后的项目会进入卡片墙和详情页，但不会自动进入球形精选菜单（InfiniteMenu 只展示前 20 个）

## 推荐流程：命令行（单个项目）

单个项目也可以使用命令行工具：

1. 把剪辑母版保存在工作盘，可使用 ProRes、DNxHR 或高质量 H.264/H.265。
2. 运行：

   ```bash
   npm run media:prepare -- --input "D:\Footage\project-master.mov" --slug project-name
   ```

3. 工具会生成：

   - `/media/projects/project-name-preview.mp4`：720p、8 秒、静音悬停预览。
   - `/media/projects/project-name-full.mp4`：1080p 完整视频。
   - `/media/projects/photo/project-name.webp`：通用封面。
   - `/media/projects/photo/project-name.avif`：更轻封面（本机 FFmpeg 支持时）。

4. 把命令输出的路径填入 `projects.csv`。
5. 运行 `npm run content:sync`。
6. 运行 `npm run media:audit`，确认没有 10-bit H.264、超高帧率或缺少 faststart 的文件。

## projects.csv 字段

- `order`：显示顺序。
- `slug`：详情页标识，只允许小写字母、数字和连字符。
- `template_slug`：详情文案模板。
- `preview_video`：首页悬停预览，必须使用短小的 720p 网页版本。
- `full_video`：播放弹窗和详情页的完整视频。
- `cover`：封面路径，推荐 WebP，并同时保留同名 AVIF。
- `visual`：没有封面时使用的 CSS 渐变。
- `featured` / `enabled`：填写 `TRUE` 或 `FALSE`。

保存 Excel 导出的 CSV 时选择 **CSV UTF-8（逗号分隔）**。不要手改 `app/project-rows.generated.ts`。

## 网页交付格式

| 用途 | 建议格式 |
|---|---|
| 完整视频 | MP4 / H.264 High / 8-bit `yuv420p` / 1080p / 24–30fps / AAC 160kbps / faststart |
| 悬停预览 | MP4 / H.264 High / 8-bit `yuv420p` / 720p / 6–10 秒 / 无音频 / faststart |
| 首屏滚轮视频 | 独立 1080p + 720p；GOP 2、无 B 帧、8-bit H.264 |
| 封面 | AVIF + WebP，尺寸与视频比例一致 |
| 原始母版 | ProRes / DNxHR / 高质量 10-bit 文件，仅归档，不直接用于网页 |

不要只提供 H.265/HEVC、10-bit H.264 或 AV1。它们可以作为额外高清源，但当前网站仍应保留 8-bit H.264 MP4 作为通用回退。
