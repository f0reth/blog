import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { fetchOgp } from "../../src/lib/fetchOgp";
import { startHtmlServer } from "../helpers/html";

const page = (head: string) =>
	`<!doctype html><html><head>${head}</head><body></body></html>`;

describe("fetchOgp", () => {
	let server: Awaited<ReturnType<typeof startHtmlServer>>;

	beforeAll(async () => {
		server = await startHtmlServer({
			"/ogp": {
				body: page(`
					<title>ページタイトル</title>
					<meta name="description" content="meta description">
					<meta property="og:title" content="OGP タイトル">
					<meta property="og:description" content="OGP 説明文">
					<meta property="og:image" content="https://example.com/ogp.png">
				`),
			},
			"/fallback": {
				body: page(`
					<title>ページタイトル</title>
					<meta name="description" content="meta description">
					<meta name="og:image" content="https://example.com/name-og-image.png">
				`),
			},
			"/empty-ogp": {
				body: page(`
					<title>ページタイトル</title>
					<meta name="description" content="meta description">
					<meta property="og:title" content="">
					<meta property="og:description" content="">
				`),
			},
			"/bare": { body: page("") },
			"/error": { status: 500, body: page("<title>Server Error</title>") },
		});
	});

	afterAll(() => server.close());

	test("OGP タグの title / description / image を取得し、ホストと favicon URL を付与する", async () => {
		const ogp = await fetchOgp(`${server.origin}/ogp`);

		expect(ogp).toEqual({
			title: "OGP タイトル",
			description: "OGP 説明文",
			image: "https://example.com/ogp.png",
			host: server.host,
			favicon: `https://www.google.com/s2/favicons?domain=${server.host}`,
		});
	});

	test("OGP タグがない場合は <title>・meta description・meta[name=og:image] にフォールバックする", async () => {
		const ogp = await fetchOgp(`${server.origin}/fallback`);

		expect(ogp).toMatchObject({
			title: "ページタイトル",
			description: "meta description",
			image: "https://example.com/name-og-image.png",
		});
	});

	test("OGP タグの content が空文字の場合もフォールバックする", async () => {
		const ogp = await fetchOgp(`${server.origin}/empty-ogp`);

		expect(ogp).toMatchObject({
			title: "ページタイトル",
			description: "meta description",
			image: undefined,
		});
	});

	test("メタ情報が何もないページでは host と favicon だけを返す", async () => {
		const ogp = await fetchOgp(`${server.origin}/bare`);

		expect(ogp).toEqual({
			title: undefined,
			description: undefined,
			image: undefined,
			host: server.host,
			favicon: `https://www.google.com/s2/favicons?domain=${server.host}`,
		});
	});

	test("取得に失敗した場合はビルドを止めずにエラーを出力し、host と favicon だけを返す", async () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		const ogp = await fetchOgp(`${server.origin}/error`);

		expect(ogp).toStrictEqual({
			host: server.host,
			favicon: `https://www.google.com/s2/favicons?domain=${server.host}`,
		});
		expect(consoleError).toHaveBeenCalledWith(
			expect.stringContaining("Error fetching OGP data"),
		);
		consoleError.mockRestore();
	});
});
