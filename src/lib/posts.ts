import { type CollectionEntry, getCollection } from "astro:content";
import type { Tag } from "../../site.config";

export type Post = CollectionEntry<"posts">;

const dateToNumber = (date: string) =>
	Number.parseInt(date.replaceAll("-", ""), 10);

/** 公開済みの記事を投稿日の降順で取得する */
export const getPosts = async (): Promise<Post[]> => {
	const posts = await getCollection("posts", ({ data }) => data.published);
	return posts.sort(
		(a, b) =>
			dateToNumber(b.data.published_at) - dateToNumber(a.data.published_at),
	);
};

export const getPostsByTag = async (tag: Tag): Promise<Post[]> => {
	const posts = await getPosts();
	return posts.filter((post) => post.data.tags.includes(tag));
};
