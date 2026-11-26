// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import type { SearchItem } from "../../src/pages/search.json";
import { highlight, searchPosts } from "../../src/scripts/search";

const item = (
	title: string,
	description = "",
	tags: string[] = [],
): SearchItem => ({
	url: `/blog/${title}`,
	title,
	description,
	date: "2024年1月1日",
	tags,
});

const items = [
	item("Go言語基礎", "ファイル分割やテスト", ["Go言語"]),
	item("Bun で SQLite", "Todo を実装", ["Bun", "SQLite"]),
	item("UbuntuでPortの切断", "golang ではなく Linux の話", ["Linux"]),
	item("Scoop の使い方"),
	item("UnoCSS", "", ["CSS"]),
	item("uv の使い方", "", ["Python"]),
];

const titles = (results: SearchItem[]) => results.map(({ title }) => title);

describe("searchPosts", () => {
	test("タイトル・説明・タグのいずれかに含まれる記事を、大文字小文字を区別せず並び順どおりに返す", () => {
		expect(titles(searchPosts(items, "go"))).toEqual([
			"Go言語基礎",
			"UbuntuでPortの切断",
		]);
		expect(titles(searchPosts(items, "sqlite"))).toEqual(["Bun で SQLite"]);
		expect(titles(searchPosts(items, "css"))).toEqual(["UnoCSS"]);
	});

	test("前後の空白は無視し、一致しなければ空配列を返す", () => {
		expect(titles(searchPosts(items, "  todo "))).toEqual(["Bun で SQLite"]);
		expect(searchPosts(items, "rust")).toEqual([]);
	});

	test("クエリが空なら先頭 (最新) から limit 件を返す", () => {
		expect(titles(searchPosts(items, " "))).toEqual(titles(items.slice(0, 5)));
		expect(searchPosts(items, "", 2)).toEqual(items.slice(0, 2));
	});
});

describe("highlight", () => {
	const html = (nodes: Node[]) => {
		const div = document.createElement("div");
		div.append(...nodes);
		return div.innerHTML;
	};

	test("一致する部分を元の大文字小文字のまま <mark> で囲む", () => {
		expect(html(highlight("Go言語とgolang", "GO"))).toBe(
			"<mark>Go</mark>言語と<mark>go</mark>lang",
		);
	});

	test("テキストは HTML として解釈せずにそのまま扱う", () => {
		expect(html(highlight("<b>go</b>", "go"))).toBe(
			"&lt;b&gt;<mark>go</mark>&lt;/b&gt;",
		);
	});

	test("クエリが空ならテキストをそのまま返す", () => {
		expect(html(highlight("Go言語", ""))).toBe("Go言語");
	});
});
