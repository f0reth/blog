import type { Root } from "hast";
import { h, s } from "hastscript";
import { SKIP, visit } from "unist-util-visit";

const icon = (className: string, children: ReturnType<typeof s>[]) =>
	s(
		"svg",
		{
			class: className,
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 2,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			ariaHidden: "true",
		},
		children,
	);

/** rehype-pretty-code が生成したコードブロック (figure) に、コードをコピーするボタンを追加する */
export const rehypeCopyButton = () => (tree: Root) => {
	visit(tree, "element", (node) => {
		// rehype-pretty-code はプロパティ名を camelCase にせず、属性名のまま設定する
		if (
			node.tagName !== "figure" ||
			!("data-rehype-pretty-code-figure" in node.properties)
		)
			return;

		node.children.push(
			h(
				"button",
				{ type: "button", class: "copy-button", ariaLabel: "コードをコピー" },
				[
					icon("copy-icon", [
						s("rect", { x: 8, y: 8, width: 14, height: 14, rx: 2 }),
						s("path", {
							d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
						}),
					]),
					icon("check-icon", [s("path", { d: "M20 6 9 17l-5-5" })]),
				],
			),
		);
		return SKIP;
	});
};
