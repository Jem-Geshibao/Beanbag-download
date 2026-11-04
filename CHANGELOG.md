# 更新日志 / Changelog

本项目的所有重要变更都会记录在此文件。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.0] - 2026-11-04

首个正式发布（Release）。安装包见 [Releases](https://github.com/Jem-Geshibao/Beanbag-download/releases)。

### 包含功能

- **无水印原图捕获**：在 `doubao.com` 页面以 `world: "MAIN"` 注入拦截脚本，包裹 `fetch` 与 `XMLHttpRequest.prototype.send`，从响应文本中提取 `image_ori_raw` 的原图地址，并过滤 `watermark` / `pre_watermark` / `downsize` / `image_pre` 等缩放与水印版本。
- **页面内单张下载**：在图片预览区域注入「下载无水印原图」按钮，带下载中 / 成功 / 失败三态反馈。
- **图片管理面板**：点击工具栏图标打开（350×500），通过 `chrome.tabs.query` 汇总当前所有已打开的 `doubao.com` 标签页捕获到的图片，按 imageId 去重。
- **批量下载**：面板内单选 / 全选，逐张 `fetch` 后由 JSZip 打包为 `doubao_images_<时间戳>.zip`；每项另有独立下载按钮。
- **关于页**：功能介绍、隐私承诺与联系方式。

### 修复

- `manifest.json` 的 `homepage_url` 由旧账号主页 `github.com/yinhw0210` 更正为 `github.com/Jem-Geshibao`。
- 面板「问题反馈」按钮原先按 `github.com/yinhw0210` 匹配页脚链接，因链接已更新导致匹配失效、点击无响应；现改为匹配 `github.com/Jem-Geshibao`。
- 版本号不一致：`html/options.html` 页脚 `v1.0`、`html/about.html` 徽章 `v1.0.0` 统一为 `v1.1.0`，与 `manifest.json` 保持一致。

### 文档

- 重写 `README.md`：新增项目结构树、manifest 入口对照、安装与使用教程、权限说明、FAQ、调试指引，以及"豆包改版时需同步的位置"维护表。
- 重写 `README_EN.md`：与中文版结构一致的英文镜像。
- 修正旧文档中"关于页可从扩展选项打开"的表述——`options_ui` 优先于 `options_page`，该页当前需手动访问 `chrome-extension://<扩展ID>/html/about.html`。

### 工程

- 新增 `.gitignore`：忽略 `.workbuddy/`、`*.crx`、`*.pem`、`*.zip`、`node_modules/` 及系统文件。

## 版本说明

- `manifest.json` 的 `version` 为唯一版本来源，发布前需与其同步。
- 扩展未上架商店，采用"加载已解压"或 Release 附件 ZIP 的方式安装。
