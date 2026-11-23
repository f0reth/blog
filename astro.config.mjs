import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, passthroughImageService } from "astro/config";
import rehypeExternalLinks from "rehype-external-links";
import rehypePrettyCode from "rehype-pretty-code";
import { remarkAlert } from "remark-github-blockquote-alert";

export default defineConfig({
	site: "https://daichi2mori.com",
	output: "static",
	build: {
		// HonoX(SSG) と同じ `blog.html` / `blog/<slug>.html` 形式で出力する
		format: "file",
	},
	integrations: [mdx()],
	vite: {
		plugins: [tailwindcss()],
	},
	image: {
		// 記事画像は AVIF で用意済みのため変換せずそのまま配信する (WebP 変換だとサイズが増える)
		service: passthroughImageService(),
	},
	markdown: {
		// コードハイライトは rehype-pretty-code で行うため Astro 標準の Shiki は無効化
		syntaxHighlight: false,
		// remark/rehype プラグインを使うため unified ベースのプロセッサを指定する (.md / .mdx 共通)
		processor: unified({
			remarkPlugins: [remarkAlert],
			rehypePlugins: [
				[rehypeExternalLinks, { rel: ["noreferrer"], target: ["_blank"] }],
				[rehypePrettyCode, { theme: "dark-plus", keepBackground: false }],
			],
		}),
	},
	security: {
		csp: {
			// script-src / style-src には Astro がビルド時に計算したハッシュが自動で追加される
			directives: [
				"default-src 'self'",
				// LinkCard の OGP 画像・favicon は外部ドメインから読み込む
				"img-src 'self' https: data:",
				"object-src 'none'",
				"base-uri 'self'",
				"form-action 'self'",
			],
			styleDirective: {
				resources: [
					{ resource: "'self'", kind: "element" },
					// rehype-pretty-code がコードのトークンに style 属性で色を付けるため、
					// style 属性 (style-src-attr) に限り inline を許可する
					{ resource: "'unsafe-inline'", kind: "attribute" },
				],
			},
		},
	},
});
