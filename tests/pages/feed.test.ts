import { getCollection } from "astro:content";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, test } from "vitest";
import { getPosts } from "../../src/lib/posts";
import { GET } from "../../src/pages/feed.xml";
import { nonEmpty } from "../helpers/posts";

describe("/feed.xml", () => {
	let response: Response;
	let feed: Document;

	beforeAll(async () => {
		response = await GET();
		feed = new JSDOM(await response.text(), { contentType: "text/xml" }).window
			.document;
	});

	test("XML として配信する", () => {
		expect(response.headers.get("Content-Type")).toBe("application/xml");
		expect(feed.documentElement.nodeName).toBe("rss");
	});

	test("ブログの情報をチャンネルに設定する", () => {
		const channel = feed.querySelector("channel");
		expect(channel?.querySelector(":scope > title")?.textContent).toBe(
			"f0rethのブログ",
		);
		expect(channel?.querySelector(":scope > link")?.textContent).toBe(
			"https://f0reth.net/",
		);
		expect(channel?.querySelector(":scope > language")?.textContent).toBe("ja");
	});

	test("公開記事だけを新しい順に、記事ページへのリンク付きで掲載する", async () => {
		const posts = nonEmpty(await getPosts());
		const items = [...feed.querySelectorAll("item")].map((item) => ({
			title: item.querySelector("title")?.textContent,
			link: item.querySelector("link")?.textContent,
			description: item.querySelector("description")?.textContent,
			pubDate: item.querySelector("pubDate")?.textContent,
		}));

		expect(items).toEqual(
			posts.map((post) => ({
				title: post.data.title,
				link: `https://f0reth.net/blog/${post.id}`,
				description: post.data.description,
				pubDate: new Date(post.data.published_at).toUTCString(),
			})),
		);

		const drafts = nonEmpty(
			await getCollection("posts", ({ data }) => !data.published),
		);
		const links = items.map((item) => item.link);
		for (const draft of drafts) {
			expect(links).not.toContain(`https://f0reth.net/blog/${draft.id}`);
		}
	});
});
