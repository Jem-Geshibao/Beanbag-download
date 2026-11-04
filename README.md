# 豆包无水印下载助手

![version](https://img.shields.io/badge/version-1.1.0-blue)
![manifest](https://img.shields.io/badge/Manifest-V3-orange)
![license](https://img.shields.io/badge/license-MIT-green)

一款 Chromium 浏览器扩展（Chrome / Edge / 其他 Chromium 内核浏览器）：在 `doubao.com` 页面自动抓取 AI 生成图片的**无水印原图地址**，支持页面内单张下载，以及面板批量勾选后打包成 ZIP 下载。

## 目录

- [快速开始](#快速开始)
- [功能特性](#功能特性)
- [工作原理](#工作原理)
- [项目结构](#项目结构)
- [安装教程](#安装教程)
- [使用教程](#使用教程)
- [权限说明](#权限说明)
- [常见问题](#常见问题)
- [已知限制](#已知限制)
- [二次开发与调试](#二次开发与调试)
- [版本](#版本)
- [联系作者](#联系作者)
- [许可证](#许可证)

## 快速开始

```text
1. 下载 / 克隆本仓库
2. 打开 chrome://extensions/  → 开启「开发者模式」→「加载已解压的扩展程序」
3. 选择仓库根目录（即包含 manifest.json 的这一层，文件夹名 Beanbag-download）
4. 打开 doubao.com 生成图片，图片右上角会出现「下载无水印原图」按钮
```

## 功能特性

| 功能 | 说明 |
| --- | --- |
| 自动抓取原图 | 拦截页面与豆包服务端的通信，从响应体中提取 `image_ori_raw` 的无水印地址，自动过滤带 `watermark` / `pre_watermark` / `downsize` / `image_pre` 的缩放或水印版本 |
| 页面内单张下载 | 在图片预览区右上角注入「下载无水印原图」按钮，点击即存，按钮有"下载中 / 成功 / 失败"状态反馈 |
| 管理面板 | 点击扩展图标打开面板（350×500），以缩略图列表汇总**当前所有已打开的 doubao.com 标签页**捕获到的图片 |
| 批量下载 | 面板内可单选 / 全选，勾选后点「批量下载」逐张拉取并打包为 ZIP |
| 逐张下载 | 列表每项右侧有独立下载按钮，不必勾选 |
| 隐私友好 | 不收集、不上传任何用户数据，不读取账号信息或聊天内容，不与第三方服务器通信（面板字体见[常见问题](#常见问题)） |
| 关于页 | `html/about.html` 含功能介绍、隐私承诺与联系方式。该页目前没有 UI 入口（`options_ui` 已占用「扩展程序选项」），需手动访问 `chrome-extension://<扩展ID>/html/about.html` |

## 工作原理

扩展由三层协作完成"抓链接 → 拿到当前图 → 触发下载"：

```text
doubao.com 页面（MAIN world）
  background.js 用 chrome.scripting 注入 injectPageInterceptor
        │  包裹 window.fetch 与 XMLHttpRequest.prototype.send
        │  正则扫描响应文本，提取 image_ori_raw 中的 rc_gen_image 原图 URL
        │  window.postMessage({ type: "DOUBAO_IMAGE_URL", payload: url })
        ▼
content.js（ISOLATED world，document_start 注入）
  window.doubaoImageMap: imageId → 原图 URL
        │  从 URL 中匹配 rc_gen_image/<32位十六进制> 作为 imageId 去重
        │  在 #img-content-container 内注入下载按钮
        ▼
chrome.runtime.sendMessage({ action: "download" })
        ▼
background.js（Service Worker）
  chrome.downloads.download({ conflictAction: "uniquify", saveAs: false })
```

几个关键细节：

- **当前图片的判定**：先取 `#img-content-container img[data-testid="in_painting_picture"]`，回退到 `#thumb-list img[class*="active"]`，再从 `src` 中解析 imageId 去 Map 里查原图地址。
- **批量列表的聚合**：面板请求 `getImageList`，后台 `chrome.tabs.query` 匹配 `*://*.doubao.com/*`，向每个标签页的内容脚本发 `getImageMap`，最后按 imageId 去重合并。
- **ZIP 打包**：面板用 `fetch(url, { mode: "cors", credentials: "omit" })` 取 blob 写入 JSZip，因此依赖原图服务器允许跨域读取（见[已知限制](#已知限制)）。

## 项目结构

```text
Beanbag-download/
├── manifest.json           # 扩展清单（MV3）：版本、权限、入口、图标
├── icons/
│   ├── icon16.png          # 工具栏 / 扩展页图标
│   ├── icon64.png          # 工具栏图标
│   ├── icon128.png         # 商店 / 详情页大图标
│   └── logo.ico            # 面板左上角 Logo
├── js/
│   ├── background.js       # Service Worker：注入拦截脚本、执行下载、跨标签聚合图片列表
│   ├── content.js          # 内容脚本：接收原图 URL、维护 imageId→URL 映射、注入下载按钮
│   ├── options.js          # 面板逻辑：列表渲染、选择态、单张下载、ZIP 批量下载
│   └── jszip.min.js        # 第三方库（JSZip），用于生成 ZIP
├── html/
│   ├── options.html        # 扩展弹窗 = 图片管理面板（同时被注册为 options_ui）
│   └── about.html          # 关于页：功能介绍、隐私承诺、联系方式
├── css/
│   ├── options.css         # 面板与关于页样式（含 CSS 变量、350px 弹窗宽度、500px 高度）
│   └── style.css           # 注入 doubao.com 的下载按钮样式
├── LICENSE                 # MIT 许可证
├── CHANGELOG.md            # 版本更新记录
├── README.md               # 中文说明（本文件）
└── README_EN.md            # English README
```

各入口在 `manifest.json` 中的对应关系：

| 清单字段 | 值 | 作用 |
| --- | --- | --- |
| `action.default_popup` | `html/options.html` | 点击工具栏图标弹出管理面板 |
| `background.service_worker` | `js/background.js` | 后台常驻逻辑（MV3 Service Worker） |
| `content_scripts[0].js` | `js/content.js` | 在 `*://*.doubao.com/*` 以 `document_start` 注入 |
| `content_scripts[0].css` | `css/style.css` | 随内容脚本注入的按钮样式 |
| `options_ui.page` | `html/options.html` | 扩展详情页的「扩展程序选项」 |
| `options_page` | `html/about.html` | 关于页（MV3 中 `options_ui` 优先级更高，此字段实际不生效） |

## 安装教程

### 方式一：加载已解压的扩展（推荐）

适用于自己使用、开发调试。不想用 git 的话，可直接从 [Releases](https://github.com/Jem-Geshibao/Beanbag-download/releases) 下载 `Beanbag-download-v1.1.0.zip`，解压后按下面的步骤加载。

1. 获取代码：

   ```bash
   git clone https://github.com/Jem-Geshibao/Beanbag-download.git
   ```

   也可以直接下载 ZIP 后解压。

2. 打开扩展管理页：
   - Chrome：地址栏输入 `chrome://extensions/`
   - Edge：地址栏输入 `edge://extensions/`

3. 打开页面右上角（Edge 在左下角）的 **开发者模式 / Developer mode** 开关。

4. 点击 **加载已解压的扩展程序 / Load unpacked**。

5. 在文件夹选择框中选中**仓库根目录**，也就是直接包含 `manifest.json` 的那一层，文件夹名为 `Beanbag-download`。

   > ⚠️ 常见错误：选中了它的**父目录**（如 `Documents/GitHub`），此时浏览器会提示"清单文件缺失或不可读取"，请再进一层。

6. 加载成功后列表中会出现「豆包无水印下载助手」，建议点击工具栏的拼图图标把它**固定**到工具栏，方便随时打开面板。

### 方式二：打包成 crx / zip 分发

1. 在 `chrome://extensions/` 点击 **打包扩展程序 / Pack extension**。
2. 「扩展程序根目录」选择本仓库根目录，私钥留空即可（首次会生成 `.pem`，请自行保管）。
3. 生成的 `.crx` 可直接拖入扩展页安装；企业内网分发可配合策略白名单。

## 使用教程

### 第一步：在豆包页面生成图片

打开 `https://www.doubao.com/` 并正常使用 AI 绘图 / 图片生成功能。扩展只在 `doubao.com` 域下生效，且必须在**当前浏览器**里打开过该页面，面板才能读到图片。

### 第二步：单张下载（页面内）

进入图片预览（大图 / 缩略图列表）视图后，图片区域右上角会出现绿色按钮 **「下载无水印原图」**：

- 点击 → 按钮变为「下载中...」→ 成功后显示「下载成功!」（2 秒后恢复）。
- 若显示「未找到原图」，说明该图未命中拦截规则，可先把图片切换一次（点击其他缩略图再切回）触发重新解析，或改用面板批量下载。

下载文件名规则：`doubao_<imageId>.png`（拿不到 imageId 时用时间戳）。

### 第三步：批量下载（面板）

1. 点击工具栏上的扩展图标，打开「豆包图片管理」面板。
2. 顶部显示「已捕获 N 张图片」，下面是缩略图列表，每项含序号、imageId 前 12 位、状态标记。
3. 选择图片：
   - 点击任意一行切换选中状态；
   - 勾选顶部「全选」可一次选中全部；
   - 点每行右侧的 ⬇ 图标可**只下载这一张**，不影响勾选状态。
4. 点右上角 **「批量下载」**，按钮会依次显示 `打包中...` → `下载 1/N...`，全部取完后自动下载 `doubao_images_<时间戳>.zip`。
5. ZIP 内文件名为 `doubao_<imageId>.png`，每张图的状态会标记「已打包」或「失败」。

### 面板里的其他入口

- 右上角 **?** 按钮：会滚动并高亮面板底部的 GitHub 链接，方便去提 issue。
- 底部 **定弦 Lab / bread**：作者主页链接。

## 权限说明

| 权限 | 类型 | 用途 |
| --- | --- | --- |
| `downloads` | API 权限 | 保存单张图片与打包后的 ZIP |
| `tabs` | API 权限 | 查询已打开的 doubao.com 标签页、向内容脚本发消息、打开并关闭关于页标签 |
| `scripting` | API 权限 | 以 `world: "MAIN"` 向页面注入 fetch / XHR 拦截脚本 |
| `*://*.doubao.com/*` | 主机权限 | 内容脚本匹配站点，覆盖所有豆包子域 |
| `*://*.byteimg.com/*` | 主机权限 | 图片 CDN 域名，用于缩略图展示与原图拉取 |

扩展**不请求** `storage`、`cookies`、`webRequest` 等权限，捕获结果只保存在页面内存（`window.doubaoImageMap`）中，刷新页面即清空。

## 常见问题

**Q1：面板显示「暂无可下载的图片」？**

按顺序排查：

1. 是否已在**当前浏览器**打开过 `doubao.com` 并生成过图片；
2. 该标签页是否还开着（面板只汇总当前打开的标签页，关掉标签页数据就没了）；
3. 生成图片后是否刷新过页面（刷新会清空内存中的映射，但重新加载图片后会自动重建）；
4. 重新打开面板再试。

**Q2：图片预览角落没有出现绿色按钮？**

- 确认当前处于图片预览视图；按钮只注入到 `#img-content-container` 容器内。
- 页面刚打开时容器可能还没渲染，稍等或切换一次图片；内容脚本用 `MutationObserver` 监听 DOM 变化，容器出现后会自动补上按钮。
- 打开 DevTools Console 看有无脚本报错。

**Q3：点了按钮提示「未找到原图」？**

说明该图 URL 没被拦截规则命中，常见于：图片是历史会话中早已生成、本次会话未再请求；或响应是流式（SSE）返回且内容被分片。可尝试重新发送 / 重新打开该图片触发请求，或用面板看是否已捕获。

**Q4：批量下载时部分图片显示「失败」？**

- **跨域限制**：打包靠 `fetch` 读取图片二进制，若原图服务器未返回允许跨域的响应头，读取会失败。
- **链接时效**：`byteimg.com` 的原图地址带签名参数，过期后无法下载。建议生成图片后尽快下载。

**Q5：下载下来的文件是 `.png` 但打不开？**

扩展统一以 `.png` 命名（`doubao_<id>.png`），而源图实际格式可能是 JPEG。用支持内容嗅探的看图软件可正常打开；如需严格后缀，下载后手动改扩展名即可。

**Q6：面板字体加载慢或样式异常？**

`css/options.css` 顶部有一行 `@import` 引入 Google Fonts 的 Inter 字体，网络不通时会等待超时后回退到系统字体（`PingFang SC` / `Microsoft YaHei` 等），功能不受影响。如需完全离线，可删除该 `@import` 行。

**Q7：改了代码但没生效？**

回到 `chrome://extensions/`，点击该扩展卡片上的**刷新 ↻**；改的是 `background.js` 时还需点开 "Service Worker" 重新加载。页面本身也要刷新一次，让新的内容脚本注入。

## 已知限制

- 仅在 `doubao.com` 域下工作，且只识别 URL 中含 `rc_gen_image` 的生成图，头像、表情、上传素材等不会被捕获。
- 拦截依赖豆包前端的响应结构（`image_ori_raw` 字段）与页面选择器（`#img-content-container`、`#thumb-list` 等），官方改版后可能需要同步更新（见下节表格）。
- 捕获数据不持久化，关闭标签页或刷新页面后需重新抓取。
- 批量打包受 CORS 与原图链接时效影响。

## 二次开发与调试

### 目录与职责约定

- `js/background.js`：唯一与 `chrome.downloads` / `chrome.scripting` / `chrome.tabs` 打交道的地方，新增后台能力放这里。
- `js/content.js`：只做"页面侧"的事——维护映射、注入 UI、响应面板查询，不要在这里直接调下载 API。
- `js/options.js`：只操作 DOM 与 `chrome.runtime.sendMessage`，打包逻辑（JSZip）在此。
- 样式分两套：`css/style.css` 注入页面（按钮），`css/options.css` 用于扩展自身页面。

### 调试方法

| 调试对象 | 方法 |
| --- | --- |
| 内容脚本 | 打开豆包页面 DevTools → Console 顶部上下文切换为扩展，即可查看日志、访问 `window.doubaoImageMap` |
| Service Worker | `chrome://extensions/` → 该扩展的 "Service Worker / 检查视图" 链接 |
| 面板 | 右键面板 → 检查，或访问 `chrome-extension://<扩展ID>/html/options.html` 直接调试 |
| 注入的拦截脚本 | 在页面 Console 中查看 `fetch` 是否被替换（`window.fetch.toString()` 含 `async function`），必要时在 `injectPageInterceptor` 内打断点 |

### 豆包改版时需要同步的位置

| 文件 | 依赖的页面结构 / 规则 |
| --- | --- |
| `js/content.js` `getCurrentPreviewImageId()` | `#img-content-container img[data-testid="in_painting_picture"]`、`#thumb-list img[class*="active"]` |
| `js/content.js` `tryAddButton()` | `#img-content-container` |
| `js/content.js` `extractImageId()` | `rc_gen_image/<32 位十六进制>` |
| `js/background.js` `injectPageInterceptor()` | 响应字段 `image_ori_raw`、URL 关键字 `rc_gen_image`、排除关键字 `watermark` / `pre_watermark` / `downsize` / `image_pre` |
| `js/background.js` 注入判断 | 请求路径关键字 `/samantha/`、`/alice/`、`/chat/`、`/completion`、`/api/`、`/v1/` |

## 版本

当前版本 **v1.1.0**（见 `manifest.json` 的 `version` 字段）。修改版本号后需在扩展页重新加载才能生效。

完整变更记录见 [CHANGELOG.md](CHANGELOG.md)；历史版本安装包见 [Releases](https://github.com/Jem-Geshibao/Beanbag-download/releases)。

## 联系作者

| 渠道 | 地址 |
| --- | --- |
| GitHub | [Jem-Geshibao](https://github.com/Jem-Geshibao) |
| 仓库 | [Jem-Geshibao/Beanbag-download](https://github.com/Jem-Geshibao/Beanbag-download) |
| 公众号 | 杰姆盖世保 |
| 微信 | cca4720d |
| 邮箱 | jemgeshibao@gmail.com |

问题反馈、功能建议欢迎提 [Issue](https://github.com/Jem-Geshibao/Beanbag-download/issues) 或 PR。

## 许可证

本项目基于 **MIT License** 开源，Copyright (c) 2026 Jem Geshibao。详见 [LICENSE](LICENSE)。
