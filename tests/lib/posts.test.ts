import { describe, expect, test, vi } from "vitest";
import type { Tag } from "../../site.config";
import { getPosts, getPostsByTag, type Post } from "../../src/lib/posts";

const makePost = (
	id: string,
	published_at: string,
	{ published = true, tags = [] }: { published?: boolean; tags?: Tag[] } = {},
) =>
	({
		id,
		collection: "posts",
		data: {
			title: id,
			description: `${id} の説明`,
			published_at,
			modified: null,
			published,
			tags,
		},
	}) as unknown as Post;

// 実装と同じく、フィルタ関数を受け取る getCollection を再現する
const entries = vi.hoisted(() => [] as Post[]);
vi.mock("astro:content", () => ({
	getCollection: async (_name: string, filter?: (entry: Post) => boolean) =>
		filter ? entries.filter(filter) : [...entries],
}));

entries.push(
	makePost("2024-02-10", "2024-02-10", { tags: ["golang"] }),
	makePost("2025-01-01", "2025-01-01", { tags: ["bun", "golang"] }),
	makePost("draft", "2026-01-01", { published: false, tags: ["golang"] }),
	makePost("2024-11-02", "2024-11-02", { tags: ["bun"] }),
	makePost("2024-12-31", "2024-12-31"),
);

const ids = (posts: Post[]) => posts.map((post) => post.id);

describe("getPosts", () => {
	test("非公開 (published: false) の記事は含めない", async () => {
		expect(ids(await getPosts())).not.toContain("draft");
	});

	test("投稿日の新しい順に並べる (月・年をまたいでも日付として比較する)", async () => {
		expect(ids(await getPosts())).toEqual([
			"2025-01-01",
			"2024-12-31",
			"2024-11-02",
			"2024-02-10",
		]);
	});
});

describe("getPostsByTag", () => {
	test("指定したタグを持つ公開記事だけを新しい順で返す", async () => {
		expect(ids(await getPostsByTag("golang"))).toEqual([
			"2025-01-01",
			"2024-02-10",
		]);
		expect(ids(await getPostsByTag("bun"))).toEqual([
			"2025-01-01",
			"2024-11-02",
		]);
	});

	test("該当する記事がないタグでは空配列を返す", async () => {
		expect(await getPostsByTag("python")).toEqual([]);
	});
});
