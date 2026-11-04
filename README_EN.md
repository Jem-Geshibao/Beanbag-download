# Doubao No-Watermark Download Helper

![version](https://img.shields.io/badge/version-1.1.0-blue)
![manifest](https://img.shields.io/badge/Manifest-V3-orange)
![license](https://img.shields.io/badge/license-MIT-green)

A Chromium extension (Chrome / Edge / other Chromium-based browsers) that automatically captures the **no-watermark original URLs** of AI-generated images on `doubao.com`. It adds an in-page single-image download button and an extension panel for selecting and batch-downloading images as a ZIP archive.

[中文说明](README.md)

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Permissions](#permissions)
- [FAQ](#faq)
- [Known Limitations](#known-limitations)
- [Development & Debugging](#development--debugging)
- [Version](#version)
- [Contact](#contact)
- [License](#license)

## Quick Start

```text
1. Clone or download this repository
2. Open chrome://extensions/ → enable "Developer mode" → "Load unpacked"
3. Select the repository root (the folder that contains manifest.json, named Beanbag-download)
4. Generate images on doubao.com — a "下载无水印原图" button appears on the image preview
```

## Features

| Feature | Details |
| --- | --- |
| Automatic URL capture | Intercepts page ↔ server traffic and extracts `image_ori_raw` URLs, filtering out scaled or watermarked variants (`watermark`, `pre_watermark`, `downsize`, `image_pre`) |
| In-page single download | Injects a "下载无水印原图" button at the top-right of the image preview, with downloading / success / failure states |
| Management panel | Click the toolbar icon to open a 350×500 panel listing images captured from **all open doubao.com tabs** |
| Batch download | Select individually or select-all, then click "批量下载" to fetch each image and package them into a ZIP |
| Per-item download | Every row has its own download button — no selection needed |
| Privacy friendly | No user data collected or uploaded, no account or chat content read, no third-party server communication (see [FAQ](#faq) about the font import) |
| About page | `html/about.html` with features, privacy promise and contact info. It currently has no UI entry (`options_ui` takes the options slot) — open `chrome-extension://<id>/html/about.html` manually |

## How It Works

The extension works in three layers — capture URL → resolve current image → trigger download:

```text
doubao.com page (MAIN world)
  background.js injects injectPageInterceptor via chrome.scripting
        │  wraps window.fetch and XMLHttpRequest.prototype.send
        │  regex-scans response text for rc_gen_image URLs inside image_ori_raw
        │  window.postMessage({ type: "DOUBAO_IMAGE_URL", payload: url })
        ▼
content.js (ISOLATED world, injected at document_start)
  window.doubaoImageMap: imageId → original URL
        │  imageId = the 32-hex segment of rc_gen_image/<id>, used for de-duplication
        │  injects the download button into #img-content-container
        ▼
chrome.runtime.sendMessage({ action: "download" })
        ▼
background.js (Service Worker)
  chrome.downloads.download({ conflictAction: "uniquify", saveAs: false })
```

Key details:

- **Resolving the current image**: reads `#img-content-container img[data-testid="in_painting_picture"]`, falls back to `#thumb-list img[class*="active"]`, parses the imageId from `src`, then looks up the original URL in the Map.
- **Aggregating the list**: the panel sends `getImageList`; the background script runs `chrome.tabs.query` for `*://*.doubao.com/*`, sends `getImageMap` to each content script, and merges results de-duplicated by imageId.
- **ZIP packaging**: the panel fetches each blob with `fetch(url, { mode: "cors", credentials: "omit" })` and adds it to JSZip, so it depends on the image host allowing cross-origin reads (see [Known Limitations](#known-limitations)).

## Project Structure

```text
Beanbag-download/
├── manifest.json           # MV3 manifest: version, permissions, entry points, icons
├── icons/
│   ├── icon16.png          # Toolbar / extensions page icon
│   ├── icon64.png          # Toolbar icon
│   ├── icon128.png         # Store / detail page icon
│   └── logo.ico            # Panel header logo
├── js/
│   ├── background.js       # Service worker: script injection, downloads, cross-tab aggregation
│   ├── content.js          # Content script: URL map, download button, panel queries
│   ├── options.js          # Panel logic: rendering, selection, single & batch download
│   └── jszip.min.js        # Third-party JSZip library
├── html/
│   ├── options.html        # Extension popup (image manager, also registered as options_ui)
│   └── about.html          # About page: features, privacy, contact
├── css/
│   ├── options.css         # Panel & about page styles (350px wide, 500px tall popup)
│   └── style.css           # Styles for the button injected into doubao.com
├── LICENSE                 # MIT license
├── README.md               # 中文说明
└── README_EN.md            # English README (this file)
```

Manifest entry points:

| Manifest field | Value | Purpose |
| --- | --- | --- |
| `action.default_popup` | `html/options.html` | Toolbar popup = image manager |
| `background.service_worker` | `js/background.js` | Background logic (MV3 service worker) |
| `content_scripts[0].js` | `js/content.js` | Injected into `*://*.doubao.com/*` at `document_start` |
| `content_scripts[0].css` | `css/style.css` | Injected together with the content script |
| `options_ui.page` | `html/options.html` | "Extension options" in the extensions page |
| `options_page` | `html/about.html` | About page (ignored in MV3 because `options_ui` takes precedence) |

## Installation

### Option A — Load unpacked (recommended)

1. Get the code:

   ```bash
   git clone https://github.com/Jem-Geshibao/Beanbag-download.git
   ```

2. Open the extensions page: `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge).
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the **repository root** — the folder that directly contains `manifest.json`, named `Beanbag-download`.

   > ⚠️ Selecting the *parent* folder (e.g. `Documents/GitHub`) fails with "Manifest file is missing or unreadable".

6. Optionally pin the extension to the toolbar via the puzzle-piece menu.

### Option B — Pack a .crx for distribution

1. On `chrome://extensions/`, click **Pack extension**.
2. Set the extension root to this repository root, leave the private key empty (a `.pem` is generated — keep it safe).
3. The resulting `.crx` can be dragged into the extensions page.

## Usage

### 1. Generate images on Doubao

Open `https://www.doubao.com/` and use the image generation feature as usual. The extension only runs on `doubao.com`, and the panel can only read images from tabs currently open in this browser.

### 2. Single download (in page)

Open an image preview. A green **「下载无水印原图」** button appears at the top-right of the image area:

- Click → "下载中..." → "下载成功!" (resets after 2 seconds).
- "未找到原图" means the URL wasn't captured; switch to another thumbnail and back to re-trigger parsing, or use the panel instead.

File name: `doubao_<imageId>.png` (timestamp is used when no imageId is available).

### 3. Batch download (panel)

1. Click the toolbar icon to open the "豆包图片管理" panel.
2. The header shows "已捕获 N 张图片"; each row shows an index, the first 12 chars of imageId, and a status label.
3. Select images: click a row to toggle, tick "全选" for all, or click the ⬇ icon per row to download just that one.
4. Click **「批量下载」**. The button shows `打包中...` then `下载 1/N...`, and finally a `doubao_images_<timestamp>.zip` is saved.
5. Inside the ZIP, files are named `doubao_<imageId>.png`; each row is marked "已打包" or "失败".

### Other panel entries

- **?** button (top-right): scrolls to and highlights the GitHub footer link.
- Footer **定弦 Lab / bread**: author links.

## Permissions

| Permission | Type | Purpose |
| --- | --- | --- |
| `downloads` | API | Save single images and the packaged ZIP |
| `tabs` | API | Query doubao.com tabs, message content scripts, open/close the about tab |
| `scripting` | API | Inject the fetch/XHR interceptor into the page's MAIN world |
| `*://*.doubao.com/*` | Host | Content script match pattern, covers all Doubao subdomains |
| `*://*.byteimg.com/*` | Host | Image CDN, used for thumbnails and original image fetching |

The extension does **not** request `storage`, `cookies` or `webRequest`. Captured data lives only in page memory (`window.doubaoImageMap`) and is cleared on refresh.

## FAQ

**Q1: The panel says "暂无可下载的图片".**
Make sure you have generated images on `doubao.com` in this browser, the tab is still open (the panel only reads open tabs), then reopen the panel.

**Q2: No green button on the image preview.**
Confirm you're in the image preview view — the button is injected into `#img-content-container`. If the container renders late, a `MutationObserver` adds the button as soon as it appears. Check DevTools Console for errors.

**Q3: Clicking the button shows "未找到原图".**
The URL didn't match the capture rules — often because the image was generated in an earlier session and no request is made now, or the response was streamed in fragments. Re-open the image to trigger a request, or check the panel.

**Q4: Some images fail during batch download.**
Two common causes: CORS (the image host doesn't allow cross-origin binary reads), and signed URL expiry on `byteimg.com`. Download soon after generating.

**Q5: The saved file is `.png` but won't open.**
Files are always named `.png` while the source may be JPEG. Most viewers open it fine by content sniffing; rename the extension if you need an exact match.

**Q6: Panel fonts load slowly.**
`css/options.css` imports Inter from Google Fonts via `@import`. Without network access it falls back to system fonts after a timeout. Remove that line for fully offline use.

**Q7: Code changes don't take effect.**
Click the refresh ↻ icon on the extension card at `chrome://extensions/`, reload the Service Worker for `background.js` changes, and refresh the Doubao tab.

## Known Limitations

- Only works on `doubao.com`, and only captures URLs containing `rc_gen_image` (avatars, stickers and uploads are ignored).
- Depends on Doubao's response shape (`image_ori_raw`) and page selectors (`#img-content-container`, `#thumb-list`, …); a site redesign may require updates (see the table below).
- Captured data is not persisted — reloading or closing the tab requires re-capture.
- Batch packaging is subject to CORS and URL expiry.

## Development & Debugging

### Responsibilities

- `js/background.js` — the only place touching `chrome.downloads` / `chrome.scripting` / `chrome.tabs`.
- `js/content.js` — page-side only: maintain the map, inject UI, answer panel queries; never call download APIs directly.
- `js/options.js` — DOM plus `chrome.runtime.sendMessage`; ZIP logic lives here.
- Two stylesheets: `css/style.css` for the page button, `css/options.css` for extension pages.

### Debugging

| Target | How |
| --- | --- |
| Content script | Page DevTools → Console → switch context to the extension; inspect `window.doubaoImageMap` |
| Service worker | `chrome://extensions/` → "Service Worker" / "Inspect views" |
| Panel | Right-click the panel → Inspect, or open `chrome-extension://<id>/html/options.html` |
| Injected interceptor | Run `window.fetch.toString()` in the page console to confirm it was replaced |

### What to update when Doubao changes

| File | Depends on |
| --- | --- |
| `js/content.js` `getCurrentPreviewImageId()` | `#img-content-container img[data-testid="in_painting_picture"]`, `#thumb-list img[class*="active"]` |
| `js/content.js` `tryAddButton()` | `#img-content-container` |
| `js/content.js` `extractImageId()` | `rc_gen_image/<32 hex chars>` |
| `js/background.js` `injectPageInterceptor()` | `image_ori_raw`, `rc_gen_image`, exclusions `watermark` / `pre_watermark` / `downsize` / `image_pre` |
| `js/background.js` injection rule | Path keywords `/samantha/`, `/alice/`, `/chat/`, `/completion`, `/api/`, `/v1/` |

## Version

Current version **v1.1.0** (see `version` in `manifest.json`). Reload the extension after changing it.

## Contact

| Channel | Address |
| --- | --- |
| GitHub | [Jem-Geshibao](https://github.com/Jem-Geshibao) |
| Repository | [Jem-Geshibao/Beanbag-download](https://github.com/Jem-Geshibao/Beanbag-download) |
| WeChat Official Account | 杰姆盖世保 |
| WeChat | cca4720d |
| Email | jemgeshibao@gmail.com |

Issues and pull requests are welcome in the [issue tracker](https://github.com/Jem-Geshibao/Beanbag-download/issues).

## License

Released under the **MIT License**, Copyright (c) 2026 Jem Geshibao. See [LICENSE](LICENSE).
