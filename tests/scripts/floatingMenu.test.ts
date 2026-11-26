import { beforeAll, describe, expect, test, vi } from "vitest";
import HomePage from "../../src/pages/index.astro";
import { setupFloatingMenu } from "../../src/scripts/floatingMenu";
import { setupSearchModal } from "../../src/scripts/search";
import { setupToc } from "../../src/scripts/toc";
import { openDom } from "../helpers/dom";
import { renderArticle, renderHtml } from "../helpers/html";

// 記事内の <LinkCard> はビルド時に外部サイトへアクセスするため、ここでは描画しない
vi.mock("../../src/components/LinkCard.astro", async () => ({
	default: (await import("../fixtures/StubLinkCard.astro")).default,
}));

let homeHtml: string;
let articleHtml: string;
beforeAll(async () => {
	homeHtml = await renderHtml(HomePage);
	articleHtml = await renderArticle("20240714-bun-sqlite");
});

const openPage = (html: string) => {
	const page = openDom(html, { mobile: true });
	setupFloatingMenu();
	const fm = page.document.querySelector<HTMLElement>(".fm") as HTMLElement;
	return {
		...page,
		fm,
		/** 見た目の状態: 開閉状態・表示中のビュー・オーバーレイ・aria-expanded */
		state: () => ({
			state: fm.dataset.state,
			views: [...fm.querySelectorAll<HTMLElement>("[data-view]")]
				.filter((view) => !view.hidden)
				.map((view) => view.dataset.view),
			overlay: !page.document.querySelector<HTMLElement>(".fm-overlay")?.hidden,
			expanded: fm.querySelector(".fm-button")?.getAttribute("aria-expanded"),
		}),
	};
};

const closed = {
	state: "closed",
	views: ["closed"],
	overlay: false,
	expanded: "false",
};
const opened = {
	state: "open",
	views: ["open"],
	overlay: true,
	expanded: "true",
};
const toc = { state: "toc", views: ["toc"], overlay: true, expanded: "true" };

describe("スマホ用メニュー", () => {
	test("メニューボタンで開き、たたむボタンで閉じる", () => {
		const page = openPage(homeHtml);
		expect(page.state()).toEqual(closed);

		page.click(".fm-button");
		expect(page.state()).toEqual(opened);

		page.click(".fm-fold");
		expect(page.state()).toEqual(closed);
	});

	test.each([
		["Esc キー", (page: ReturnType<typeof openPage>) => page.keydown("Escape")],
		[
			"メニューの外側のクリック",
			(page: ReturnType<typeof openPage>) => page.click(".fm-overlay"),
		],
		[
			"PC 幅への切り替え",
			(page: ReturnType<typeof openPage>) =>
				page.setMedia("(width <= 640px)", false),
		],
		[
			"bfcache からの復元",
			(page: ReturnType<typeof openPage>) =>
				page.window.dispatchEvent(new page.window.Event("pageshow")),
		],
	])("%sで閉じる", (_label, action) => {
		const page = openPage(homeHtml);
		page.click(".fm-button");

		action(page);

		expect(page.state()).toEqual(closed);
	});

	test("開いたときの高さを、並んでいる項目がすべて収まるように合わせる", () => {
		const heights = [homeHtml, articleHtml].map((html) => {
			const page = openPage(html);
			page.click(".fm-button");
			const items = page.fm.querySelectorAll(".fm-list > li").length;
			return { items, height: page.fm.style.height };
		});

		// 1 項目 45px + 上下の余白 14px + たたむボタン 42px + 間隔 8px
		for (const { items, height } of heights) {
			expect(height).toBe(`${45 * items + 14 + 42 + 8}px`);
		}
		// 記事ページは Contents の分だけ高い
		expect(heights[1].items).toBe(heights[0].items + 1);
	});

	test("記事ページでは Contents で目次に切り替え、戻るボタンでメニューに戻る", () => {
		const page = openPage(articleHtml);
		page.click(".fm-button");

		page.click("[data-show-toc]");
		expect(page.state()).toEqual(toc);

		page.click(".fm-back");
		expect(page.state()).toEqual(opened);
	});

	test("目次の見出しを選ぶとメニューを閉じる", () => {
		const page = openPage(articleHtml);
		page.click(".fm-button");
		page.click("[data-show-toc]");

		page.click(".fm-toc-link");

		expect(page.state()).toEqual(closed);
	});

	test("目次を開いたときは、現在読んでいる見出しが見える位置までスクロールする", () => {
		const page = openPage(articleHtml);
		setupToc();
		const active = page.fm.querySelector(".fm-toc-link.active");
		expect(active).not.toBeNull();

		page.click(".fm-button");
		page.click("[data-show-toc]");

		expect(page.window.Element.prototype.scrollIntoView).toHaveBeenCalledWith({
			block: "center",
		});
		expect(
			vi.mocked(page.window.Element.prototype.scrollIntoView).mock.contexts,
		).toContain(active);
	});

	test("Search を選ぶとメニューを閉じて検索モーダルを開く", () => {
		const page = openPage(homeHtml);
		vi.stubGlobal("fetch", async () => ({ json: async () => [] }));
		setupSearchModal();
		page.click(".fm-button");

		page.click(".fm [data-open-search]");

		expect(page.state()).toEqual(closed);
		expect(
			page.document.querySelector<HTMLDialogElement>(".search-modal")?.open,
		).toBe(true);
	});
});
