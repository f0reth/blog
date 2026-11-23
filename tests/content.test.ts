import { getCollection } from "astro:content";
import { readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";

const postsDir = new URL("../posts/", import.meta.url);
const postDirs = readdirSync(postsDir, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();

const posts = await getCollection("posts");

const isValidDate = (value: string) => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return date.toISOString().startsWith(value);
};

describe("posts/ の記事", () => {
	test("posts/ 配下のすべてのディレクトリが記事として読み込まれる (index.md(x) の置き忘れ・命名ミスがない)", () => {
		expect(posts.map((post) => post.id).sort()).toEqual(postDirs);
	});

	test.each(posts.map((post) => [post.id, post] as const))(
		"%s: 日付が YYYY-MM-DD 形式の実在する日付である",
		(_id, post) => {
			// 並び替えは published_at を数値化して行うため、ゼロ埋めされた形式でなければ順序が壊れる
			expect(isValidDate(post.data.published_at)).toBe(true);
			if (post.data.modified) {
				expect(isValidDate(post.data.modified)).toBe(true);
				expect(post.data.modified >= post.data.published_at).toBe(true);
			}
		},
	);

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
