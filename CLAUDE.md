# 取色器 (Color Picker) — CLAUDE.md

## 项目概要

一个极简网页工具：上传图片 → 自动提取 6 个主色调 → 点一下复制色号。不需要后端、不需要数据库、不需要账号。

## 技术栈

- 纯 HTML/CSS/JS，单文件 `index.html`
- `color-thief` 库（CDN 引入，MIT 开源）
- PWA（manifest.json + service worker），支持「添加到桌面」
- 部署：Vercel / GitHub Pages（静态文件托管，免费）

## 文件结构

```
D:/color-picker/
  index.html          # 主文件，包含所有 HTML/CSS/JS
  manifest.json       # PWA 清单
  sw.js               # Service Worker（离线缓存）
  CLAUDE.md           # 本文件
  docs/
    superpowers/
      plans/          # 实现计划
```

## 核心原则

1. **零依赖安装** — 不引入 npm/webpack/React。就是一个 HTML 文件。
2. **纯客户端** — 图片不上传任何服务器，所有处理在浏览器本地完成。
3. **极简交互** — 上传 → 看到颜色 → 点击复制。没有多余步骤。
4. **移动端优先** — 触屏友好，PWA 可安装。

## 已知约束

- 开发者设备：Vivo Android + Windows（联想 Yoga）
- 测试方式：Windows 上 `npx serve` 起本地服务器 → Vivo 同 WiFi 下访问
- 不使用 AI API、不调用任何外部服务
- 不收集数据、不使用 Cookie、不加统计代码

## 代码风格

- 无注释（代码即文档）
- CSS 变量管理颜色
- Vanilla JS，无框架
- 移动端优先的响应式设计
