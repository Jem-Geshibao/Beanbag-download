function extractImageId(t) {
	if (!t) return null;
	const e = t.match(/rc_gen_image\/([a-f0-9]{32})/i);
	return e ? e[1] : null
}

function getCurrentPreviewImageId() {
	const t = document.querySelector('#img-content-container img[data-testid="in_painting_picture"]');
	if (t && t.src) {
		const e = extractImageId(t.src);
		if (e) return e
	}
	const e = document.querySelector('#thumb-list img[class*="active"]');
	if (e && e.src) {
		const t = extractImageId(e.src);
		if (t) return t
	}
	return null
}

function getCurrentOriginalUrl() {
	const t = getCurrentPreviewImageId();
	if (!t) return null;
	const e = window.doubaoImageMap.get(t);
	if (!e) {
		for (const [e, n] of window.doubaoImageMap.entries())
			if (e.includes(t) || t.includes(e)) return n;
		return null
	}
	return e
}

function tryAddButton() {
	const t = document.getElementById("img-content-container");
	t && (document.getElementById("doubao-download-btn") || createDownloadButton(t))
}

function createDownloadButton(t) {
	const e = document.createElement("button");
	e.id = "doubao-download-btn", e.textContent = "下载无水印原图", e.style.cssText =
		"\n    position: absolute;\n    top: 10px;\n    right: 10px;\n    z-index: 9999;\n    padding: 8px 16px;\n    background: #2ecc71;\n    color: white;\n    font-weight: bold;\n    border: none;\n    border-radius: 6px;\n    cursor: pointer;\n    font-size: 14px;\n    box-shadow: 0 2px 8px rgba(0,0,0,0.2);\n    transition: all 0.2s;\n  ",
		e.onmouseenter = () => e.style.background = "#27ae60", e.onmouseleave = () => e.style.background = "#2ecc71", e
		.onclick = async t => {
			t.preventDefault(), t.stopPropagation();
			const n = getCurrentOriginalUrl();
			if (!n) return e.textContent = "未找到原图", e.style.background = "#e74c3c", void setTimeout(() => {
				e.textContent = "下载无水印原图", e.style.background = "#2ecc71"
			}, 2e3);
			const o = e.textContent;
			e.textContent = "下载中...", e.style.background = "#95a5a6", e.disabled = !0;
			try {
				const t = `doubao_${getCurrentPreviewImageId()||Date.now()}.png`;
				chrome.runtime.sendMessage({
					action: "download",
					url: n,
					filename: t
				}, t => {
					t && "ok" === t.status ? (e.textContent = "下载成功!", e.style.background = "#27ae60") : (e
						.textContent = "下载失败", e.style.background = "#e74c3c"), setTimeout(() => {
						e.textContent = o, e.style.background = "#2ecc71", e.disabled = !1
					}, 2e3)
				})
			} catch (t) {
				e.textContent = "下载失败", e.style.background = "#e74c3c", setTimeout(() => {
					e.textContent = o, e.style.background = "#2ecc71", e.disabled = !1
				}, 2e3)
			}
		};
	"static" === window.getComputedStyle(t).position && (t.style.position = "relative"), t.appendChild(e)
}

function startObserver() {
	new MutationObserver(() => {
		tryAddButton()
	}).observe(document.body, {
		childList: !0,
		subtree: !0
	})
}
window.doubaoImageMap = new Map, chrome.runtime.sendMessage({
		action: "injectPageScript"
	}), window.addEventListener("message", function(t) {
		if (t.source === window && t.data && "DOUBAO_IMAGE_URL" === t.data.type) {
			const e = t.data.payload || t.data.url;
			if (e && "string" == typeof e) {
				const t = extractImageId(e);
				t && !window.doubaoImageMap.has(t) && (window.doubaoImageMap.set(t, e), tryAddButton())
			}
		}
	}), document.body ? startObserver() : document.addEventListener("DOMContentLoaded", startObserver), chrome.runtime
	.onMessage.addListener((t, e, n) => {
		if ("getImageMap" === t.action) {
			const t = [];
			for (const [e, n] of window.doubaoImageMap.entries()) t.push({
				id: e,
				url: n
			});
			return n({
				images: t
			}), !0
		}
	});