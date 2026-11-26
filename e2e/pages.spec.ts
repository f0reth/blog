import { ARTICLE, expect, test } from "./fixtures";

test.describe("配信", () => {
	for (const path of ["/", "/tags", "/tags/golang", "/about", ARTICLE]) {
		test(`${path} を拡張子なしの URL で表示できる`, async ({ page }) => {
			const response = await page.goto(path);

			expect(response?.status()).toBe(200);
			await expect(page.locator("main h1").first()).toBeVisible();
			// 遅れて読み込まれるスクリプトのエラーや CSP 違反も拾う
			await page.waitForLoadState("networkidle");
		});
	}

	test("_headers のセキュリティヘッダーを付けて配信する", async ({ page }) => {
		const response = await page.goto("/");

		expect(response?.headers()["strict-transport-security"]).toContain(
			"max-age=",
		);
		expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
	});

	test("ナビのリンクで各ページへ移動できる", async ({ page }) => {
		await page.goto("/");
		const nav = page.locator(".capsule-nav");

		await nav.getByRole("link", { name: "Tags" }).click();
		await expect(page).toHaveURL("/tags");
		await expect(nav.getByRole("link", { name: "Tags" })).toHaveAttribute(
			"aria-current",
			"page",
		);

		await page.locator("main ul a").first().click();
		await expect(page).toHaveURL(/\/tags\/[a-z]+$/);
		await page.locator("main .post-list h3 a").first().click();
		await expect(page).toHaveURL(/\/blog\/[\w-]+$/);
		await expect(page.locator(".post-header h1")).toBeVisible();
	});
});
