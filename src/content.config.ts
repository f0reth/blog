import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { tagIds } from "../site.config";

const posts = defineCollection({
	// posts/<slug>/index.md(x) を読み込み、ディレクトリ名を slug(id) として扱う
	loader: glob({
		pattern: "*/index.{md,mdx}",
		base: "./posts",
		generateId: ({ entry }) => entry.split("/")[0],
	}),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// YYYY-MM-DD 形式の文字列のまま扱う (文字列比較で日付順に並べられる)
		published_at: z.iso.date(),
		modified: z.iso.date().nullish(),
		published: z.boolean(),
		tags: z.array(z.enum(tagIds)),
	}),
});

export const collections = { posts };
