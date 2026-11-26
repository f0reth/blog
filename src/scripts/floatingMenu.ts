type State = "closed" | "open" | "toc";

/** スマホ用のメニュー (FloatingMenu) を開閉し、目次の表示へ切り替えられるようにする */
export const setupFloatingMenu = () => {
	const fm = document.querySelector<HTMLElement>(".fm");
	const overlay = document.querySelector<HTMLElement>(".fm-overlay");
	if (!fm || !overlay) return;

	const views = fm.querySelectorAll<HTMLElement>("[data-view]");
	const button = fm.querySelector<HTMLButtonElement>(".fm-button");
	const itemCount = Number(fm.dataset.items);

	/** 目次の中身の高さに合わせる (画面の 65% まで) */
	const tocHeight = (width: number) => {
		const toc = fm.querySelector<HTMLElement>("[data-view='toc']");
		const main = toc?.querySelector<HTMLElement>(".fm-toc-main");
		const back = toc?.querySelector<HTMLElement>(".fm-back");
		if (!toc || !main || !back) return 0;
		// 幅のアニメーション中に測ると折り返しが増えるため、最終的な幅に固定してから測る
		toc.style.width = `${width - 14}px`;
		return Math.min(
			main.scrollHeight + back.offsetHeight + 14,
			window.innerHeight * 0.65,
		);
	};

	const set = (state: State) => {
		fm.dataset.state = state;
		overlay.hidden = state === "closed";
		button?.setAttribute("aria-expanded", String(state !== "closed"));
		for (const view of views) view.hidden = view.dataset.view !== state;

		if (state === "closed") {
			fm.style.width = "108px";
			fm.style.height = "39px";
		} else if (state === "open") {
			fm.style.width = "230px";
			fm.style.height = `${45 * itemCount + 14 + 42 + 8}px`;
		} else {
			const width = Math.min(330, window.innerWidth - 32);
			fm.style.width = `${width}px`;
			fm.style.height = `${tocHeight(width)}px`;
			fm.querySelector(".fm-toc-link.active")?.scrollIntoView({
				block: "center",
			});
		}
	};

	button?.addEventListener("click", () => set("open"));
	fm.querySelector(".fm-fold")?.addEventListener("click", () => set("closed"));
	fm.querySelector("[data-show-toc]")?.addEventListener("click", () =>
		set("toc"),
	);
	fm.querySelector(".fm-back")?.addEventListener("click", () => set("open"));
	// 検索を開いたときや目次の見出しへ移動したときはメニューを閉じる
	for (const el of fm.querySelectorAll("[data-open-search], .fm-toc-link")) {
		el.addEventListener("click", () => set("closed"));
	}
	overlay.addEventListener("click", () => set("closed"));
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && fm.dataset.state !== "closed") set("closed");
	});
	// PC 幅に戻したときや、bfcache から戻ったときは閉じた状態にする
	window
		.matchMedia("(width <= 640px)")
		.addEventListener("change", () => set("closed"));
	window.addEventListener("pageshow", () => set("closed"));
};
