import { describe, expect, test } from "vitest";
import { tags as tagLabels } from "../../site.config";
import { formatDate, getPosts } from "../../src/lib/posts";
import { GET, type SearchItem } from "../../src/pages/search.json";

describe("/search.json", () => {
	test("公開記事を新しい順に、検索に使う情報 (URL・タイトル・説明・日付・タグ名) で返す", async () => {
		const response = await GET();
		const items: SearchItem[] = await response.json();

		expect(response.headers.get("Content-Type")).toContain("application/json");
		const posts = await getPosts();
		expect(items).toEqual(
			posts.map((post) => ({
				url: `/blog/${post.id}`,
				title: post.data.title,
				description: post.data.description,
				date: formatDate(post.data.published_at),
				tags: post.data.tags.map((tag) => tagLabels[tag]),
			})),
		);
	});
});
