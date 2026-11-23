import { getCollection } from "astro:content";
import { readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";

const postsDir = new URL("../posts/", import.meta.url);
const postDirs = readdirSync(postsDir, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();

const posts = await getCollection("posts");

describe("posts/ の記事", () => {
	test("posts/ 配下のすべてのディレクトリが記事として読み込まれる (index.md(x) の置き忘れ・命名ミスがない)", () => {
		expect(posts.map((post) => post.id).sort()).toEqual(postDirs);
	});

	// 日付の形式 (YYYY-MM-DD) は content.config.ts のスキーマで検証している
	test.each(
		posts.flatMap(({ id, data }) =>
			data.modified ? [[id, data.published_at, data.modified] as const] : [],
		),
	)("%s: 最終編集日が投稿日以降である", (_id, publishedAt, modified) => {
		expect(modified >= publishedAt).toBe(true);
	});

	test.each(posts.map((post) => [post.id, post] as const))(
		"%s: ディレクトリ名の日付が published_at と一致する",
		(id, post) => {
			expect(id.slice(0, 8)).toBe(post.data.published_at.replaceAll("-", ""));
		},
	);

	test.each(
		posts
			.filter((post) => post.data.published)
			.map((post) => [post.id, post] as const),
	)("%s: 公開記事は title・description・tags が空でない", (_id, post) => {
		expect(post.data.title.trim()).not.toBe("");
		expect(post.data.description.trim()).not.toBe("");
		expect(post.data.tags.length).toBeGreaterThan(0);
	});
});
