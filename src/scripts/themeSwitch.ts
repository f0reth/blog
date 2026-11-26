/** テーマ (System / Light / Dark) の切り替えボタン。描画前のテーマ適用は theme.js が行う */
export const setupThemeSwitch = () => {
	const media = window.matchMedia("(prefers-color-scheme: dark)");
	const buttons = document.querySelectorAll<HTMLButtonElement>(
		".theme-switch button",
	);

	const current = () => localStorage.getItem("theme") ?? "system";

	const apply = () => {
		const theme = current();
		const isDark = theme === "system" ? media.matches : theme === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		for (const button of buttons) {
			button.setAttribute(
				"aria-pressed",
				String(button.dataset.theme === theme),
			);
		}
	};

	for (const button of buttons) {
		button.addEventListener("click", () => {
			const theme = button.dataset.theme ?? "system";
			if (theme === "system") localStorage.removeItem("theme");
			else localStorage.setItem("theme", theme);

			if (!document.startViewTransition) return apply();
			// ページ遷移のトランジション中はスキップされ reject されるが、apply 自体は実行されるため無視する
			document.startViewTransition(apply).ready.catch(() => {});
		});
	}

	apply();
	window.addEventListener("pageshow", apply);
};
