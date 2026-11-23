import { readFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const FONT_CSS_URL = "https://fonts.googleapis.com/css2";
const FONT_FILE_URL = "https://fonts.gstatic.com/s/notosansjp/font.otf";

const fontFile = new Uint8Array(
	readFileSync(
		new URL("../fixtures/fonts/NotoSans-Regular.otf", import.meta.url),
	),
);
// アバター画像の代わりに返す 1x1 の PNG
const avatarPng = new Uint8Array(
	new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>')
		.render()
		.asPng(),
);

type Overrides = {
	css?: () => Response;
	font?: () => Response;
};

/** Google Fonts とアバター画像の取得を置き換える fetch スタブ */
const stubFetch = (overrides: Overrides = {}) => {
	const fetchMock = vi.fn(async (input: string | URL | Request) => {
		const url = input instanceof Request ? input.url : String(input);
		if (url.startsWith(FONT_CSS_URL)) {
			return (
				overrides.css?.() ??
				new Response(
					`@font-face { font-family: 'Noto Sans JP'; src: url(${FONT_FILE_URL}) format('opentype'); }`,
				)
			);
		}
		if (url === FONT_FILE_URL) {
			return overrides.font?.() ?? new Response(fontFile);
		}
		if (url.startsWith("https://avatars.githubusercontent.com/")) {
			return new Response(avatarPng, {
				headers: { "Content-Type": "image/png" },
			});
		}
		return new Response("not found", { status: 404 });
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
};

const requestedUrls = (fetchMock: ReturnType<typeof stubFetch>) =>
	fetchMock.mock.calls.map(([input]) =>
		input instanceof Request ? input.url : String(input),
	);

const readPngSize = (png: Uint8Array) => {
	const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
	return { width: view.getUint32(16), height: view.getUint32(20) };
};

// フォントはモジュールスコープでキャッシュされるため、テストごとにモジュールを読み直す
const loadRenderOgImage = async () =>
	(await import("../../src/lib/ogImage")).renderOgImage;

describe("renderOgImage", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	test("1200x630 の PNG 画像を生成する", async () => {
		stubFetch();
		const renderOgImage = await loadRenderOgImage();

		const png = await renderOgImage("Hello OGP");

		expect(Array.from(png.subarray(0, 8))).toEqual([
			0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		]);
		expect(readPngSize(png)).toEqual({ width: 1200, height: 630 });
		// Response のボディとしてそのまま返せる
		expect(png.buffer).toBeInstanceOf(ArrayBuffer);
	});

	test("タイトルが画像に描画される (タイトルが違えば異なる画像になる)", async () => {
		stubFetch();
		const renderOgImage = await loadRenderOgImage();

		const a = await renderOgImage("First article");
		const b = await renderOgImage("Second article");

		expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
	});

	test("Google Fonts から Noto Sans JP (weight 600) を取得する", async () => {
		const fetchMock = stubFetch();
		const renderOgImage = await loadRenderOgImage();

		await renderOgImage("Font request");

		const cssUrl = requestedUrls(fetchMock).find((url) =>
			url.startsWith(FONT_CSS_URL),
		);
		expect(cssUrl).toContain("family=Noto+Sans+JP:wght@600");
		expect(requestedUrls(fetchMock)).toContain(FONT_FILE_URL);
	});

	test("複数の画像を生成してもフォントの取得は 1 回だけ", async () => {
		const fetchMock = stubFetch();
		const renderOgImage = await loadRenderOgImage();

		await renderOgImage("One");
		await renderOgImage("Two");
		await renderOgImage("Three");

		const fontRequests = requestedUrls(fetchMock).filter(
			(url) => url.startsWith(FONT_CSS_URL) || url === FONT_FILE_URL,
		);
		expect(fontRequests).toHaveLength(2);
	});

	test("フォント CSS の取得に失敗したらエラーにする", async () => {
		stubFetch({ css: () => new Response("error", { status: 500 }) });
		const renderOgImage = await loadRenderOgImage();

		await expect(renderOgImage("x")).rejects.toThrow(
			"Failed to fetch Google Font CSS",
		);
	});

	test("CSS に satori が読める形式 (TTF/OTF) のフォントがなければエラーにする", async () => {
		stubFetch({
			css: () =>
				new Response(
					`@font-face { src: url(${FONT_FILE_URL}) format('woff2'); }`,
				),
		});
		const renderOgImage = await loadRenderOgImage();

		await expect(renderOgImage("x")).rejects.toThrow("Could not find font URL");
	});

	test("フォントファイルの取得に失敗したらエラーにする", async () => {
		stubFetch({ font: () => new Response("error", { status: 404 }) });
		const renderOgImage = await loadRenderOgImage();

		await expect(renderOgImage("x")).rejects.toThrow(
			"Failed to fetch font file",
		);
	});
});
