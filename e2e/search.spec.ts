import { expect, test } from "./fixtures";

test.describe("検索", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
	});

	test("Ctrl+K で開き、入力に一致する記事を一致部分を強調して表示する", async ({
		page,
	}) => {
		const dialog = page.locator(".search-modal");

		await page.keyboard.press("Control+k");

		await expect(dialog).toBeVisible();
		await expect(dialog.locator(".search-input")).toBeFocused();
		await expect(dialog.locator(".label")).toHaveText("最近の記事");
		await expect(dialog.locator(".result")).toHaveCount(5);

		await page.keyboard.type("sqlite");
		await expect(dialog.locator(".label")).toHaveCount(0);
		const results = dialog.locator(".result");
		await expect(results.first()).toBeVisible();
		for (const text of await results.allTextContents()) {
			expect(text.toLowerCase()).toContain("sqlite");
		}
		await expect(results.first().locator("mark").first()).toHaveText(/sqlite/i);
	});

	test("↓ で選んだ記事を Enter で開く", async ({ page }) => {
		await page.keyboard.press("Control+k");
		await page.keyboard.type("go");
		const dialog = page.locator(".search-modal");
		await expect(dialog.locator(".result").nth(1)).toBeVisible();

		await page.keyboard.press("ArrowDown");
		const selected = dialog.locator(".result[aria-selected='true']");
		await expect(selected).toHaveCount(1);
		const href = await selected.getAttribute("href");
		expect(href).toBe(
			await dialog.locator(".result").nth(1).getAttribute("href"),
		);
		await page.keyboard.press("Enter");

		await expect(page).toHaveURL(href ?? "");
		await expect(page.locator(".post-header h1")).toBeVisible();
	});

	test("一致する記事がなければその旨を表示する", async ({ page }) => {
		await page.keyboard.press("Control+k");
		await page.keyboard.type("zzzzzz");

		await expect(page.locator(".search-modal .empty")).toHaveText(
			"「zzzzzz」に一致する記事はありません",
		);
	});

	test("ナビの検索ボタンから開き、Esc やパネルの外側のクリックで閉じる", async ({
		page,
	}) => {
		const dialog = page.locator(".search-modal");

		await page.locator(".capsule-nav .search-button").click();
		await expect(dialog).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();

		await page.locator(".capsule-nav .search-button").click();
		await expect(dialog).toBeVisible();
		await page.mouse.click(5, 5);
		await expect(dialog).toBeHidden();
	});
});
