import type { APIRoute } from "astro";
import { Feed } from "feed";
import { SiteConfig } from "../../site.config";
import { getPosts } from "../lib/posts";

export const GET: APIRoute = async () => {
	const feed = new Feed({
		title: "d2mのブログ",
		id: SiteConfig.url,
		link: SiteConfig.url,
		description: "プログラミングや日常について投稿します",
		copyright: "© 2024 daichi2mori. All Rights Reserved.",
		language: "ja",
		generator: SiteConfig.url,
	});

	const posts = await getPosts();

	for (const post of posts) {
		feed.addItem({
			title: post.data.title,
			description: post.data.description,
			date: new Date(post.data.published_at),
			id: post.id,
			link: `https://daichi2mori.com/blog/${post.id}`,
		});
	}

	return new Response(feed.rss2(), {
		headers: { "Content-Type": "text/xml" },
	});
};
