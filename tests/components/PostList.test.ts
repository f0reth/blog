import { expect, test } from "vitest";
import PostList from "../../src/components/PostList.astro";
import type { Post } from "../../src/lib/posts";
import { createContainer, parseHtml } from "../helpers/html";

const posts = [
	{
		id: "20250101-new",
		data: {
			title: "新しい記事",
			description: "新しい記事の説明",
			published_at: "2025-01-01",
			modified: null,
			published: true,
			tags: ["bun"],
		},
	},
	{
		id: "20240101-old",
		data: {
			title: "古い記事",
			description: "古い記事の説明",
			published_at: "2024-01-01",
			modified: "2024-06-01",
			published: true,
			tags: ["golang"],
		},
	},
] as unknown as Post[];

test("受け取った順に記事のタイトル・説明・投稿情報を表示し、記事ページへリンクする", async () => {
	const container = await createContainer();
	const document = parseHtml(
		await container.renderToString(PostList, { props: { posts } }),
	);

	const items = [...document.querySelectorAll("body > div > div")];
	expect(items).toHaveLength(2);

	const [first, second] = items;
	expect(first.querySelector("p")?.textContent).toBe("新しい記事の説明");
	expect(second.querySelector("p")?.textContent).toBe("古い記事の説明");

	// タイトルのリンクと矢印ボタンの両方が記事ページを指す
	const articleLinks = (item: Element) =>
		[...item.querySelectorAll('a[href^="/blog/2"]')].map((a) =>
			a.getAttribute("href"),
		);
	expect(articleLinks(first)).toEqual([
		"/blog/20250101-new",
		"/blog/20250101-new",
	]);
	expect(articleLinks(second)).toEqual([
		"/blog/20240101-old",
		"/blog/20240101-old",
	]);
	expect(
		first.querySelector('a[href="/blog/20250101-new"]')?.textContent,
	).toContain("新しい記事");

	expect(first.textContent).toContain("2025-01-01");
	expect(first.querySelector('a[href="/blog/tag/bun"]')).not.toBeNull();
	expect(second.textContent).toContain("2024-06-01");
	expect(second.querySelector('a[href="/blog/tag/golang"]')).not.toBeNull();
});

test("記事がなければ何も並べない", async () => {
	const container = await createContainer();
	const document = parseHtml(
		await container.renderToString(PostList, { props: { posts: [] } }),
	);

	expect(document.querySelectorAll("a")).toHaveLength(0);
});
