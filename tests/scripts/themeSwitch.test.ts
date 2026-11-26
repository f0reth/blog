import { beforeAll, describe, expect, test, vi } from "vitest";
import HomePage from "../../src/pages/index.astro";
import themeScript from "../../src/scripts/theme.js?raw";
import { setupThemeSwitch } from "../../src/scripts/themeSwitch";
import { openDom } from "../helpers/dom";
import { renderHtml } from "../helpers/html";

type Theme = "system" | "light" | "dark";

let html: string;
beforeAll(async () => {
	html = await renderHtml(HomePage);
});

/** <head> の theme.js を実行してからテーマ切替ボタンを動かす (実際のページと同じ順序) */
const openPage = ({
	stored,
	systemDark = false,
}: {
	stored?: Exclude<Theme, "system">;
	systemDark?: boolean;
}) => {
	const page = openDom(html, {
		systemDark,
		storage: stored ? { theme: stored } : {},
	});
	page.window.eval(themeScript);
	const darkAfterThemeJs = isDark(page.document);
	setupThemeSwitch();
	return {
		...page,
		darkAfterThemeJs,
		choose: (theme: Theme) =>
			page.click(`.theme-switch button[data-theme="${theme}"]`),
	};
};

const isDark = (document: Document) =>
	document.documentElement.classList.contains("dark");

const pressed = (document: Document) =>
	[
		...document.querySelectorAll(".theme-switch button[aria-pressed='true']"),
	].map((button) => button.getAttribute("data-theme"));

describe("テーマ切替ボタン", () => {
	test.each([
		{ stored: undefined, expected: "system" },
		{ stored: "light", expected: "light" },
		{ stored: "dark", expected: "dark" },
	] as const)(
		"保存済みのテーマ ($stored) のボタンだけを押下状態にする",
		({ stored, expected }) => {
			const { document } = openPage({ stored });

			expect(pressed(document)).toEqual([expected]);
		},
	);

	test.each([
		{ stored: undefined, systemDark: true },
		{ stored: undefined, systemDark: false },
		{ stored: "light", systemDark: true },
		{ stored: "dark", systemDark: false },
	] as const)(
		"theme.js が描画前に適用したテーマを変えない (stored: $stored, OS dark: $systemDark)",
		({ stored, systemDark }) => {
			const { document, darkAfterThemeJs } = openPage({ stored, systemDark });

			expect(isDark(document)).toBe(darkAfterThemeJs);
		},
	);

	test("Dark / Light を選ぶと保存してその場で切り替える", () => {
		const { document, window, choose } = openPage({ systemDark: false });

		choose("dark");
		expect(window.localStorage.getItem("theme")).toBe("dark");
		expect(isDark(document)).toBe(true);
		expect(pressed(document)).toEqual(["dark"]);

		choose("light");
		expect(window.localStorage.getItem("theme")).toBe("light");
		expect(isDark(document)).toBe(false);
		expect(pressed(document)).toEqual(["light"]);
	});

	test("System を選ぶと保存を消して OS のカラースキームに従い、以降の OS の変更にも追従する", () => {
		const { document, window, choose, setMedia } = openPage({
			stored: "dark",
			systemDark: false,
		});

		choose("system");
		expect(window.localStorage.getItem("theme")).toBeNull();
		expect(isDark(document)).toBe(false);
		expect(pressed(document)).toEqual(["system"]);

		// OS の変更への追従は theme.js が担う
		setMedia("(prefers-color-scheme: dark)", true);
		expect(isDark(document)).toBe(true);
	});

	test("View Transitions に対応したブラウザではトランジションの中で切り替え、スキップされてもエラーにしない", async () => {
		const { document, choose } = openPage({});
		const startViewTransition = vi.fn((update: () => void) => {
			update();
			// ページ遷移中などでトランジションがスキップされた場合
			return { ready: Promise.reject(new Error("Transition was skipped")) };
		});
		Object.assign(document, { startViewTransition });

		choose("dark");
		await new Promise((resolve) => setTimeout(resolve));

		expect(startViewTransition).toHaveBeenCalledOnce();
		expect(isDark(document)).toBe(true);
	});

	test("bfcache から戻ったとき (pageshow) は別タブで変えたテーマを反映する", () => {
		const { document, window } = openPage({ stored: "dark" });

		window.localStorage.setItem("theme", "light");
		window.dispatchEvent(new window.Event("pageshow"));

		expect(isDark(document)).toBe(false);
		expect(pressed(document)).toEqual(["light"]);
	});
});
