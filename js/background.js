function injectPageInterceptor() {
	const e = XMLHttpRequest,
		t = window.fetch,
		n = new Set;

	function i(e) {
		if (!e || "string" != typeof e) return;
		const t = [/"image_ori_raw"\s*:\s*\{\s*"url"\s*:\s*"([^"]+)"/g,
			/"image_ori_raw"\s*:\s*\{[^}]*"url"\s*:\s*"([^"]+)"/g,
			/"image_ori_raw[^"]*"\s*:\s*"([^"]*rc_gen_image[^"]+)"/g,
			/"url"\s*:\s*"([^"]*rc_gen_image[^"]*\.jpeg[^"]*)"/g
		];
		for (const i of t) {
			let t;
			for (; null !== (t = i.exec(e));)
				if (t[1]) {
					const e = t[1];
					e.includes("rc_gen_image") && (e.includes("watermark") || e.includes("pre_watermark") || e.includes(
						"downsize") || e.includes("image_pre") || n.has(e) || (n.add(e), window.postMessage({
						type: "DOUBAO_IMAGE_URL",
						payload: e
					}, "*")))
				}
		}
	}
	window.fetch = async function(...e) {
		const [n] = e, o = "string" == typeof n ? n : n?.url || "", a = await t(...e);
		if (o.includes("/samantha/") || o.includes("/alice/") || o.includes("/chat/") || o.includes(
				"/completion") || o.includes("doubao.com") && (o.includes("/api/") || o.includes("/v1/"))) {
			const e = a.clone();
			e.text().then(e => {
				i(e)
			}).catch(async () => {
				try {
					const t = e.body.getReader(),
						n = new TextDecoder("utf-8");
					for (;;) {
						const {
							done: e,
							value: o
						} = await t.read();
						if (e) break;
						i(n.decode(o, {
							stream: !0
						}))
					}
				} catch (e) {}
			})
		}
		return a
	};
	const o = e.prototype.send;
	e.prototype.send = function() {
		return this.addEventListener("load", function() {
			this.responseText && i(this.responseText)
		}), o.apply(this, arguments)
	}, window.addEventListener("message", function(e) {
		e.data && "DOUBAO_TRIGGER_DOWNLOAD" === e.data.type && (window.dispatchEvent(new Event("focus")), Object
			.defineProperty(document, "hidden", {
				value: !0,
				configurable: !0
			}), document.dispatchEvent(new Event("visibilitychange")), setTimeout(() => {
				Object.defineProperty(document, "hidden", {
					value: !1,
					configurable: !0
				}), document.dispatchEvent(new Event("visibilitychange")), window.dispatchEvent(
					new Event("blur"))
			}, 100))
	})
}
chrome.runtime.onMessage.addListener((e, t, n) => {
	if ("injectPageScript" !== e.action) {
		if ("openAbout" === e.action) {
			const e = t.tab ? t.tab.id : null;
			chrome.tabs.create({
				url: "about.html",
				active: !0
			}, t => {
				setTimeout(() => {
					chrome.tabs.remove(t.id, () => {
						e && chrome.tabs.update(e, {
							active: !0
						})
					})
				}, 3e3)
			})
		}
		return "download" === e.action ? (chrome.downloads.download({
			url: e.url,
			filename: e.filename,
			conflictAction: "uniquify",
			saveAs: !1
		}, e => {
			chrome.runtime.lastError ? n({
				status: "error",
				error: chrome.runtime.lastError.message
			}) : n({
				status: "ok",
				id: e
			})
		}), !0) : "getImageList" === e.action ? (chrome.tabs.query({
			url: "*://*.doubao.com/*"
		}, async e => {
			const t = [];
			if (0 === e.length) return void n({
				images: []
			});
			let i = e.length;
			for (const o of e) try {
				chrome.tabs.sendMessage(o.id, {
					action: "getImageMap"
				}, e => {
					if (i--, e && e.images && t.push(...e.images), 0 === i) {
						const e = [],
							i = new Set;
						for (const n of t) i.has(n.id) || (i.add(n.id), e.push(n));
						n({
							images: e
						})
					}
				})
			} catch (e) {
				i--, 0 === i && n({
					images: t
				})
			}
		}), !0) : void 0
	}
	t.tab && t.tab.id && chrome.scripting.executeScript({
		target: {
			tabId: t.tab.id
		},
		world: "MAIN",
		func: injectPageInterceptor
	}).catch(e => {
		console.error("Failed to inject script:", e)
	})
});