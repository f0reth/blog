import { describe, expect, test } from "vitest";
import Publish from "../../src/components/Publish.astro";
import { createContainer, parseHtml } from "../helpers/html";

const render = async (props: Record<string, unknown>) => {
	const container = await createContainer();
	return parseHtml(await container.renderToString(Publish, { props }));
};

describe("Publish", () => {
	test("投稿日を表示し、最終編集日がなければ編集日の欄は出さない", async () => {
		const document = await render({
			published_at: "2024-07-14",
			modified: null,
			tags: [],
		});

		expect(document.body.textContent).toContain("2024-07-14");
		expect(document.querySelector("title")?.textContent).toBe("Published Icon");
		expect(
			[...document.querySelectorAll("title")].map((t) => t.textContent),
		).not.toContain("Modified Icon");
	});

	test("最終編集日があれば投稿日と並べて表示する", async () => {
		const document = await render({
			published_at: "2024-07-14",
			modified: "2024-11-23",
			tags: [],
		});

		const titles = [...document.querySelectorAll("title")].map(
			(t) => t.textContent,
		);
		expect(titles).toContain("Modified Icon");
		expect(document.body.textContent).toContain("2024-11-23");
	});

	test("タグを表示名付きのタグページへのリンクとして、指定順に / 区切りで並べる", async () => {
		const document = await render({
			published_at: "2024-07-14",
			tags: ["windows", "golang", "vscode"],
		});

		const links = [...document.querySelectorAll("a")].map((a) => ({
			href: a.getAttribute("href"),
			label: a.textContent,
		}));
		expect(links).toEqual([
			{ href: "/blog/tag/windows", label: "Windows" },
			{ href: "/blog/tag/golang", label: "Go言語" },
			{ href: "/blog/tag/vscode", label: "VSCode" },
		]);
		expect(
			[...document.querySelectorAll("span")].filter(
				(span) => span.textContent === "/",
			),
		).toHaveLength(2);
	});

	test("タグが 1 つなら区切り文字を出さない", async () => {
		const document = await render({
			published_at: "2024-07-14",
			tags: ["bun"],
		});

		expect(document.querySelectorAll("a")).toHaveLength(1);
		expect(
			[...document.querySelectorAll("span")].some(
				(span) => span.textContent === "/",
			),
		).toBe(false);
	});
});
