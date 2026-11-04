let imageList = [],
	selectedImages = new Set;
const imageListEl = document.getElementById("image-list"),
	emptyState = document.getElementById("empty-state"),
	loadingState = document.getElementById("loading-state"),
	selectAllCheckbox = document.getElementById("select-all"),
	downloadBtn = document.getElementById("download-btn"),
	countInfo = document.getElementById("count-info"),
	imageCount = document.getElementById("image-count"),
	toolbar = document.getElementById("toolbar"),
	downloadIconSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />\n</svg>',
	loadingIconSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="animation: spin 1s linear infinite">\n  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />\n</svg>',
	successIconSvg =
	'<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">\n  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />\n</svg>';
async function init() {
	showLoading(!0);
	try {
		const e = await chrome.runtime.sendMessage({
			action: "getImageList"
		});
		e && e.images && e.images.length > 0 ? (imageList = e.images, imageCount.textContent =
			`已捕获 ${imageList.length} 张图片`, toolbar.style.display = "flex", renderImageList()) : showEmptyState()
	} catch (e) {
		console.error("获取图片列表失败:", e), showEmptyState()
	}
	showLoading(!1)
}

function showLoading(e) {
	loadingState.style.display = e ? "flex" : "none", e && (imageListEl.style.display = "none", emptyState.style
		.display = "none", toolbar.style.display = "none")
}

function showEmptyState() {
	emptyState.style.display = "flex", imageListEl.style.display = "none", toolbar.style.display = "none"
}

function renderImageList() {
	imageListEl.innerHTML = "", imageListEl.style.display = "block", emptyState.style.display = "none", imageList
		.forEach((e, t) => {
			const n = document.createElement("div");
			n.className = "image-item", n.dataset.id = e.id, n.innerHTML =
				`\n      <div class="item-checkbox"></div>\n      <div class="item-thumb">\n        <img src="${e.url}" alt="图片" referrerpolicy="no-referrer" crossorigin="anonymous" />\n      </div>\n      <div class="item-info">\n        <div class="item-name">图片 ${t+1}</div>\n        <div class="item-id">${e.id.substring(0,12)}...</div>\n      </div>\n      <span class="item-status"></span>\n      <button class="item-download" title="下载此图片">${downloadIconSvg}</button>\n    `,
				n.addEventListener("click", t => {
					t.target.closest(".item-download") || toggleSelect(e.id, n)
				});
			n.querySelector(".item-download").addEventListener("click", t => {
				t.stopPropagation(), downloadSingle(e, n)
			}), imageListEl.appendChild(n)
		}), updateUI()
}

function toggleSelect(e, t) {
	selectedImages.has(e) ? (selectedImages.delete(e), t.classList.remove("selected")) : (selectedImages.add(e), t
		.classList.add("selected")), updateUI()
}

function updateUI() {
	const e = selectedImages.size;
	countInfo.textContent = `已选 ${e} 张`, downloadBtn.disabled = 0 === e, imageList.length > 0 && (selectAllCheckbox
		.checked = e === imageList.length, selectAllCheckbox.indeterminate = e > 0 && e < imageList.length)
}

function handleSelectAll() {
	const e = selectAllCheckbox.checked;
	selectedImages.clear(), document.querySelectorAll(".image-item").forEach(t => {
		const n = t.dataset.id;
		e ? (selectedImages.add(n), t.classList.add("selected")) : t.classList.remove("selected")
	}), updateUI()
}
async function downloadSingle(e, t) {
	const n = t.querySelector(".item-download"),
		o = t.querySelector(".item-status");
	t.classList.add("downloading"), t.classList.remove("downloaded", "download-error"), n.innerHTML =
		loadingIconSvg;
	try {
		const s = await chrome.runtime.sendMessage({
			action: "download",
			url: e.url,
			filename: `doubao_${e.id}.png`
		});
		if (!s || "ok" !== s.status) throw new Error(s?.error || "下载失败");
		t.classList.remove("downloading"), t.classList.add("downloaded"), n.innerHTML = successIconSvg, o
			.textContent = "已下载"
	} catch (e) {
		t.classList.remove("downloading"), t.classList.add("download-error"), n.innerHTML = downloadIconSvg, o
			.textContent = "失败"
	}
}
async function downloadSelected() {
	if (0 === selectedImages.size) return;
	downloadBtn.disabled = !0;
	const e = downloadBtn.querySelector(".btn-text");
	e.textContent = "打包中...";
	const t = imageList.filter(e => selectedImages.has(e.id)),
		n = new JSZip;
	let o = 0;
	for (let s = 0; s < t.length; s++) {
		const l = t[s],
			a = document.querySelector(`.image-item[data-id="${l.id}"]`);
		e.textContent = `下载 ${s+1}/${t.length}...`;
		try {
			const e = await fetch(l.url, {
				mode: "cors",
				credentials: "omit"
			});
			if (e.ok) {
				const t = await e.blob();
				if (n.file(`doubao_${l.id}.png`, t), o++, a) {
					a.classList.add("downloaded");
					const e = a.querySelector(".item-status"),
						t = a.querySelector(".item-download");
					e.textContent = "已打包", t.innerHTML = successIconSvg
				}
			}
		} catch (e) {
			if (console.error(`下载图片失败: ${l.id}`, e), a) {
				a.classList.add("download-error");
				a.querySelector(".item-status").textContent = "失败"
			}
		}
	}
	if (o > 0) {
		e.textContent = "生成 ZIP...";
		try {
			const t = await n.generateAsync({
					type: "blob"
				}),
				s = URL.createObjectURL(t),
				l = document.createElement("a");
			l.href = s, l.download = `doubao_images_${Date.now()}.zip`, document.body.appendChild(l), l.click(),
				document.body.removeChild(l), URL.revokeObjectURL(s), e.textContent = `已下载 ${o} 张`
		} catch (t) {
			console.error("生成 ZIP 失败:", t), e.textContent = "ZIP 生成失败"
		}
	} else e.textContent = "下载失败";
	setTimeout(() => {
		e.textContent = "批量下载", downloadBtn.disabled = 0 === selectedImages.size
	}, 2e3)
}
selectAllCheckbox.addEventListener("change", handleSelectAll), downloadBtn.addEventListener("click", downloadSelected);
const feedbackBtn = document.getElementById("feedback-btn");
feedbackBtn && feedbackBtn.addEventListener("click", () => {
	const e = document.querySelectorAll(".footer-link");
	let t = null;
	if (e.forEach(e => {
			e.href && e.href.includes("github.com/Jem-Geshibao") && (t = e)
		}), t) {
		t.scrollIntoView({
				behavior: "smooth",
				block: "center"
			}), t.style.transition = "all 0.3s", t.style.color = "var(--error)", t.style.transform =
			"scale(1.2)", t.style.fontWeight = "bold";
		let e = 0;
		const n = setInterval(() => {
			t.style.opacity = "0.5" === t.style.opacity ? "1" : "0.5", e++, e >= 6 && (clearInterval(n),
				t.style.opacity = "1", setTimeout(() => {
					t.style.color = "", t.style.transform = "", t.style.fontWeight = ""
				}, 500))
		}, 200)
	}
}), document.addEventListener("DOMContentLoaded", init);