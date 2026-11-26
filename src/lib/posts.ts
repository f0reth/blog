import { type CollectionEntry, getCollection } from "astro:content";
import { type Tag, tagIds } from "../../site.config";

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

/** 公開記事が 1 件以上あるタグを、記事数の多い順 (同数なら site.config.ts の定義順) で返す */
export const getTagCounts = async (): Promise<
	{ tag: Tag; count: number }[]
> => {
	const posts = await getPosts();
	return tagIds
		.map((tag) => ({
			tag,
			count: posts.filter((post) => post.data.tags.includes(tag)).length,
		}))
		.filter(({ count }) => count > 0)
		.sort((a, b) => b.count - a.count);
};

/** 記事ごとのページ (記事本文・OGP 画像) を生成するための getStaticPaths */
export const getPostPaths = async () => {
	const posts = await getPosts();
	return posts.map((post) => ({ params: { slug: post.id }, props: { post } }));
};

/** YYYY-MM-DD を「2024年7月14日」の形式にする */
export const formatDate = (date: string) => {
	const [year, month, day] = date.split("-").map(Number);
	return `${year}年${month}月${day}日`;
};
