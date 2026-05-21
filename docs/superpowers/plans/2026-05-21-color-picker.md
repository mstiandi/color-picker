# 取色器 (Color Picker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个单文件网页工具：用户上传图片，自动提取 6 个主色调并显示色号，点击色号即复制到剪贴板。

**Architecture:** 纯前端单页面应用。HTML 提供上传区和色块展示区，CSS 使用变量体系管理样式，JS 通过 color-thief (CDN) 提取颜色，navigator.clipboard API 实现复制。PWA 支持离线访问和添加到桌面。

**Tech Stack:** HTML5, CSS3 (变量 + Flexbox), Vanilla JS (ES6+), color-thief@2.4.0 (CDN), Service Worker API

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `index.html` | 主文件，内嵌所有 HTML/CSS/JS。上传区、色块列表、复制逻辑。 |
| `manifest.json` | PWA 清单，定义桌面图标、全屏模式、主题色 |
| `sw.js` | Service Worker，缓存静态资源实现离线可用 |
| `CLAUDE.md` | 项目上下文（已创建） |

---

## 接口定义

### 颜色数据结构

```js
// color-thief.getPalette() 返回格式
[
  [242, 108, 89],   // [r, g, b]
  [138, 69, 19],
  // ... 6 items total
]

// 内部使用格式
{ hex: "#F26C59", rgb: [242, 108, 89] }
```

### 核心函数签名

```js
function rgbToHex(r, g, b)           // [242,108,89] → "#F26C59"
function extractColors(imageElement) // <img> → [{hex, rgb}, ...] (6 items)
function renderPalette(colors)       // [{hex, rgb}, ...] → DOM 更新
function copyColor(hex)              // "#F26C59" → clipboard
function handleFile(file)            // File → 验证 → extractColors → renderPalette
```

---

### Task 1: 项目骨架 — HTML 结构与 CSS 样式

**Files:**
- Create: `D:/color-picker/index.html`

- [ ] **Step 1: 创建 index.html 并写入完整 HTML 骨架**

写入以下内容到 `index.html`:

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#1a1a2e">
  <title>取色器 - 一键提取配色灵感</title>
  <link rel="manifest" href="manifest.json">
  <style>
    :root {
      --bg: #fafafa;
      --card: #ffffff;
      --text: #1a1a2e;
      --text-secondary: #666;
      --border: #e0e0e0;
      --accent: #1a1a2e;
      --shadow: 0 2px 12px rgba(0,0,0,0.06);
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      padding: 24px 16px 48px;
    }

    .app {
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .header {
      text-align: center;
      padding-top: 16px;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .header p {
      font-size: 14px;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    .drop-zone {
      border: 2px dashed var(--border);
      border-radius: 16px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      background: var(--card);
      box-shadow: var(--shadow);
    }

    .drop-zone:hover,
    .drop-zone.dragover {
      border-color: var(--accent);
      background: #f5f5f5;
    }

    .drop-zone .icon {
      font-size: 40px;
      margin-bottom: 8px;
    }

    .drop-zone .hint {
      font-size: 15px;
      color: var(--text-secondary);
    }

    .drop-zone .sub-hint {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }

    .drop-zone input[type="file"] {
      display: none;
    }

    .preview-area {
      display: none;
      text-align: center;
    }

    .preview-area.visible {
      display: block;
    }

    .preview-area img {
      max-width: 100%;
      max-height: 300px;
      border-radius: 12px;
      object-fit: contain;
      box-shadow: var(--shadow);
    }

    .palette {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .color-card {
      background: var(--card);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: var(--shadow);
      cursor: pointer;
      transition: transform 0.15s;
    }

    .color-card:active {
      transform: scale(0.96);
    }

    .color-card .swatch {
      height: 80px;
      transition: opacity 0.2s;
    }

    .color-card .info {
      padding: 10px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
    }

    .color-card .hex {
      font-size: 13px;
      font-weight: 600;
      font-family: "SF Mono", "Fira Code", monospace;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .color-card .rgb {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .copied-toast {
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent);
      color: #fff;
      padding: 10px 24px;
      border-radius: 20px;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s;
      pointer-events: none;
      z-index: 10;
    }

    .copied-toast.show {
      opacity: 1;
    }

    .actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s;
    }

    .btn:active {
      opacity: 0.7;
    }

    .btn-primary {
      background: var(--accent);
      color: #fff;
    }

    .btn-secondary {
      background: var(--card);
      color: var(--text);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
    }
  </style>
</head>
<body>
  <div class="app">
    <div class="header">
      <h1>取色器</h1>
      <p>上传图片，自动提取配色方案</p>
    </div>

    <div class="drop-zone" id="dropZone">
      <div class="icon">🎨</div>
      <div class="hint">点击上传或拖拽图片到此处</div>
      <div class="sub-hint">支持 JPG / PNG / WebP</div>
      <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp">
    </div>

    <div class="preview-area" id="previewArea">
      <img id="previewImage" alt="预览">
    </div>

    <div class="palette" id="palette"></div>

    <div class="actions" id="actions" style="display:none;">
      <button class="btn btn-primary" id="copyAllBtn">复制全部色号</button>
      <button class="btn btn-secondary" id="resetBtn">重新上传</button>
    </div>
  </div>

  <div class="copied-toast" id="toast"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/color-thief/2.4.0/color-thief.umd.js"></script>
  <script>
    // JS logic — see Task 2
  </script>
</body>
</html>
```

- [ ] **Step 2: 验证 HTML 在浏览器中正常显示**

运行: `start D:/color-picker/index.html`
验证: 页面正常渲染，上传区可见，标题「取色器」居中显示。无 console 错误。

---

### Task 2: 颜色提取与渲染逻辑

**Files:**
- Modify: `D:/color-picker/index.html` — 替换 `<script>` 标签中 "// JS logic — see Task 2" 部分

- [ ] **Step 1: 写入完整的 JavaScript 逻辑**

将 `index.html` 中的 `<script>` 标签内容（`// JS logic — see Task 2` 所在位置）替换为以下代码：

```js
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const previewImage = document.getElementById('previewImage');
const palette = document.getElementById('palette');
const actions = document.getElementById('actions');
const toast = document.getElementById('toast');
const copyAllBtn = document.getElementById('copyAllBtn');
const resetBtn = document.getElementById('resetBtn');

const colorThief = new ColorThief();
let currentColors = [];

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 1500);
}

async function copyColor(hex) {
  try {
    await navigator.clipboard.writeText(hex);
    showToast('已复制 ' + hex.toUpperCase());
  } catch {
    const ta = document.createElement('textarea');
    ta.value = hex.toUpperCase();
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('已复制 ' + hex.toUpperCase());
  }
}

function renderPalette(colors) {
  currentColors = colors;
  palette.innerHTML = '';
  colors.forEach(c => {
    const card = document.createElement('div');
    card.className = 'color-card';
    card.onclick = () => copyColor(c.hex);

    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.background = c.hex;

    const info = document.createElement('div');
    info.className = 'info';

    const hexSpan = document.createElement('span');
    hexSpan.className = 'hex';
    hexSpan.textContent = c.hex.toUpperCase();

    const rgbSpan = document.createElement('span');
    rgbSpan.className = 'rgb';
    rgbSpan.textContent = `rgb(${c.rgb.join(', ')})`;

    info.appendChild(hexSpan);
    info.appendChild(rgbSpan);
    card.appendChild(swatch);
    card.appendChild(info);
    palette.appendChild(card);
  });
  actions.style.display = 'flex';
}

function handleFile(file) {
  if (!file || !file.type.match(/^image\/(jpeg|png|webp)$/)) {
    showToast('请上传 JPG、PNG 或 WebP 格式的图片');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      try {
        const rawPalette = colorThief.getPalette(img, 6);
        const colors = rawPalette.map(([r, g, b]) => ({
          hex: rgbToHex(r, g, b),
          rgb: [r, g, b]
        }));
        previewImage.src = e.target.result;
        previewArea.classList.add('visible');
        dropZone.style.display = 'none';
        renderPalette(colors);
      } catch {
        showToast('无法提取颜色，请尝试其他图片');
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function reset() {
  currentColors = [];
  palette.innerHTML = '';
  previewArea.classList.remove('visible');
  previewImage.src = '';
  dropZone.style.display = '';
  actions.style.display = 'none';
  fileInput.value = '';
}

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
  handleFile(e.target.files[0]);
});

copyAllBtn.addEventListener('click', () => {
  const allHex = currentColors.map(c => c.hex.toUpperCase()).join(', ');
  copyColor(allHex);
});

resetBtn.addEventListener('click', reset);

document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.match(/^image\//)) {
      e.preventDefault();
      handleFile(item.getAsFile());
      return;
    }
  }
});
```

- [ ] **Step 2: 本地测试 — 上传一张图片验证颜色提取**

操作: 在浏览器打开 `index.html`，上传一张彩色图片
验证: 
- 预览区显示图片
- 下方出现 6 个色块，每个显示 hex 和 rgb
- 点击色块，底部弹出 toast 提示 "已复制 #XXXXXX"
- 点击「复制全部色号」，6 个色号以逗号分隔复制
- 点击「重新上传」恢复到初始状态

- [ ] **Step 3: 测试粘贴图片功能**

操作: 在微信/浏览器中复制一张图片 → 回到取色器页面 → Ctrl+V
验证: 自动识别剪贴板中的图片，提取颜色

---

### Task 3: PWA 支持 — 添加到桌面 & 离线可用

**Files:**
- Create: `D:/color-picker/manifest.json`
- Create: `D:/color-picker/sw.js`

- [ ] **Step 1: 创建 manifest.json**

写入 `D:/color-picker/manifest.json`:

```json
{
  "name": "取色器 - 配色灵感提取",
  "short_name": "取色器",
  "description": "上传图片，一键提取配色方案",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#fafafa",
  "theme_color": "#1a1a2e",
  "icons": [
    {
      "src": "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='36' fill='%231a1a2e'/%3E%3Ccircle cx='60' cy='72' r='24' fill='%23F26C59'/%3E%3Ccircle cx='132' cy='60' r='24' fill='%23FFB347'/%3E%3Ccircle cx='48' cy='132' r='24' fill='%235DADE2'/%3E%3Ccircle cx='120' cy='120' r='24' fill='%2358D68D'/%3E%3Ccircle cx='92' cy='156' r='24' fill='%23AF7AC5'/%3E%3Ccircle cx='150' cy='140' r='24' fill='%23F4C2A3'/%3E%3C/svg%3E",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: 创建 sw.js**

写入 `D:/color-picker/sw.js`:

```js
const CACHE = 'color-picker-v1';
const URLS = ['/', 'index.html', 'manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
```

- [ ] **Step 3: 注册 Service Worker**

在 `index.html` 的 `</body>` 前、关闭 `</script>` 之前（即 body 结束标签上方），添加以下代码：

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
```

这段代码放在所有 DOM 逻辑之后、在同一个 `<script>` 标签内。

- [ ] **Step 4: 验证 PWA**

运行: `npx serve D:/color-picker -p 3000`（需要先安装 Node.js）
验证: 
- 浏览器访问 `http://localhost:3000`
- Chrome DevTools → Application → Manifest 检查无报错
- Application → Service Workers 显示 registered
- Android Chrome 访问时弹出「添加到主屏幕」提示

---

### Task 4: 部署到 Vercel

**Files:**
- Create: `D:/color-picker/vercel.json`（空白配置，使用默认静态托管）

- [ ] **Step 1: 创建 vercel.json**

写入 `D:/color-picker/vercel.json`:

```json
{
  "version": 2
}
```

- [ ] **Step 2: 部署**

运行: `cd /d/color-picker && npx vercel --prod`
或通过 Vercel CLI 或 GitHub 连接部署。

- [ ] **Step 3: 验证线上可用**

操作: 在 Vivo 浏览器打开 Vercel 生成的 URL
验证: 页面上传图片 → 提取颜色 → 复制色号 → 功能正常

---

## 自审清单

1. **Spec coverage:** 三个核心功能全部覆盖 — 上传提取 (Task 2)、点击复制 (Task 2)、PWA 安装 (Task 3)。额外支持了粘贴图片、拖拽上传、复制全部色号。
2. **Placeholder scan:** 无 TBD/TODO，所有步骤都有完整代码。
3. **Type consistency:** `rgbToHex(r,g,b)` 函数签名在定义和所有调用处一致。`color-thief.getPalette(img, 6)` 返回格式 `[[r,g,b], ...]` 在 `handleFile` 中正确解析。
4. **Security:** 无外部 API 调用（除 CDN），无数据上传，纯客户端处理。
