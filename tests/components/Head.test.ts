import { describe, expect, test } from "vitest";
import { SiteConfig } from "../../site.config";
import Head from "../../src/components/Head.astro";
import themeScript from "../../src/scripts/theme.js?raw";
import { createContainer, parseHtml } from "../helpers/html";

const render = async (props: Record<string, unknown>, path = "/") => {
	const container = await createContainer();
	const html = await container.renderToString(Head, {
		props,
		request: new Request(new URL(path, "http://localhost")),
	});
	// <head> の中身として解釈させる
	return parseHtml(`<html><head>${html}</head></html>`);
};

const meta = (document: Document, selector: string) =>
	document.querySelector(`meta[${selector}]`)?.getAttribute("content");

describe("Head", () => {
	test("記事ページではタイトル・説明・記事ごとの OGP 画像を設定する", async () => {
		const document = await render({
			title: "Bun で SQLite",
			desc: "記事の説明",
			slug: "20240714-bun-sqlite",
		});

		expect(document.title).toBe("Bun で SQLite - f0reth");
		expect(meta(document, 'name="description"')).toBe("記事の説明");
		expect(meta(document, 'property="og:title"')).toBe(
			"Bun で SQLite - f0reth",
		);
		expect(meta(document, 'property="og:description"')).toBe("記事の説明");
		expect(meta(document, 'name="twitter:title"')).toBe(
			"Bun で SQLite - f0reth",
		);
		expect(meta(document, 'name="twitter:description"')).toBe("記事の説明");
		expect(meta(document, 'property="og:image"')).toBe(
			"https://f0reth.net/ogps/20240714-bun-sqlite.png",
		);
		expect(meta(document, 'name="twitter:image"')).toBe(
			"https://f0reth.net/ogps/20240714-bun-sqlite.png",
		);
	});

	test("og:url はビルド時の .html 付きパスではなく公開 URL を指す", async () => {
		const ogUrl = async (path: string) =>
			meta(await render({}, path), 'property="og:url"');

		expect(await ogUrl("/index.html")).toBe("https://f0reth.net/");
		expect(await ogUrl("/tags.html")).toBe("https://f0reth.net/tags");
		expect(await ogUrl("/blog/20240714-bun-sqlite.html")).toBe(
			"https://f0reth.net/blog/20240714-bun-sqlite",
		);
	});

	test("記事ページの og:type は article、それ以外は website", async () => {
		expect(meta(await render({ slug: "x" }), 'property="og:type"')).toBe(
			"article",
		);
		expect(meta(await render({}), 'property="og:type"')).toBe("website");
	});

	test("記事以外のページではサイト名・サイトの説明・共通の OGP 画像を使う", async () => {
		const document = await render({});

		expect(document.title).toBe(SiteConfig.blogName);
		expect(meta(document, 'name="description"')).toBe(SiteConfig.description);
		expect(meta(document, 'property="og:title"')).toBe(SiteConfig.blogName);
		expect(meta(document, 'property="og:image"')).toBe(
			"https://f0reth.net/ogp.png",
		);
	});

	test("独自のダークテーマを Dark Reader に上書きさせない", async () => {
		const document = await render({});

		expect(
			document.querySelector('meta[name="darkreader-lock"]'),
		).not.toBeNull();
	});

	test("テーマ切替スクリプトを描画前に実行されるようインラインで埋め込む", async () => {
		const document = await render({});

		const inlineScripts = [...document.querySelectorAll("script:not([src])")];
		expect(inlineScripts.map((s) => s.textContent)).toContain(themeScript);
	});
});
