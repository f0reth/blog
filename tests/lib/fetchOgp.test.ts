import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { fetchOgp } from "../../src/lib/fetchOgp";
import { startHtmlServer } from "../helpers/html";

const page = (head: string) =>
	`<!doctype html><html><head>${head}</head><body></body></html>`;

/** head の後に "<title>テスト</title>" を Shift_JIS でエンコードして続けたページ */
const shiftJisPage = (head: string) =>
	new Uint8Array([
		...new TextEncoder().encode(`<html><head>${head}<title>`),
		...[0x83, 0x65, 0x83, 0x58, 0x83, 0x67],
		...new TextEncoder().encode("</title></head></html>"),
	]);

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
			"/relative-image": {
				body: page(`<meta property="og:image" content="/images/og.png">`),
			},
			"/bare": { body: page("") },
			"/shift-jis": {
				contentType: "text/html; charset=Shift_JIS",
				body: shiftJisPage(""),
			},
			"/shift-jis-meta-charset": {
				contentType: "text/html",
				body: shiftJisPage('<meta charset="Shift_JIS">'),
			},
			"/shift-jis-http-equiv": {
				contentType: "text/html",
				body: shiftJisPage(
					'<meta http-equiv="Content-Type" content="text/html; charset=Shift_JIS">',
				),
			},
			"/hang": { hang: true },
			"/cached": { body: page("<title>キャッシュ</title>") },
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

	test("og:image が相対パスなら、リンク先ページを基準にした絶対 URL にする", async () => {
		const ogp = await fetchOgp(`${server.origin}/relative-image`);

		expect(ogp.image).toBe(`${server.origin}/images/og.png`);
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

	test("Content-Type の charset に従ってデコードする (Shift_JIS のページも文字化けしない)", async () => {
		const ogp = await fetchOgp(`${server.origin}/shift-jis`);

		expect(ogp.title).toBe("テスト");
	});

	test.each([
		["<meta charset>", "/shift-jis-meta-charset"],
		['<meta http-equiv="Content-Type">', "/shift-jis-http-equiv"],
	])(
		"Content-Type に charset がなければ HTML の %s に従ってデコードする",
		async (_label, path) => {
			const ogp = await fetchOgp(`${server.origin}${path}`);

			expect(ogp.title).toBe("テスト");
		},
	);

	test("同じ URL の OGP はビルド中に 1 回だけ取得する", async () => {
		const url = `${server.origin}/cached`;
		const [a, b] = await Promise.all([fetchOgp(url), fetchOgp(url)]);
		const c = await fetchOgp(url);

		expect(a.title).toBe("キャッシュ");
		expect(b).toBe(a);
		expect(c).toBe(a);
		expect(server.requestCount("/cached")).toBe(1);
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

	test("応答のないサイトは 10 秒でタイムアウトさせ、ビルドを止めずに host と favicon だけを返す", async () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		// 10 秒待たずに検証するため、タイムアウト用の signal を手動で中断できるものに差し替える
		const controller = new AbortController();
		const timeout = vi
			.spyOn(AbortSignal, "timeout")
			.mockReturnValue(controller.signal);

		const pending = fetchOgp(`${server.origin}/hang`);
		await vi.waitFor(() => expect(server.requestCount("/hang")).toBe(1));
		controller.abort(new DOMException("timed out", "TimeoutError"));

		expect(await pending).toStrictEqual({
			host: server.host,
			favicon: `https://www.google.com/s2/favicons?domain=${server.host}`,
		});
		expect(timeout).toHaveBeenCalledWith(10_000);
		expect(consoleError).toHaveBeenCalledWith(
			expect.stringContaining("timed out"),
		);
		timeout.mockRestore();
		consoleError.mockRestore();
	});
});
