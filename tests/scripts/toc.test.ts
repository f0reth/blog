import { beforeAll, describe, expect, test, vi } from "vitest";
import { setupToc } from "../../src/scripts/toc";
import { openDom } from "../helpers/dom";
import { renderArticle } from "../helpers/html";

// 記事内の <LinkCard> はビルド時に外部サイトへアクセスするため、ここでは描画しない
vi.mock("../../src/components/LinkCard.astro", async () => ({
	default: (await import("../fixtures/StubLinkCard.astro")).default,
}));

let html: string;
beforeAll(async () => {
	html = await renderArticle("20240714-bun-sqlite");
});

const openPage = () => {
	const page = openDom(html);
	const ids = [
		...page.document.querySelectorAll<HTMLElement>(".sidebar [data-toc-link]"),
	].map((link) => link.dataset.tocLink as string);
	const headings = ids.map(
		(id) => page.document.getElementById(id) as HTMLElement,
	);
	expect(headings.length).toBeGreaterThanOrEqual(3);

	/** 各見出しが 600px 間隔で並ぶページを scrollY だけスクロールした状態にする */
	const scrollTo = (scrollY: number) => {
		headings.forEach((heading, i) => {
			const top = 300 + i * 600 - scrollY;
			heading.getBoundingClientRect = () => ({ top }) as DOMRect;
		});
		page.window.dispatchEvent(new page.window.Event("scroll"));
	};
	scrollTo(0);
	setupToc();

	const active = (selector: string) =>
		[...page.document.querySelectorAll(`${selector}.active`)].map((link) =>
			link.getAttribute("href"),
		);
	return { ids, scrollTo, active };
};

describe("目次の現在位置", () => {
	test("ページ先頭では最初の見出しを強調する", () => {
		const { ids, active } = openPage();

		expect(active(".toc-link")).toEqual([`#${ids[0]}`]);
	});

	test("スクロールすると、画面上部を通り過ぎた最後の見出しをサイドバーとスマホ用メニューの両方で強調する", () => {
		const { ids, scrollTo, active } = openPage();

		// 3 つ目の見出し (top = 300 + 1200 - 1400 = 100px) が画面上部 140px を通り過ぎた
		scrollTo(1400);

		expect(active(".toc-link")).toEqual([`#${ids[2]}`]);
		expect(active(".fm-toc-link")).toEqual([`#${ids[2]}`]);
	});

	test("上に戻ると強調も戻る", () => {
		const { ids, scrollTo, active } = openPage();
		scrollTo(1400);

		scrollTo(200);

		expect(active(".toc-link")).toEqual([`#${ids[0]}`]);
	});
});
