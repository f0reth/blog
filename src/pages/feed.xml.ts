import rss from "@astrojs/rss";
import { SiteConfig } from "../../site.config";
import { getPosts } from "../lib/posts";

export const GET = async () => {
	const posts = await getPosts();

	return rss({
		title: `${SiteConfig.blogName}のブログ`,
		description: SiteConfig.description,
		site: SiteConfig.url,
		customData: "<language>ja</language>",
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: new Date(post.data.published_at),
			link: new URL(`blog/${post.id}`, SiteConfig.url).href,
		})),
	});
};
