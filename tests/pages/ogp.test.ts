import type { APIContext } from "astro";
import { describe, expect, test, vi } from "vitest";
import { SiteConfig } from "../../site.config";
import Head from "../../src/components/Head.astro";
import { renderOgImage } from "../../src/lib/ogImage";
import { getPosts, type Post } from "../../src/lib/posts";
import { GET as getSiteOgp } from "../../src/pages/ogp.png";
import {
	GET as getArticleOgp,
	getStaticPaths,
} from "../../src/pages/ogps/[slug].png";
import { createContainer, parseHtml } from "../helpers/html";
import { nonEmpty } from "../helpers/posts";

// 画像の描画自体は tests/lib/ogImage.test.ts で検証済みのため、ここではルーティングだけを見る
vi.mock("../../src/lib/ogImage", () => ({
	renderOgImage: vi.fn(async (title: string) =>
		new TextEncoder().encode(title),
	),
}));

/** Head が og:image に出力する URL のパス */
const ogImagePath = async (props: Record<string, unknown>) => {
	const container = await createContainer();
	const html = await container.renderToString(Head, { props });
	const content = parseHtml(`<html><head>${html}</head></html>`)
		.querySelector('meta[property="og:image"]')
		?.getAttribute("content");
	return new URL(content ?? "").pathname;
};

describe("/ogp.png", () => {
	test("記事以外のページの og:image が指す画像として、サイトの説明文を描いた PNG を生成する", async () => {
		expect(await ogImagePath({})).toBe("/ogp.png");

		const response = await getSiteOgp({} as APIContext);

		expect(response.headers.get("Content-Type")).toBe("image/png");
		expect(renderOgImage).toHaveBeenCalledWith(SiteConfig.description);
		expect(await response.text()).toBe(SiteConfig.description);
	});
});

describe("/ogps/[slug].png", () => {
	test("公開記事ごとに、記事ページの og:image が指す画像を生成する", async () => {
		const posts = nonEmpty(await getPosts());
		const paths = await getStaticPaths();

		expect(paths.map((path) => `/ogps/${path.params.slug}.png`)).toEqual(
			await Promise.all(
				posts.map((post) => ogImagePath({ title: "t", slug: post.id })),
			),
		);
	});

	test("記事タイトルを描いた PNG を返す", async () => {
		const [{ props }] = await getStaticPaths();

		const response = await getArticleOgp({
			props,
		} as unknown as APIContext<{ post: Post }>);

		expect(response.headers.get("Content-Type")).toBe("image/png");
		expect(renderOgImage).toHaveBeenCalledWith(props.post.data.title);
		expect(await response.text()).toBe(props.post.data.title);
	});
});
