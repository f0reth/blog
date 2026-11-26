import { afterAll, beforeAll, describe, expect, test } from "vitest";
import LinkCard from "../src/components/LinkCard.astro";
import MarkdownFixture from "./fixtures/markdown-features.md";
import MdxFixture from "./fixtures/markdown-features.mdx";
import StubLinkCard from "./fixtures/StubLinkCard.astro";
import { createContainer, parseHtml, startHtmlServer } from "./helpers/html";

// astro.config.mjs の markdown 設定 (remark/rehype プラグイン) が .md と .mdx の両方に効いていることを確認する
describe.each([
	["Markdown (.md)", MarkdownFixture],
	["MDX (.mdx)", MdxFixture],
])("%s の変換", (_label, Fixture) => {
	let document: Document;

	beforeAll(async () => {
		const container = await createContainer();
		// MDX 内の <LinkCard> は下の describe で検証するため、ここでは描画しない
		const html = await container.renderToString(Fixture, {
			props: { components: { LinkCard: StubLinkCard } },
		});
		document = parseHtml(html);
	});

	test("外部リンクは新しいタブで開き、リファラーを送らない", () => {
		const external = document.querySelector('a[href="https://example.com/"]');
		expect(external?.getAttribute("target")).toBe("_blank");
		expect(external?.getAttribute("rel")).toBe("noreferrer");
	});

	test("サイト内リンクは同じタブで開く", () => {
		const internal = document.querySelector('a[href="/blog"]');
		expect(internal?.hasAttribute("target")).toBe(false);
		expect(internal?.hasAttribute("rel")).toBe(false);
	});

	test("GitHub 形式のアラート (> [!WARNING]) をアラートブロックに変換する", () => {
		const alert = document.querySelector(
			".markdown-alert.markdown-alert-warning",
		);
		expect(alert?.querySelector(".markdown-alert-title")?.textContent).toBe(
			"WARNING",
		);
		expect(alert?.textContent).toContain("警告文");
	});

	test("コードブロックをライト/ダーク両方のテーマでハイライトし、背景色はサイトの CSS に任せる", () => {
		const pre = document.querySelector(
			"figure[data-rehype-pretty-code-figure] pre",
		);
		expect(pre?.getAttribute("data-language")).toBe("go");
		expect(pre?.getAttribute("data-theme")).toBe("github-light github-dark");
		expect(pre?.getAttribute("style") ?? "").not.toContain("background");
		// サイトのテーマに合わせて CSS で切り替えられるよう、色は CSS 変数で両方持つ
		const tokens = [...(pre?.querySelectorAll("[data-line] span") ?? [])];
		expect(tokens.length).toBeGreaterThan(0);
		for (const token of tokens) {
			expect(token.getAttribute("style")).toMatch(
				/--shiki-light:.+;--shiki-dark:/,
			);
		}
	});

	test("コードブロックにコピーボタンを追加する", () => {
		const button = document.querySelector(
			"figure[data-rehype-pretty-code-figure] > button.copy-button",
		);
		expect(button?.getAttribute("type")).toBe("button");
		expect(button?.getAttribute("aria-label")).toBe("コードをコピー");
	});
});

describe("MDX 内の <LinkCard>", () => {
	let server: Awaited<ReturnType<typeof startHtmlServer>>;

	beforeAll(async () => {
		server = await startHtmlServer({
			"/article": {
				body: `<html><head>
					<meta property="og:title" content="リンク先の記事">
					<meta property="og:description" content="リンク先の説明">
					<meta property="og:image" content="https://example.com/card.png">
				</head></html>`,
			},
		});
	});

	afterAll(() => server.close());

	test("記事ページと同じく components で渡した LinkCard がリンク先の OGP カードとして展開される", async () => {
		const container = await createContainer();
		const html = await container.renderToString(MdxFixture, {
			props: {
				components: { LinkCard },
				linkCardUrl: `${server.origin}/article`,
			},
		});
		const card = parseHtml(html).querySelector(
			`a[href="${server.origin}/article"]`,
		);

		expect(card?.textContent).toContain("リンク先の記事");
		expect(card?.textContent).toContain("リンク先の説明");
		expect(card?.querySelector('img[alt="ogp"]')?.getAttribute("src")).toBe(
			"https://example.com/card.png",
		);
	});
});
