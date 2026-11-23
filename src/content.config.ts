import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { allTags } from "../site.config";

const tagIds = allTags.map((tag) => tag.id) as [
	(typeof allTags)[number]["id"],
	...(typeof allTags)[number]["id"][],
];

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
		published_at: z.string(),
		modified: z.string().nullish(),
		published: z.boolean(),
		tags: z.array(z.enum(tagIds)),
	}),
});

export const collections = { posts };
