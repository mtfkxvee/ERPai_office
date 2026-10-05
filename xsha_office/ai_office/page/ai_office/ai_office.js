frappe.pages["ai-office"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("AI Office"),
		single_column: true,
	});

	const host = document.createElement("div");
	host.style.cssText = "width:100%;height:calc(100vh - 140px);min-height:420px;position:relative;";
	host.textContent = "Loading office…";
	host.style.color = "var(--text-muted)";
	host.style.padding = "12px";
	page.main.append(host);

	// Bundle-nya di-build Vite (three.js + R3F ikut ke-bundle, nol dependency
	// eksternal), jadi esbuild Frappe nggak kesentuh sama sekali.
	frappe
		.require("/assets/xsha_office/office/office.js")
		.then(() => {
			if (!window.XshaOffice) {
				throw new Error("Bundle ke-load tapi window.XshaOffice nggak ada");
			}
			host.textContent = "";
			host.style.padding = "0";
			window.XshaOffice.mount(host);
		})
		.catch((err) => {
			host.textContent =
				"Gagal load bundle office: " +
				(err && err.message ? err.message : err) +
				" — udah jalan `bench build --app xsha_office`?";
			console.error("[ai-office]", err);
		});

	page.wrapper.on("hide", () => {
		if (window.XshaOffice && window.XshaOffice.unmount) {
			window.XshaOffice.unmount();
		}
	});
};
