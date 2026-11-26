import { beforeAll, describe, expect, test, vi } from "vitest";
import HomePage from "../../src/pages/index.astro";
import type { SearchItem } from "../../src/pages/search.json";
import { setupSearchModal } from "../../src/scripts/search";
import { openDom } from "../helpers/dom";
import { renderHtml } from "../helpers/html";

const item = (slug: string, title: string, tags: string[] = []) => ({
	url: `/blog/${slug}`,
	title,
	description: `${title} の説明`,
	date: "2024年1月1日",
	tags,
});

// /search.json と同じく新しい順
const items: SearchItem[] = [
	item("go-sqlc", "Go で sqlc を使う", ["Go言語"]),
	item("scoop", "Scoop の使い方", ["Windows"]),
	item("go-cobra", "Go の CLI を cobra で作る", ["Go言語"]),
	item("uv", "uv の使い方", ["Python"]),
	item("bun-sqlite", "Bun で SQLite", ["Bun", "SQLite"]),
	item("unocss", "UnoCSS", ["CSS"]),
];

let html: string;
beforeAll(async () => {
	html = await renderHtml(HomePage);
});

/** fetch・JSON の解決 (Promise) と描画が終わるのを待つ */
const settle = () => new Promise((resolve) => setTimeout(resolve));

const openPage = (options?: Parameters<typeof openDom>[1]) => {
	const page = openDom(html, options);
	const fetchMock = vi.fn(async (_url: string) => ({
		json: async () => items,
	}));
	vi.stubGlobal("fetch", fetchMock);
	setupSearchModal();

	const dialog = page.document.querySelector<HTMLDialogElement>(
		".search-modal",
	) as HTMLDialogElement;
	const input = dialog.querySelector<HTMLInputElement>(
		".search-input",
	) as HTMLInputElement;
	const results = dialog.querySelector(".results") as HTMLElement;

	return {
		...page,
		fetchMock,
		dialog,
		input,
		results,
		open: async () => {
			page.keydown("k", { ctrlKey: true });
			await settle();
		},
		type: async (value: string) => {
			input.value = value;
			input.dispatchEvent(new page.window.Event("input"));
			await settle();
		},
		hits: () =>
			[...results.querySelectorAll(".result")].map((a) =>
				a.getAttribute("href"),
			),
		selected: () =>
			results
				.querySelector(".result[aria-selected='true']")
				?.getAttribute("href"),
	};
};

describe("検索モーダル", () => {
	test("Ctrl+K / ⌘K で開閉し、ブラウザ既定のショートカットは止める", () => {
		const { dialog, keydown } = openPage();

		expect(keydown("k", { ctrlKey: true })).toBe(false); // preventDefault された
		expect(dialog.open).toBe(true);
		keydown("K", { ctrlKey: true });
		expect(dialog.open).toBe(false);
		keydown("k", { metaKey: true });
		expect(dialog.open).toBe(true);
	});

	test("修飾キーなしの K では開かない", () => {
		const { dialog, keydown } = openPage();

		keydown("k");
		expect(dialog.open).toBe(false);
	});

	test.each([
		["ナビの検索ボタン", ".capsule-nav [data-open-search] .search-text"],
		["スマホ用メニューの Search", ".fm [data-open-search] .fm-label"],
	])("%sから開く", (_label, selector) => {
		const { dialog, click } = openPage();

		click(selector);
		expect(dialog.open).toBe(true);
	});

	test("開くと入力欄を空にし、最近の記事として新しい順に 5 件を出す", async () => {
		const page = openPage();
		page.input.value = "前回の入力";

		await page.open();

		expect(page.input.value).toBe("");
		expect(page.results.querySelector(".label")?.textContent).toBe(
			"最近の記事",
		);
		expect(page.hits()).toEqual(items.slice(0, 5).map(({ url }) => url));
		expect(page.selected()).toBe(items[0].url);
	});

	test("記事一覧は初めて開いたときに /search.json から 1 回だけ取得する", async () => {
		const page = openPage();

		expect(page.fetchMock).not.toHaveBeenCalled();
		await page.open();
		await page.type("go");
		page.dialog.close();
		await page.open();

		expect(page.fetchMock).toHaveBeenCalledTimes(1);
		expect(page.fetchMock).toHaveBeenCalledWith("/search.json");
	});

	test("入力に一致する記事を、一致した部分を強調して表示する", async () => {
		const page = openPage();
		await page.open();

		await page.type("GO");

		expect(page.hits()).toEqual(["/blog/go-sqlc", "/blog/go-cobra"]);
		const first = page.results.querySelector(".result");
		expect(
			[...(first?.querySelectorAll(".result-title mark") ?? [])].map(
				(mark) => mark.textContent,
			),
		).toEqual(["Go"]);
		expect(first?.querySelector(".result-tags")?.textContent).toBe("#Go言語");
		expect(page.results.querySelector(".label")).toBeNull();
	});

	test("一致する記事がなければその旨を表示する", async () => {
		const page = openPage();
		await page.open();

		await page.type("  rust ");

		expect(page.hits()).toEqual([]);
		expect(page.results.textContent).toBe("「rust」に一致する記事はありません");
	});

	test("↑↓ で選択を移動し (端では反対側へ循環)、Enter で選択中の記事へ移動する", async () => {
		const page = openPage();
		await page.open();
		await page.type("go");
		const down = () => page.keydown("ArrowDown", {}, page.input);
		const up = () => page.keydown("ArrowUp", {}, page.input);

		expect(down()).toBe(false); // カーソル移動を止める
		expect(page.selected()).toBe("/blog/go-cobra");
		down();
		expect(page.selected()).toBe("/blog/go-sqlc");
		up();
		expect(page.selected()).toBe("/blog/go-cobra");
		expect(page.window.Element.prototype.scrollIntoView).toHaveBeenCalled();

		page.keydown("Enter", {}, page.input);
		expect(page.location.href).toBe("/blog/go-cobra");
	});

	test("入力し直すと選択は先頭に戻る", async () => {
		const page = openPage();
		await page.open();
		await page.type("go");
		page.keydown("ArrowDown", {}, page.input);

		await page.type("go ");

		expect(page.selected()).toBe("/blog/go-sqlc");
	});

	test("一致する記事がないときの Enter では移動しない", async () => {
		const page = openPage();
		await page.open();
		await page.type("rust");

		page.keydown("Enter", {}, page.input);

		expect(page.location.href).toBe("https://f0reth.net/");
	});

	test("パネルの外側をクリックすると閉じ、パネル内のクリックでは閉じない", async () => {
		const page = openPage();
		await page.open();

		page.input.click();
		expect(page.dialog.open).toBe(true);
		// ::backdrop のクリックは dialog 自体へのクリックとして届く
		page.dialog.click();
		expect(page.dialog.open).toBe(false);
	});

	test.each([
		["Mac", "⌘K", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"],
		["Windows", "Ctrl K", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"],
	])("%s ではショートカットを %s と表示する", (_os, label, userAgent) => {
		const { document } = openPage({ userAgent });

		expect(document.querySelector("[data-search-shortcut]")?.textContent).toBe(
			label,
		);
	});
});
