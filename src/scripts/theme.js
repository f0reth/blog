// レンダリングされる前に実行しないとチラつきが発生するため、<head> にインラインで埋め込む。
// localStorage の theme が "light" / "dark" ならそれを使い、未保存なら OS の設定 (System) に従う
(() => {
	const media = window.matchMedia("(prefers-color-scheme: dark)");
	const theme = () => {
		const stored = localStorage.getItem("theme");
		const isDark = stored === null ? media.matches : stored === "dark";
		document.documentElement.classList.toggle("dark", isDark);
	};

	theme();
	// System のときは OS の設定変更にその場で追従する
	media.addEventListener("change", theme);
	// androidのブラウザバックのback forward cache対策
	window.addEventListener("pageshow", theme);
})();
