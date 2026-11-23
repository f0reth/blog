// レンダリングされる前に実行しないとチラつきが発生するため、<head> にインラインで埋め込む
(() => {
	const theme = () => {
		const currentTheme = localStorage.getItem("theme");
		const isDark =
			currentTheme === null
				? window.matchMedia("(prefers-color-scheme: dark)").matches
				: currentTheme === "dark";
		document.documentElement.classList.toggle("dark", isDark);
	};

	theme();
	// androidのブラウザバックのback forward cache対策
	window.addEventListener("pageshow", theme);
})();
