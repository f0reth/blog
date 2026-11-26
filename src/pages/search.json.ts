import { tags as tagLabels } from "../../site.config";
import { formatDate, getPosts } from "../lib/posts";

export type SearchItem = {
	url: string;
	title: string;
	description: string;
	date: string;
	tags: string[];
};

/** SearchModal が開かれたときに読み込む検索用の記事一覧 (新しい順) */
export const GET = async () => {
	const posts = await getPosts();
	const items: SearchItem[] = posts.map((post) => ({
		url: `/blog/${post.id}`,
		title: post.data.title,
		description: post.data.description,
		date: formatDate(post.data.published_at),
		tags: post.data.tags.map((tag) => tagLabels[tag]),
	}));
	return Response.json(items);
};
