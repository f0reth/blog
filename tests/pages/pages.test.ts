import { getCollection, render } from "astro:content";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { type Tag, tags as tagLabels } from "../../site.config";
import Nav from "../../src/components/Nav.astro";
import { formatDate, getPosts, getTagCounts } from "../../src/lib/posts";
import AboutPage from "../../src/pages/about.astro";
import ArticlePage, {
	getStaticPaths as getArticlePaths,
} from "../../src/pages/blog/[slug].astro";
import HomePage from "../../src/pages/index.astro";
import TagPage, {
	getStaticPaths as getTagPaths,
} from "../../src/pages/tags/[tag].astro";
import TagsPage from "../../src/pages/tags/index.astro";
import { parseHtml, renderHtml } from "../helpers/html";

// 記事内の <LinkCard> はビルド時に外部サイトへアクセスするため、ページのテストでは描画しない
vi.mock("../../src/components/LinkCard.astro", async () => ({
	default: (await import("../fixtures/StubLinkCard.astro")).default,
}));

const renderPage = async (
	page: unknown,
	options?: Parameters<typeof renderHtml>[1],
) => parseHtml(await renderHtml(page, options));

// 一覧の期待値は getPosts() を使わずに求め、並び順は表示された日付で検証する
const published = await getCollection("posts", ({ data }) => data.published);
const drafts = await getCollection("posts", ({ data }) => !data.published);

/** 記事一覧 (PostList) に並んだ記事 */
const listedPosts = (document: Document) =>
	[...document.querySelectorAll("main .post-list li")].map((li) => ({
		href: li.querySelector("h3 a")?.getAttribute("href"),
		date: li.querySelector("time")?.getAttribute("datetime") ?? "",
		tags: [...li.querySelectorAll(".tags a")].map((a) =>
			a.getAttribute("href"),
		),
	}));

const expectNewestFirst = (dates: string[]) => {
	expect(dates).toEqual([...dates].sort().reverse());
};

const hrefs = (posts: { id: string }[]) =>
	posts.map((post) => `/blog/${post.id}`).sort();

describe("共通レイアウト", () => {
	test("ナビは英語の Home / Tags / About と検索ボタン", async () => {
		const document = await renderPage(Nav);

		const links = [...document.querySelectorAll(".capsule-nav .link")].map(
			(a) => ({ href: a.getAttribute("href"), label: a.textContent?.trim() }),
		);
		expect(links).toEqual([
			{ href: "/", label: "Home" },
			{ href: "/tags", label: "Tags" },
			{ href: "/about", label: "About" },
		]);
		expect(
			document.querySelector(".capsule-nav [data-open-search]")?.textContent,
		).toContain("Search");
	});

	// ビルド時の pathname は build.format: "file" により .html 付きになる
	test.each([
		["/index.html", "Home"],
		["/tags.html", "Tags"],
		["/tags/golang.html", "Tags"],
		["/about.html", "About"],
		["/blog/20240714-bun-sqlite.html", null],
	])("%s ではナビの %s を今いるページとして示す", async (path, current) => {
		const document = await renderPage(Nav, {
			request: new Request(new URL(path, "http://localhost")),
		});

		const currentLinks = [
			...document.querySelectorAll(".capsule-nav .link[aria-current='page']"),
		].map((a) => a.textContent?.trim());
		expect(currentLinks).toEqual(current ? [current] : []);
	});

	test("スマホ用メニューは Home / Tags / About / Search で、記事ページ以外では Contents を出さない", async () => {
		const document = await renderPage(HomePage);

		const labels = [...document.querySelectorAll(".fm-item .fm-label")].map(
			(label) => label.textContent,
		);
		expect(labels).toEqual(["Home", "Tags", "About", "Search"]);
		expect(document.querySelector("[data-view='toc']")).toBeNull();
	});
});

describe("/", () => {
	test("公開記事だけをすべて新しい順に一覧表示し、件数を出す", async () => {
		const document = await renderPage(HomePage);
		const listed = listedPosts(document);

		expect(listed.map(({ href }) => href).sort()).toEqual(hrefs(published));
		expectNewestFirst(listed.map(({ date }) => date));
		for (const draft of drafts) {
			expect(document.querySelector(`a[href="/blog/${draft.id}"]`)).toBeNull();
		}
		expect(document.querySelector("main h2 small")?.textContent).toBe(
			`${published.length} 件`,
		);
		expect(document.title).toBe("f0reth");
		expect(document.querySelector(".hero h1")?.textContent).toBe("f0reth");
	});
});

describe("/tags", () => {
	test("記事のあるタグを記事数とともに、タグページへのリンクとして並べる", async () => {
		const document = await renderPage(TagsPage);

		const links = [...document.querySelectorAll("main ul a")].map((a) => ({
			href: a.getAttribute("href"),
			count: a.querySelector("span")?.textContent,
		}));
		expect(links).toEqual(
			(await getTagCounts()).map(({ tag, count }) => ({
				href: `/tags/${tag}`,
				count: String(count),
			})),
		);
		expect(document.querySelector(".page-head p")?.textContent).toBe(
			`${links.length} 個のタグ`,
		);
	});
});

describe("/tags/[tag]", async () => {
	const tags = (await getTagPaths()).map((path) => path.params.tag);

	test("公開記事に付いているタグだけページを生成する", () => {
		const used = new Set(published.flatMap(({ data }) => data.tags));
		expect([...tags].sort()).toEqual([...used].sort());
	});

	test.each(tags)(
		"%s: そのタグを持つ公開記事だけをすべて新しい順に一覧表示する",
		async (tag) => {
			const document = await renderPage(TagPage, { params: { tag } });
			const listed = listedPosts(document);
			const tagged = published.filter(({ data }) =>
				data.tags.includes(tag as Tag),
			);

			expect(listed.map(({ href }) => href).sort()).toEqual(hrefs(tagged));
			expectNewestFirst(listed.map(({ date }) => date));
			for (const post of listed) {
				expect(post.tags).toContain(`/tags/${tag}`);
			}
			expect(document.querySelector("main h1")?.textContent).toBe(
				`#${tagLabels[tag as Tag]}`,
			);
			expect(document.querySelector(".page-head p")?.textContent).toBe(
				`${tagged.length} 件の記事`,
			);
		},
	);
});

describe("/about", () => {
	test("ニックネームとプロフィール画像を表示する", async () => {
		const document = await renderPage(AboutPage);

		expect(document.querySelector("main h1")?.textContent).toBe("f0reth");
		expect(document.querySelector("main img.avatar")).not.toBeNull();
	});
});

describe("/blog/[slug]", async () => {
	const paths = await getArticlePaths();
	const posts = await getPosts();

	test("公開記事ごとにページを生成する", () => {
		expect(paths.map((path) => path.params.slug)).toEqual(
			posts.map((post) => post.id),
		);
	});

	// 記事ごとのテストの条件分岐 (更新日・目次のあり/なし) の両側が、実際の記事で検証されるようにする
	test("前提: 更新日のある記事とない記事、目次のある記事とない記事がそれぞれある", async () => {
		const modified = paths.map(({ props }) => !!props.post.data.modified);
		const hasToc = await Promise.all(
			paths.map(async ({ props }) =>
				(await render(props.post)).headings.some(({ depth }) =>
					[2, 3].includes(depth),
				),
			),
		);
		expect(new Set(modified)).toEqual(new Set([true, false]));
		expect(new Set(hasToc)).toEqual(new Set([true, false]));
	});

	describe.each(paths.map((path, i) => [path.params.slug, path, i] as const))(
		"%s",
		(slug, path, i) => {
			const { title, description, published_at, modified, tags } =
				path.props.post.data;
			let document: Document;
			beforeAll(async () => {
				document = await renderPage(ArticlePage, path);
			});

			test("記事本文とメタ情報を描画する", () => {
				expect(document.title).toBe(`${title} - f0reth`);
				expect(
					document
						.querySelector('meta[name="description"]')
						?.getAttribute("content"),
				).toBe(description);
				expect(
					document
						.querySelector('meta[property="og:image"]')
						?.getAttribute("content"),
				).toBe(`https://daichi2mori.com/ogps/${slug}.png`);
				expect(document.querySelector(".post-header h1")?.textContent).toBe(
					title,
				);
				expect(document.querySelector(".post-header > p")?.textContent).toBe(
					description,
				);
				expect(
					document.querySelector("article .markdown")?.textContent?.trim(),
				).not.toBe("");
			});

			test("投稿日と、あれば更新日を表示する", () => {
				const meta = document.querySelector(".post-header .meta");

				expect(meta?.querySelector("time")?.getAttribute("datetime")).toBe(
					published_at,
				);
				expect(meta?.querySelector("time")?.textContent).toBe(
					formatDate(published_at),
				);
				expect(meta?.querySelector("span")?.textContent).toBe(
					modified ? `（${formatDate(modified)} 更新）` : undefined,
				);
			});

			test("タグを表示名付きのタグページへのリンクとして並べる", () => {
				const links = [
					...document.querySelectorAll(".post-header .tags a"),
				].map((a) => ({ href: a.getAttribute("href"), label: a.textContent }));

				expect(links).toEqual(
					tags.map((tag) => ({
						href: `/tags/${tag}`,
						label: `#${tagLabels[tag]}`,
					})),
				);
			});

			test("前の記事 (1 つ古い記事) と次の記事 (1 つ新しい記事) へリンクし、端の記事では片方だけにする", () => {
				const links = [...document.querySelectorAll(".post-nav a")].map(
					(a) => ({ class: a.className, href: a.getAttribute("href") }),
				);
				const older = paths[i + 1];
				const newer = paths[i - 1];

				expect(links).toEqual([
					...(older
						? [{ class: "older", href: `/blog/${older.params.slug}` }]
						: []),
					...(newer
						? [{ class: "newer", href: `/blog/${newer.params.slug}` }]
						: []),
				]);
			});

			test("h2 / h3 の見出しから目次を作ってサイドバーとスマホ用メニューに出し、見出しがなければどちらも出さない", () => {
				const expected = [
					...document.querySelectorAll("article .markdown :is(h2, h3)"),
				].map((heading) => `#${heading.id}`);
				const targets = (selector: string) =>
					[...document.querySelectorAll(selector)].map((a) =>
						a.getAttribute("href"),
					);
				const menu = [...document.querySelectorAll(".fm-item .fm-label")].map(
					(label) => label.textContent,
				);

				expect(targets(".sidebar .toc-link")).toEqual(expected);
				expect(targets("[data-view='toc'] .fm-toc-link")).toEqual(expected);
				if (expected.length) {
					expect(menu).toEqual(["Home", "Tags", "About", "Contents", "Search"]);
				} else {
					expect(document.querySelector(".sidebar")).toBeNull();
					expect(menu).toEqual(["Home", "Tags", "About", "Search"]);
				}
			});
		},
	);
});
