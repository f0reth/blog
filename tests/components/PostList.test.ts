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
			tags: ["bun", "golang"],
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

const render = async (props: { posts: Post[] }) => {
	const container = await createContainer();
	return parseHtml(await container.renderToString(PostList, { props }));
};

test("受け取った順に記事の投稿日・タイトル・説明を表示し、タイトルから記事ページへリンクする", async () => {
	const document = await render({ posts });

	const items = [...document.querySelectorAll("li")];
	expect(items).toHaveLength(2);

	const [first, second] = items;
	const title = (item: Element) => item.querySelector("h3 a");
	expect(title(first)?.textContent).toBe("新しい記事");
	expect(title(first)?.getAttribute("href")).toBe("/blog/20250101-new");
	expect(title(second)?.getAttribute("href")).toBe("/blog/20240101-old");

	expect(first.querySelector("p")?.textContent).toBe("新しい記事の説明");
	expect(first.querySelector("time")?.getAttribute("datetime")).toBe(
		"2025-01-01",
	);
	expect(first.querySelector("time")?.textContent).toBe("2025年1月1日");
});

test("タグを表示名付きのタグページへのリンクとして、指定順に並べる", async () => {
	const document = await render({ posts });

	const links = [
		...document.querySelectorAll("li")[0].querySelectorAll(".tags a"),
	].map((a) => ({ href: a.getAttribute("href"), label: a.textContent }));
	expect(links).toEqual([
		{ href: "/tags/bun", label: "#Bun" },
		{ href: "/tags/golang", label: "#Go言語" },
	]);
});

test("記事がなければ何も並べない", async () => {
	const document = await render({ posts: [] });

	expect(document.querySelectorAll("li")).toHaveLength(0);
});
