import { defineConfig, devices } from "@playwright/test";

// 実際のブラウザで、ビルド成果物を Workers Static Assets (wrangler dev) から配信して確認する E2E テスト。
// Workers Builds のビルド環境には Chromium の実行に必要なライブラリがないため、`bun run test:e2e` で手元で実行する
export default defineConfig({
	testDir: "e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	reporter: "list",
	use: {
		// wrangler dev の既定のポート
		baseURL: "http://localhost:8787",
		trace: "retain-on-failure",
		...devices["Desktop Chrome"],
	},
	webServer: {
		// astro build && wrangler dev
		command: "bun run preview",
		url: "http://localhost:8787",
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
