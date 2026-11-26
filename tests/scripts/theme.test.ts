import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import themeScript from "../../src/scripts/theme.js?raw";

type Options = {
	stored: "dark" | "light" | null;
	systemDark: boolean;
};

/** ブラウザでページを開いたときと同じように <head> のスクリプトを実行する */
const openPage = ({ stored, systemDark }: Options) => {
	const dom = new JSDOM(
		"<!doctype html><html><head></head><body></body></html>",
		{
			url: "https://daichi2mori.com/",
			runScripts: "outside-only",
		},
	);
	const { window } = dom;
	// OS のカラースキームを後から切り替えられる matchMedia
	const listeners: (() => void)[] = [];
	const media = {
		matches: systemDark,
		media: "(prefers-color-scheme: dark)",
		addEventListener: (_type: string, listener: () => void) =>
			listeners.push(listener),
	};
	window.matchMedia = () => media as unknown as MediaQueryList;
	if (stored) window.localStorage.setItem("theme", stored);

	window.eval(themeScript);

	const setSystemDark = (dark: boolean) => {
		media.matches = dark;
		for (const listener of listeners) listener();
	};
	return { window, setSystemDark };
};

const isDark = (window: JSDOM["window"]) =>
	window.document.documentElement.classList.contains("dark");

describe("テーマ初期化スクリプト", () => {
	test.each([
		{ stored: "dark", systemDark: false, expected: true },
		{ stored: "light", systemDark: true, expected: false },
	] as const)(
		"保存済みのテーマ ($stored) を OS 設定より優先する",
		({ stored, systemDark, expected }) => {
			expect(isDark(openPage({ stored, systemDark }).window)).toBe(expected);
		},
	);

	test.each([
		{ systemDark: true, expected: true },
		{ systemDark: false, expected: false },
	])(
		"テーマ未保存 (System) なら OS のカラースキーム (dark: $systemDark) に従う",
		({ systemDark, expected }) => {
			expect(isDark(openPage({ stored: null, systemDark }).window)).toBe(
				expected,
			);
		},
	);

	test("System のときは OS のカラースキームの変更にその場で追従する", () => {
		const { window, setSystemDark } = openPage({
			stored: null,
			systemDark: false,
		});

		setSystemDark(true);
		expect(isDark(window)).toBe(true);
		setSystemDark(false);
		expect(isDark(window)).toBe(false);
	});

	test("テーマを保存していれば OS のカラースキームが変わっても切り替えない", () => {
		const { window, setSystemDark } = openPage({
			stored: "light",
			systemDark: false,
		});

		setSystemDark(true);
		expect(isDark(window)).toBe(false);
	});

	test("bfcache から復元されたとき (pageshow) に最新の保存内容を反映し直す", () => {
		const { window } = openPage({ stored: "dark", systemDark: false });
		expect(isDark(window)).toBe(true);

		// 別タブなどでライトテーマに切り替えられた後、戻るボタンでページが復元される
		window.localStorage.setItem("theme", "light");
		window.dispatchEvent(new window.Event("pageshow"));

		expect(isDark(window)).toBe(false);
	});
});
