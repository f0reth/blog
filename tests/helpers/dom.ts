import { JSDOM } from "jsdom";
import { onTestFinished, vi } from "vitest";

type Options = {
	/** OS のカラースキームがダークか (prefers-color-scheme: dark) */
	systemDark?: boolean;
	/** 画面幅がスマホ幅か (width <= 640px) */
	mobile?: boolean;
	userAgent?: string;
	/** 開く前に localStorage に保存しておく値 */
	storage?: Record<string, string>;
};

/**
 * 描画した HTML をブラウザで開いたときのように、クライアントスクリプト (src/scripts) から
 * window / document / localStorage などをグローバルとして参照できるようにする。
 * jsdom に実装されていない API (dialog.showModal / scrollIntoView / matchMedia) は最小限の代替を入れる。
 */
export const openDom = (
	html: string,
	{ systemDark = false, mobile = false, userAgent, storage = {} }: Options = {},
) => {
	const dom = new JSDOM(html, {
		url: "https://f0reth.net/",
		// theme.js をページ内で実行するため (HTML 内の <script> は実行しない)
		runScripts: "outside-only",
	});
	const { window } = dom;

	// 後から値を切り替えて change を発火できる matchMedia
	const queries = new Map<
		string,
		{ matches: boolean; listeners: (() => void)[] }
	>([
		["(prefers-color-scheme: dark)", { matches: systemDark, listeners: [] }],
		["(width <= 640px)", { matches: mobile, listeners: [] }],
	]);
	window.matchMedia = (query: string) => {
		const state = queries.get(query);
		if (!state) throw new Error(`unexpected media query: ${query}`);
		return {
			media: query,
			get matches() {
				return state.matches;
			},
			addEventListener: (_type: string, listener: () => void) =>
				state.listeners.push(listener),
		} as unknown as MediaQueryList;
	};
	const setMedia = (query: string, matches: boolean) => {
		const state = queries.get(query);
		if (!state) throw new Error(`unexpected media query: ${query}`);
		state.matches = matches;
		for (const listener of state.listeners) listener();
	};

	const dialog = window.HTMLDialogElement.prototype;
	dialog.showModal = function () {
		this.open = true;
	};
	dialog.close = function () {
		if (!this.open) return;
		this.open = false;
		this.dispatchEvent(new window.Event("close"));
	};
	window.Element.prototype.scrollIntoView = vi.fn();

	if (userAgent) {
		Object.defineProperty(window.navigator, "userAgent", { value: userAgent });
	}
	for (const [key, value] of Object.entries(storage)) {
		window.localStorage.setItem(key, value);
	}

	// location.href への代入 (ページ遷移) を記録する
	const location = { href: window.location.href };

	vi.stubGlobal("window", window);
	vi.stubGlobal("document", window.document);
	vi.stubGlobal("localStorage", window.localStorage);
	vi.stubGlobal("navigator", window.navigator);
	vi.stubGlobal("location", location);
	onTestFinished(() => {
		vi.unstubAllGlobals();
		window.close();
	});

	const { document } = window;
	return {
		window,
		document,
		location,
		setMedia,
		click: (selector: string) => {
			const element = document.querySelector(selector);
			if (!element) throw new Error(`element not found: ${selector}`);
			// SVG 要素には click() がないため、クリックイベントを直接発火する
			element.dispatchEvent(
				new window.MouseEvent("click", { bubbles: true, cancelable: true }),
			);
			return element;
		},
		keydown: (
			key: string,
			init: KeyboardEventInit = {},
			target: EventTarget = document,
		) =>
			target.dispatchEvent(
				new window.KeyboardEvent("keydown", {
					key,
					bubbles: true,
					cancelable: true,
					...init,
				}),
			),
	};
};
