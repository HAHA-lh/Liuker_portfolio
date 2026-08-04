# LIUKER 作品素材批量更新

`projects.csv` 是网站作品区的素材清单，可以直接使用 Excel 打开和编辑。

1. 将视频和封面复制到 `public/media/projects/`。
2. 在表格中填写路径，例如 `/media/projects/01-preview.mp4`。
3. 保存为 **CSV UTF-8（逗号分隔）**，不要修改第一行字段名称。
4. 运行 `npm run content:sync`；启动预览或正式构建时也会自动同步。

字段说明：

- `order`：显示顺序。
- `slug`：作品网址标识，只使用小写字母、数字和连字符。
- `template_slug`：详情文案模板，可选 `afterglow`、`neon-pulse`、`quiet-tides`、`kinetic-type`、`orbital-form`、`nocturne`。
- `preview_video`：首页悬停预览视频。
- `full_video`：播放弹窗与详情页完整视频。
- `cover`：作品封面，建议 WebP。
- `visual`：没有封面时使用的 CSS 渐变，可留空沿用模板。
- `featured`：是否标记为精选，填写 `TRUE` 或 `FALSE`。
- `enabled`：是否显示，填写 `TRUE` 或 `FALSE`。

推荐素材命名：`01-preview.mp4`、`01-full.mp4`、`01-cover.webp`。
