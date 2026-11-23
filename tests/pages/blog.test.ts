import { describe, expect, test, vi } from "vitest";
import { allTags } from "../../site.config";
import { getPosts, getPostsByTag } from "../../src/lib/posts";
import ArticlePage, {
	getStaticPaths as getArticlePaths,
} from "../../src/pages/blog/[slug].astro";
import BlogIndexPage from "../../src/pages/blog/index.astro";
import TagPage, {
	getStaticPaths as getTagPaths,
} from "../../src/pages/blog/tag/[tag].astro";
import { createContainer, parseHtml } from "../helpers/html";

// 記事内の <LinkCard> はビルド時に外部サイトへアクセスするため、ページのテストでは描画しない
vi.mock("../../src/components/LinkCard.astro", async () => ({
	default: (await import("../fixtures/StubLinkCard.astro")).default,
}));

const articleLinks = (document: Document) => [
	...new Set(
		[...document.querySelectorAll("main a[href^='/blog/']")]
			.map((a) => a.getAttribute("href"))
			.filter((href) => !href?.startsWith("/blog/tag/")),
	),
];

describe("/blog", () => {
	test("公開記事を新しい順にすべて一覧表示する", async () => {
		const container = await createContainer();
		const document = parseHtml(await container.renderToString(BlogIndexPage));

		const posts = await getPosts();
		expect(articleLinks(document)).toEqual(
			posts.map((post) => `/blog/${post.id}`),
		);
		expect(document.title).toBe("d2m");
	});
});

describe("/blog/tag/[tag]", () => {
	test("site.config.ts の全タグのページを生成する", () => {
		expect(getTagPaths().map((path) => path.params.tag)).toEqual(
			allTags.map((tag) => tag.id),
		);
	});

	test.each(allTags.map((tag) => tag.id))(
		"%s: そのタグを持つ公開記事だけを一覧表示する",
		async (tag) => {
			const container = await createContainer();
			const document = parseHtml(
				// getStaticPaths が props を返さないページは Props が never と推論されるためキャスト
				await container.renderToString(
					TagPage as unknown as Parameters<typeof container.renderToString>[0],
					{ params: { tag } },
				),
			);

			const posts = await getPostsByTag(tag);
			expect(articleLinks(document)).toEqual(
				posts.map((post) => `/blog/${post.id}`),
			);
		},
	);
});

describe("/blog/[slug]", async () => {
	const paths = await getArticlePaths();

	test("公開記事ごとにページを生成する", async () => {
		const posts = await getPosts();
		expect(paths.map((path) => path.params.slug)).toEqual(
			posts.map((post) => post.id),
		);
	});

	test.each(paths.map((path) => [path.params.slug, path] as const))(
		"%s: 記事本文とメタ情報を描画できる",
		async (slug, { params, props }) => {
			const container = await createContainer();
			const document = parseHtml(
				await container.renderToString(ArticlePage, { params, props }),
			);
			const { title, description, published_at } = props.post.data;

			expect(document.title).toBe(`${title} - d2m`);
			expect(
				document
					.querySelector('meta[name="description"]')
					?.getAttribute("content"),
			).toBe(description);
			expect(
				document
					.querySelector('meta[property="og:image"]')
					?.getAttribute("content"),
			).toBe(`https://daichi2mori.com/ogps/${slug}.png`);
			expect(document.querySelector("article h1")?.textContent?.trim()).toBe(
				title,
			);
			expect(document.querySelector("article")?.textContent).toContain(
				published_at,
			);
			expect(
				document.querySelector("article .markdown")?.textContent?.trim(),
			).not.toBe("");
		},
	);
});
