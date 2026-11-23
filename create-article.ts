import { mkdir, writeFile } from "node:fs/promises";
import { cancel, isCancel, outro, select, text } from "@clack/prompts";

// never を返す関数宣言にすることで、呼び出し後に isCancel の型の絞り込みが効く
function exit(): never {
	cancel("goodbye");
	process.exit(0);
}

const slug = await text({
	message: "記事のslugを入力してください",
	placeholder: "astro-saiko",
	validate: (value) =>
		!value || value.length < 5 ? "slugが短すぎます" : undefined,
});
if (isCancel(slug)) exit();

const extension = await select({
	message: "作成するファイル拡張子を選択してください",
	options: [{ value: "md" }, { value: "mdx" }],
});
if (isCancel(extension)) exit();

// ローカルタイムゾーンの日付を YYYY-MM-DD で取得する (sv-SE ロケールは ISO 形式で出力される)
const today = new Date().toLocaleDateString("sv-SE");
const dir = `posts/${today.replaceAll("-", "")}-${slug}`;
const path = `${dir}/index.${extension}`;

// 同名のディレクトリがあればエラーにして既存の記事を上書きしない
await mkdir(dir);
await writeFile(
	path,
	`---
title:
description:
published_at: "${today}"
modified:
published: true
tags: []
---
`,
);

outro(`${path} を作成しました`);
