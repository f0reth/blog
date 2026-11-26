import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { ARTICLE, ARTICLE_WITH_IMAGES, expect, test } from "./fixtures";

/** URL のハッシュ (日本語の見出しはエンコードされるため戻す) */
const hash = (page: Page) => decodeURIComponent(new URL(page.url()).hash);

test.describe("記事ページ", () => {
	test("スクロールに合わせて目次の現在位置が移り、目次から見出しへ移動できる", async ({
		page,
	}) => {
		await page.goto(ARTICLE);
		const links = page.locator(".sidebar .toc-link");
		await expect(links.first()).toHaveClass(/active/);

		const target = links.nth(2);
		const href = (await target.getAttribute("href")) ?? "";
		await page.locator(href).evaluate((heading) => {
			window.scrollTo(0, heading.getBoundingClientRect().top + scrollY - 100);
		});
		await expect(target).toHaveClass(/active/);
		await expect(page.locator(".sidebar .toc-link.active")).toHaveCount(1);

		await page.evaluate(() => window.scrollTo(0, 0));
		await links.last().click();
		const last = (await links.last().getAttribute("href")) ?? "";
		await expect.poll(() => hash(page)).toBe(last);
		await expect(page.locator(last)).toBeInViewport();
		await expect(links.last()).toHaveClass(/active/);
	});

	test("コードブロックのコピーボタンで、元のコードをそのままクリップボードにコピーする", async ({
		page,
		context,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"]);
		await page.goto(ARTICLE);
		// posts/ の記事に書かれたコード (空行を含む)
		const source = readFileSync(
			new URL(
				`../posts${ARTICLE.replace("/blog", "")}/index.mdx`,
				import.meta.url,
			),
			"utf8",
		).match(
			/```ts showLineNumbers title="src\/db\.ts"\r?\n([\s\S]*?)\r?\n```/,
		)?.[1];
		expect(source).toContain("\n\n");

		const figure = page
			.locator("figure[data-rehype-pretty-code-figure]")
			.filter({ hasText: "src/db.ts" });
		await figure.hover();
		const button = figure.getByRole("button", { name: "コードをコピー" });
		await button.click();

		await expect(button).toHaveAttribute("data-copied", "");
		// Windows のクリップボードは読み出し時に改行を CRLF にするため、改行コードを揃えて比べる
		const copied = await page.evaluate(() => navigator.clipboard.readText());
		expect(copied.replaceAll("\r\n", "\n")).toBe(
			source?.replaceAll("\r\n", "\n"),
		);
		// 2 秒後にアイコンが戻る
		await expect(button).not.toHaveAttribute("data-copied", { timeout: 4000 });
	});

	test("本文の画像をクリックすると拡大表示し、前後に切り替えて閉じられる", async ({
		page,
	}) => {
		await page.goto(ARTICLE_WITH_IMAGES);
		const images = page.locator(".markdown p > img");
		await expect(images).toHaveCount(3);
		const lightbox = page.locator(".lightbox");

		await images.nth(1).click();
		await expect(lightbox).toBeVisible();
		await expect(lightbox.locator(".count")).toHaveText("2 / 3");
		await expect(lightbox.locator("img")).toHaveJSProperty(
			"src",
			await images.nth(1).evaluate((img: HTMLImageElement) => img.src),
		);
		// 拡大した画像が実際に読み込まれている
		expect(
			await lightbox
				.locator("img")
				.evaluate(
					(img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
				),
		).toBe(true);

		await page.keyboard.press("ArrowRight");
		await expect(lightbox.locator(".count")).toHaveText("3 / 3");
		await lightbox.getByRole("button", { name: "次の画像" }).click();
		await expect(lightbox.locator(".count")).toHaveText("1 / 3");

		await page.keyboard.press("Escape");
		await expect(lightbox).toBeHidden();

		await images.first().click();
		await lightbox.getByRole("button", { name: "閉じる" }).click();
		await expect(lightbox).toBeHidden();
	});

	test("前後の記事へのリンクで移動できる", async ({ page }) => {
		await page.goto(ARTICLE);
		const older = page.locator(".post-nav .older");
		const title = (await older.locator(".title").textContent()) ?? "";

		await older.click();

		await expect(page.locator(".post-header h1")).toHaveText(title);
	});
});

test.describe("スマホ表示", () => {
	test.use({
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
	});

	test("メニューから各ページへ移動でき、記事ページでは目次から見出しへ移動できる", async ({
		page,
	}) => {
		await page.goto("/");
		await expect(page.locator(".capsule-nav .links")).toBeHidden();
		const menuButton = page.getByRole("button", { name: "Open menu" });

		await menuButton.tap();
		await page.locator(".fm-item", { hasText: "Tags" }).tap();
		await expect(page).toHaveURL("/tags");

		await page.goto(ARTICLE);
		await menuButton.tap();
		await page.locator(".fm-item", { hasText: "Contents" }).tap();
		const tocLinks = page.locator(".fm-toc-link");
		await expect(tocLinks.first()).toBeVisible();

		const target = tocLinks.nth(2);
		const href = (await target.getAttribute("href")) ?? "";
		await target.tap();

		await expect(menuButton).toBeVisible();
		await expect.poll(() => hash(page)).toBe(href);
		await expect(page.locator(href)).toBeInViewport();
	});

	test("メニューの Search から検索を開き、Esc でメニューも閉じた状態になる", async ({
		page,
	}) => {
		await page.goto("/");
		await page.getByRole("button", { name: "Open menu" }).tap();
		await page.locator(".fm-item", { hasText: "Search" }).tap();

		await expect(page.locator(".search-modal")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator(".search-modal")).toBeHidden();
		await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
	});

	test("メニューの外側をタップすると閉じる", async ({ page }) => {
		await page.goto("/");
		await page.getByRole("button", { name: "Open menu" }).tap();
		await expect(page.locator(".fm-item", { hasText: "Home" })).toBeVisible();

		await page.locator(".fm-overlay").tap({ position: { x: 10, y: 10 } });

		await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
	});
});
