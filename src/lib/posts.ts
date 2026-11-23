import { type CollectionEntry, getCollection } from "astro:content";
import type { Tag } from "../../site.config";

export type Post = CollectionEntry<"posts">;

/** 公開済みの記事を投稿日の降順で取得する */
export const getPosts = async (): Promise<Post[]> => {
	const posts = await getCollection("posts", ({ data }) => data.published);
	// published_at は YYYY-MM-DD 形式なので文字列のまま比較できる
	return posts.sort((a, b) =>
		b.data.published_at.localeCompare(a.data.published_at),
	);
};

export const getPostsByTag = async (tag: Tag): Promise<Post[]> => {
	const posts = await getPosts();
	return posts.filter((post) => post.data.tags.includes(tag));
};

/** 記事ごとのページ (記事本文・OGP 画像) を生成するための getStaticPaths */
export const getPostPaths = async () => {
	const posts = await getPosts();
	return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
};
