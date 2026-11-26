import { getCollection } from "astro:content";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { SiteConfig } from "../site.config";
import { getPosts } from "../src/lib/posts";
import { parseHtml } from "./helpers/html";
import { nonEmpty } from "./helpers/posts";

// `bun run test` が直前に実行する astro build の成果物 (Workers Static Assets として配信されるもの) を検証する
const dist = new URL("../dist/", import.meta.url);
if (!existsSync(new URL("index.html", dist))) {
	throw new Error(
		"dist/ がありません。`bun run test` (astro build を含む) で実行してください",
	);
}

const exists = (path: string) => {
	const url = new URL(`.${path}`, dist);
	return existsSync(url) && statSync(url).isFile();
};
const read = (path: string) => readFileSync(new URL(`.${path}`, dist));

/** wrangler.jsonc の html_handling: "auto-trailing-slash" と同じく、URL のパスを dist 内のファイルに解決する */
const resolvesToFile = (path: string) =>
	path.endsWith("/")
		? exists(`${path}index.html`)
		: exists(path) || exists(`${path}.html`);

const readPngSize = (png: Buffer) => ({
	signature: png.subarray(1, 4).toString(),
	width: png.readUInt32BE(16),
	height: png.readUInt32BE(20),
});

const pages = readdirSync(dist, { recursive: true, encoding: "utf8" })
	.filter((file) => file.endsWith(".html"))
	.map((file) => `/${file.replaceAll("\\", "/")}`)
	.sort()
	.map((file) => [file, parseHtml(read(file).toString())] as const);

const posts = nonEmpty(await getPosts());

describe("ビルド成果物", () => {
	test("公開記事ごとに記事ページと OGP 画像 (1200x630 の PNG) を出力し、下書きは出力しない", async () => {
		for (const post of posts) {
			expect(exists(`/blog/${post.id}.html`), post.id).toBe(true);
			expect(readPngSize(read(`/ogps/${post.id}.png`)), post.id).toEqual({
				signature: "PNG",
				width: 1200,
				height: 630,
			});
		}

		const drafts = nonEmpty(
			await getCollection("posts", ({ data }) => !data.published),
		);
		for (const draft of drafts) {
			expect(exists(`/blog/${draft.id}.html`), draft.id).toBe(false);
			expect(exists(`/ogps/${draft.id}.png`), draft.id).toBe(false);
		}
	});

	test("サイト共通の OGP 画像・RSS・検索用 JSON・レスポンスヘッダー設定を出力する", () => {
		expect(readPngSize(read("/ogp.png"))).toEqual({
			signature: "PNG",
			width: 1200,
			height: 630,
		});
		expect(read("/feed.xml").toString()).toContain("<rss");
		expect(JSON.parse(read("/search.json").toString())).toHaveLength(
			posts.length,
		);
		expect(read("/_headers").toString()).toContain("Strict-Transport-Security");
	});

	describe.each(pages)("%s", (_file, document) => {
		test("サイト内のリンク・画像・スクリプト・OGP の参照先がすべて存在する", () => {
			const refs = [
				...[...document.querySelectorAll("[href]")].map((el) =>
					el.getAttribute("href"),
				),
				...[...document.querySelectorAll("[src]")].map((el) =>
					el.getAttribute("src"),
				),
				...[
					...document.querySelectorAll(
						'meta[property="og:url"], meta[property="og:image"]',
					),
				].map((el) => el.getAttribute("content")),
			]
				.filter((ref): ref is string => !!ref)
				.map((ref) => ref.replace(SiteConfig.url, "/"))
				// 外部サイト (https://, //) とページ内リンク (#) は対象外
				.filter((ref) => ref.startsWith("/") && !ref.startsWith("//"))
				.map((ref) => decodeURI(ref.split(/[?#]/)[0]));

			expect(refs.length).toBeGreaterThan(0);
			expect(refs.filter((ref) => !resolvesToFile(ref))).toEqual([]);
		});

		test("ページ内リンク (目次など) の移動先の見出しがある", () => {
			const missing = [...document.querySelectorAll('a[href^="#"]')]
				.map((a) => decodeURIComponent(a.getAttribute("href")?.slice(1) ?? ""))
				.filter((id) => id && !document.getElementById(id));

			expect(missing).toEqual([]);
		});

		test("インラインのスクリプト・スタイルがすべて CSP で許可されている", () => {
			const csp = document
				.querySelector('meta[http-equiv="content-security-policy"]')
				?.getAttribute("content");
			expect(csp).toBeDefined();
			const directives = new Map(
				(csp ?? "")
					.split(";")
					.map((directive) => directive.trim().split(/\s+/))
					.filter(([name]) => name)
					.map(([name, ...sources]) => [name, sources]),
			);
			const sources = (name: string) =>
				directives.get(name) ??
				directives.get(name.split("-").slice(0, 2).join("-")) ??
				[];
			const hash = (text: string) =>
				`'sha256-${createHash("sha256").update(text).digest("base64")}'`;

			const blockedScripts = [...document.querySelectorAll("script:not([src])")]
				.map((script) => script.textContent ?? "")
				.filter((text) => !sources("script-src").includes(hash(text)));
			expect(blockedScripts).toEqual([]);

			const blockedStyles = [...document.querySelectorAll("style")]
				.map((style) => style.textContent ?? "")
				.filter((text) => !sources("style-src-elem").includes(hash(text)));
			expect(blockedStyles).toEqual([]);

			// 外部のスクリプト・スタイルは自サイトのもの ('self') だけを読み込む
			if (document.querySelector("script[src], link[rel='stylesheet']")) {
				expect(sources("script-src")).toContain("'self'");
				expect(sources("style-src-elem")).toContain("'self'");
			}
			// rehype-pretty-code などの style 属性
			if (document.querySelector("[style]")) {
				expect(sources("style-src-attr")).toContain("'unsafe-inline'");
			}
		});
	});

	test("描画前にテーマを適用するスクリプトが <head> にインラインで入っている", () => {
		const themeScript = readFileSync(
			new URL("../src/scripts/theme.js", import.meta.url),
			"utf8",
		);
		for (const [file, document] of pages) {
			const inline = [
				...document.querySelectorAll("head script:not([src])"),
			].map((script) => script.textContent);
			expect(inline, file).toContain(themeScript);
		}
	});

	test.each(pages.filter(([file]) => file.startsWith("/blog/")))(
		"%s: 本文の画像はすべてクリックで拡大できる形 (ImageLightbox が対象にする p > img) で出力される",
		(_file, document) => {
			const images = [...document.querySelectorAll(".markdown img")].filter(
				(img) => !img.closest(".link-card"),
			);
			const zoomable = document.querySelectorAll(".markdown p > img");

			expect(zoomable).toHaveLength(images.length);
		},
	);
});
