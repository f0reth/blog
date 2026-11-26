import { test as base, expect } from "@playwright/test";

/** 本文に見出し・コードブロック・画像 (1 枚) がある記事 */
export const ARTICLE = "/blog/20240714-bun-sqlite";
/** 本文に画像が 3 枚ある記事 */
export const ARTICLE_WITH_IMAGES =
	"/blog/20240713-windows11-wakes-up-from-sleep-by-itself";

/** すべてのテストで、ページ上のスクリプトエラーと CSP 違反がないことも確認する */
export const test = base.extend({
	page: async ({ page }, use) => {
		const errors: string[] = [];
		page.on("pageerror", (error) => errors.push(error.message));
		page.on("console", (message) => {
			if (
				message.type() === "error" &&
				/Content Security Policy|CSP violation/.test(message.text())
			) {
				errors.push(message.text());
			}
		});
		await page.addInitScript(() => {
			document.addEventListener("securitypolicyviolation", (event) => {
				console.error(
					`CSP violation: ${event.violatedDirective} ${event.blockedURI}`,
				);
			});
		});

		await use(page);

		expect(errors, "スクリプトエラー・CSP 違反").toEqual([]);
	},
});

export { expect };
