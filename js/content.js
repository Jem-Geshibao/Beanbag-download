function extractImageId(t) {
	if (!t) return null;
	const e = t.match(/rc_gen_image\/([a-f0-9]{32})/i);
	return e ? e[1] : null
}

function getLegacyPreviewImage() {
	const t = document.querySelector('#img-content-container img[data-testid="in_painting_picture"]');
	if (t && t.src) return t;
	const e = document.querySelector('#thumb-list img[class*="active"]');
	return e && e.src ? e : null
}

function findLargestPreviewImage() {
	let t = null, e = 0;
	for (const n of document.querySelectorAll("img")) {
		if (!n.src || !n.src.includes("rc_gen_image")) continue;
		if (!extractImageId(n.src)) continue;
		if (!n.complete || 0 === n.naturalWidth) continue;
		const o = n.getBoundingClientRect();
		if (o.width < 260 || o.height < 260) continue;
		const r = o.width * o.height;
		r > e && (e = r, t = n)
	}
	return t
}

function getCurrentPreviewImageId() {
	const t = getLegacyPreviewImage() || findLargestPreviewImage();
	return t ? extractImageId(t.src) : null
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

let downloadBtn = null, lastTick = 0;

function getDownloadButton() {
	if (downloadBtn) return downloadBtn;
	downloadBtn = document.createElement("button");
	downloadBtn.id = "doubao-download-btn", downloadBtn.textContent = "下载无水印原图", downloadBtn.style.cssText =
		"\n    position: fixed;\n    top: -200px;\n    left: -200px;\n    right: auto;\n    z-index: 999999;\n    padding: 8px 16px;\n    background: #2ecc71;\n    color: white;\n    font-weight: bold;\n    border: none;\n    border-radius: 6px;\n    cursor: pointer;\n    font-size: 14px;\n    box-shadow: 0 2px 8px rgba(0,0,0,0.2);\n    transition: background 0.2s;\n    display: none;\n  ",
		downloadBtn.onmouseenter = () => downloadBtn.style.background = "#27ae60", downloadBtn.onmouseleave = () =>
			downloadBtn.style.background = "#2ecc71",
		downloadBtn.onclick = async t => {
			t.preventDefault(), t.stopPropagation();
			const n = getCurrentOriginalUrl();
			if (!n) return downloadBtn.textContent = "未找到原图", downloadBtn.style.background = "#e74c3c", void
				setTimeout(() => {
					downloadBtn.textContent = "下载无水印原图", downloadBtn.style.background = "#2ecc71"
				}, 2e3);
			downloadBtn.textContent = "下载中...", downloadBtn.style.background = "#95a5a6", downloadBtn.disabled = !
				0;
			try {
				const t = `doubao_${getCurrentPreviewImageId()||Date.now()}.png`;
				chrome.runtime.sendMessage({
					action: "download",
					url: n,
					filename: t
				}, t => {
					t && "ok" === t.status ? (downloadBtn.textContent = "下载成功!", downloadBtn.style.background =
						"#27ae60") : (downloadBtn.textContent = "下载失败", downloadBtn.style.background = "#e74c3c"),
						setTimeout(() => {
							downloadBtn.textContent = "下载无水印原图", downloadBtn.style.background = "#2ecc71",
								downloadBtn.disabled = !1
						}, 2e3)
				})
			} catch (t) {
				downloadBtn.textContent = "下载失败", downloadBtn.style.background = "#e74c3c", setTimeout(() => {
					downloadBtn.textContent = "下载无水印原图", downloadBtn.style.background = "#2ecc71",
						downloadBtn.disabled = !1
				}, 2e3)
			}
		};
	document.body.appendChild(downloadBtn);
	return downloadBtn
}

function getButtonTarget() {
	const t = document.getElementById("img-content-container");
	if (t) {
		const e = t.getBoundingClientRect();
		if (e.width >= 40 && e.bottom >= 0 && e.top <= window.innerHeight) return t
	}
	return findLargestPreviewImage()
}

function placeButton() {
	const t = downloadBtn;
	if (!t) return;
	const e = getButtonTarget();
	if (!e) return void (t.style.display = "none");
	const n = e.getBoundingClientRect();
	if (n.width < 40 || n.height < 40 || n.bottom < 0 || n.top > window.innerHeight) return void (t.style.display =
		"none");
	t.style.display = "block";
	const o = t.offsetWidth || 150;
	t.style.left = Math.max(8, Math.min(window.innerWidth - o - 8, n.right - o - 12)) + "px";
	t.style.top = Math.max(8, n.top + 12) + "px"
}

function tryAddButton() {
	const t = Date.now();
	t - lastTick < 250 || (lastTick = t, getDownloadButton(), placeButton())
}

function startObserver() {
	new MutationObserver(() => {
		tryAddButton()
	}).observe(document.body, {
		childList: !0,
		subtree: !0
	}), window.addEventListener("scroll", () => {
		placeButton()
	}, {
		passive: !0
	}), window.addEventListener("resize", placeButton), setInterval(placeButton, 500)
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
