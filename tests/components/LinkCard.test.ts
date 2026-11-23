import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import LinkCard from "../../src/components/LinkCard.astro";
import { createContainer, parseHtml, startHtmlServer } from "../helpers/html";

describe("LinkCard", () => {
	let server: Awaited<ReturnType<typeof startHtmlServer>>;

	beforeAll(async () => {
		server = await startHtmlServer({
			"/docs": {
				body: `<html><head>
					<meta property="og:title" content="Getting Started">
					<meta property="og:description" content="ドキュメントの説明">
					<meta property="og:image" content="https://example.com/docs.png">
				</head></html>`,
			},
		});
	});

	afterAll(() => server.close());

	test("ビルド時にリンク先の OGP を取得し、外部リンクのカードとして描画する", async () => {
		const container = await createContainer();
		const url = `${server.origin}/docs`;
		const document = parseHtml(
			await container.renderToString(LinkCard, { props: { url } }),
		);

		const card = document.querySelector("a");
		expect(card?.getAttribute("href")).toBe(url);
		expect(card?.getAttribute("target")).toBe("_blank");
		expect(card?.getAttribute("rel")).toBe("noreferrer");

		expect(card?.textContent).toContain("Getting Started");
		expect(card?.textContent).toContain("ドキュメントの説明");
		expect(card?.textContent).toContain(server.host);
		expect(document.querySelector('img[alt="ogp"]')?.getAttribute("src")).toBe(
			"https://example.com/docs.png",
		);
		expect(
			document.querySelector('img[alt="favicon"]')?.getAttribute("src"),
		).toBe(`https://www.google.com/s2/favicons?domain=${server.host}`);
	});

	test("OGP を取得できなくても URL・ホスト名・favicon でカードを描画し、OGP 画像は出さない", async () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const container = await createContainer();
		const url = `${server.origin}/not-found`;
		const document = parseHtml(
			await container.renderToString(LinkCard, { props: { url } }),
		);
		consoleError.mockRestore();

		const card = document.querySelector("a");
		expect(card?.getAttribute("href")).toBe(url);
		expect(card?.textContent).toContain(url);
		expect(card?.textContent).toContain(server.host);
		expect(
			document.querySelector('img[alt="favicon"]')?.getAttribute("src"),
		).toBe(`https://www.google.com/s2/favicons?domain=${server.host}`);
		expect(document.querySelector('img[alt="ogp"]')).toBeNull();
	});
});
