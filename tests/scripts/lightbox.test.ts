import { beforeAll, describe, expect, test, vi } from "vitest";
import { setupImageLightbox } from "../../src/scripts/lightbox";
import { openDom } from "../helpers/dom";
import { renderArticle } from "../helpers/html";

// 記事内の <LinkCard> はビルド時に外部サイトへアクセスするため、ここでは描画しない
vi.mock("../../src/components/LinkCard.astro", async () => ({
	default: (await import("../fixtures/StubLinkCard.astro")).default,
}));

// 本文に画像が 3 枚ある記事と 1 枚だけの記事
let multiHtml: string;
let singleHtml: string;
beforeAll(async () => {
	multiHtml = await renderArticle(
		"20240713-windows11-wakes-up-from-sleep-by-itself",
	);
	singleHtml = await renderArticle("20240714-bun-sqlite");
});

const openPage = (html: string) => {
	const page = openDom(html);
	setupImageLightbox();
	const dialog = page.document.querySelector<HTMLDialogElement>(
		".lightbox",
	) as HTMLDialogElement;
	const images = [
		...page.document.querySelectorAll<HTMLImageElement>(".markdown img"),
	];
	return {
		...page,
		dialog,
		images,
		/** 拡大表示中の画像と「n / 全体」の表示 */
		shown: () => ({
			src: dialog.querySelector("img")?.src,
			count: dialog.querySelector(".count")?.textContent,
		}),
		expected: (i: number) => ({
			src: images[i].src,
			count: `${i + 1} / ${images.length}`,
		}),
	};
};

describe("画像の拡大表示", () => {
	test("本文の画像をクリックすると、その画像を代替テキスト付きで拡大表示する", () => {
		const page = openPage(multiHtml);
		expect(page.images).toHaveLength(3);

		page.images[1].click();

		expect(page.dialog.open).toBe(true);
		expect(page.shown()).toEqual(page.expected(1));
		expect(page.dialog.querySelector("img")?.alt).toBe(page.images[1].alt);
	});

	test("前後のボタンで切り替え、端では反対側へ循環する", () => {
		const page = openPage(multiHtml);
		page.images[2].click();

		// ボタン内のアイコンをクリックしても反応する
		page.click(".lightbox .next svg");
		expect(page.shown()).toEqual(page.expected(0));
		page.click(".lightbox .prev");
		expect(page.shown()).toEqual(page.expected(2));
		page.click(".lightbox .prev");
		expect(page.shown()).toEqual(page.expected(1));
	});

	test("← → キーで切り替える", () => {
		const page = openPage(multiHtml);
		page.images[0].click();

		page.keydown("ArrowLeft", {}, page.dialog);
		expect(page.shown()).toEqual(page.expected(2));
		page.keydown("ArrowRight", {}, page.dialog);
		expect(page.shown()).toEqual(page.expected(0));
	});

	test("閉じるボタンや画像の外側のクリックで閉じ、拡大画像のクリックでは閉じない", () => {
		const page = openPage(multiHtml);
		page.images[0].click();

		page.click(".lightbox img");
		expect(page.dialog.open).toBe(true);
		page.click(".lightbox .close svg");
		expect(page.dialog.open).toBe(false);

		page.images[0].click();
		// ::backdrop のクリックは dialog 自体へのクリックとして届く
		page.dialog.click();
		expect(page.dialog.open).toBe(false);
	});

	test("画像が 1 枚だけの記事では前後ボタンを隠すための data-single を付ける", () => {
		expect(openPage(singleHtml).dialog.hasAttribute("data-single")).toBe(true);
		expect(openPage(multiHtml).dialog.hasAttribute("data-single")).toBe(false);
	});
});
