import { describe, expect, test } from "vitest";
import { SiteConfig } from "../../site.config";
import Head from "../../src/components/Head.astro";
import themeScript from "../../src/scripts/theme.js?raw";
import { createContainer, parseHtml } from "../helpers/html";

const render = async (props: Record<string, unknown>) => {
	const container = await createContainer();
	const html = await container.renderToString(Head, { props });
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

		expect(document.title).toBe("Bun で SQLite - d2m");
		expect(meta(document, 'name="description"')).toBe("記事の説明");
		expect(meta(document, 'property="og:title"')).toBe("Bun で SQLite - d2m");
		expect(meta(document, 'property="og:description"')).toBe("記事の説明");
		expect(meta(document, 'name="twitter:title"')).toBe("Bun で SQLite - d2m");
		expect(meta(document, 'name="twitter:description"')).toBe("記事の説明");
		expect(meta(document, 'property="og:image"')).toBe(
			"https://daichi2mori.com/ogps/20240714-bun-sqlite.png",
		);
		expect(meta(document, 'name="twitter:image"')).toBe(
			"https://daichi2mori.com/ogps/20240714-bun-sqlite.png",
		);
	});

	test("記事以外のページではサイト名・サイトの説明・共通の OGP 画像を使う", async () => {
		const document = await render({});

		expect(document.title).toBe(SiteConfig.blogName);
		expect(meta(document, 'name="description"')).toBe(SiteConfig.description);
		expect(meta(document, 'property="og:title"')).toBe(SiteConfig.blogName);
		expect(meta(document, 'property="og:image"')).toBe(
			"https://daichi2mori.com/ogp.png",
		);
	});

	test("テーマ切替スクリプトを描画前に実行されるようインラインで埋め込む", async () => {
		const document = await render({});

		const inlineScripts = [...document.querySelectorAll("script:not([src])")];
		expect(inlineScripts.map((s) => s.textContent)).toContain(themeScript);
	});
});
