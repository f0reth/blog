export const SiteConfig = {
	blogName: "d2m",
	description: "プログラミングや日常について投稿します",
	url: "https://daichi2mori.com/",
};

/** タグ ID と表示名。記事の frontmatter の tags はここに定義した ID だけを受け付ける */
export const tags = {
	markdown: "Markdown",
	windows: "Windows",
	github: "GitHub",
	bun: "Bun",
	sqlite: "SQLite",
	golang: "Go言語",
	vscode: "VSCode",
	linux: "Linux",
	ubuntu: "Ubuntu",
	react: "React",
	vite: "Vite",
	css: "CSS",
	javascript: "JavaScript",
	python: "Python",
} as const;

export type Tag = keyof typeof tags;

export const tagIds = Object.keys(tags) as [Tag, ...Tag[]];
