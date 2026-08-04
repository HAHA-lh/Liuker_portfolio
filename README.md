# LIUKER — Video Creator Portfolio

LIUKER 的个人视频创作作品集，包含首屏滚轮控制视频、20 个项目素材、无限拖拽项目菜单、交互式文字与动态背景。

## 本地预览

环境要求：Node.js `>=22.13.0`，并安装 [Git LFS](https://git-lfs.com/)。

```bash
git lfs install
npm install
npm run dev
```

打开开发服务器输出的本地地址即可预览。

## 常用操作

```bash
npm run content:sync  # 根据素材清单更新项目数据
npm run build         # 构建发布版本
npm test              # 构建并运行页面测试
npm run lint          # 代码检查
```

## 内容与素材

- `app/`：页面、组件、交互和样式
- `content/projects.csv`：项目文字与素材映射
- `public/media/projects/`：项目视频和封面图
- `public/media/showreel/`：Showreel 视频
- `scripts/sync-projects.mjs`：批量同步素材清单

视频文件通过 Git LFS 管理。首次克隆后如果视频没有自动下载，可运行：

```bash
git lfs pull
```

## 后续优化建议

1. 将线上视频迁移到对象存储或视频 CDN，GitHub 仅保留源代码与备份素材。
2. 继续压缩首屏和项目视频，提供不同清晰度与移动端版本。
3. 拆分较大的交互模块，按进入视口动态加载。
4. 接入自定义域名、访问统计与项目内容管理。

## 技术栈

React 19、vinext、TypeScript、GSAP、Three.js、OGL、gl-matrix。
