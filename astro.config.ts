import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import { defineConfig, passthroughImageService } from "astro/config";
import rehypeExternalLinks from "rehype-external-links";
import rehypePrettyCode from "rehype-pretty-code";
import { remarkAlert } from "remark-github-blockquote-alert";
import { SiteConfig } from "./site.config";
import { rehypeCopyButton } from "./src/lib/rehypeCopyButton";

export default defineConfig({
	site: SiteConfig.url,
	output: "static",
	build: {
		// `blog.html` / `blog/<slug>.html` 形式で出力する
		format: "file",
		// LinkCard の OGP 取得や OGP 画像用フォントの取得など、ネットワーク待ちを並行させる
		concurrency: 8,
	},
	integrations: [mdx()],
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
				// ライト/ダークの色を CSS 変数 (--shiki-light / --shiki-dark) で出力し、サイトのテーマに合わせて切り替える
				[
					rehypePrettyCode,
					{
						theme: { light: "github-light", dark: "github-dark" },
						keepBackground: false,
					},
				],
				rehypeCopyButton,
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
