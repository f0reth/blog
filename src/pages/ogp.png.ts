import type { APIRoute } from "astro";
import { SiteConfig } from "../../site.config";
import { renderOgImage } from "../lib/ogImage";

/** 記事以外のページ (トップ・一覧・タグ) で共通して使う OGP 画像 */
export const GET: APIRoute = async () => {
	const png = await renderOgImage(SiteConfig.description);
	return new Response(png, {
		headers: { "Content-Type": "image/png" },
	});
};
