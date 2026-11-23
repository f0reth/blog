/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Astro の Vite 設定 (astro:content などの仮想モジュール、.astro / .md / .mdx の変換) を引き継いでテストする
export default getViteConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		// 変換済みモジュールのキャッシュは astro.config.mjs の変更 (markdown プラグインなど) を検知できず、
		// 古い変換結果でテストが通ってしまうため無効化する
		fsModuleCache: false,
	},
});
