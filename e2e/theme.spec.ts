import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const html = (page: Page) => page.locator("html");
const themeButton = (page: Page, name: "System" | "Light" | "Dark") =>
	page.locator(".theme-switch").getByRole("button", { name });

test.describe("テーマ", () => {
	test("System (既定) では OS のカラースキームに従い、変更にもその場で追従する", async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: "dark" });
		await page.goto("/");
		await expect(themeButton(page, "System")).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(html(page)).toHaveClass(/dark/);

		await page.emulateMedia({ colorScheme: "light" });
		await expect(html(page)).not.toHaveClass(/dark/);
	});

	test("選んだテーマを OS の設定より優先し、再読み込み・別ページでも描画前から適用する", async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: "light" });
		await page.goto("/");

		await themeButton(page, "Dark").click();
		await expect(html(page)).toHaveClass(/dark/);

		// HTML の解析直後 (ページのスクリプトや CSS の読み込み前) の状態を記録する
		await page.addInitScript(() => {
			document.addEventListener("DOMContentLoaded", () => {
				sessionStorage.setItem(
					"darkAtParse",
					String(document.documentElement.classList.contains("dark")),
				);
			});
		});
		await page.goto("/about");
		expect(
			await page.evaluate(() => sessionStorage.getItem("darkAtParse")),
		).toBe("true");
		await expect(themeButton(page, "Dark")).toHaveAttribute(
			"aria-pressed",
			"true",
		);

		await themeButton(page, "Light").click();
		await page.emulateMedia({ colorScheme: "dark" });
		await page.reload();
		await expect(html(page)).not.toHaveClass(/dark/);
	});

	test("System に戻すと保存したテーマを消して OS の設定に従う", async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: "dark" });
		await page.goto("/");
		await themeButton(page, "Light").click();
		await expect(html(page)).not.toHaveClass(/dark/);

		await themeButton(page, "System").click();

		await expect(html(page)).toHaveClass(/dark/);
		expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
	});
});
