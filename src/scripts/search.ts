import type { SearchItem } from "../pages/search.json";

/** タイトル・説明・タグのいずれかに、大文字小文字を区別せずクエリを含む記事を返す (空なら新しい順に limit 件) */
export const searchPosts = (
	items: SearchItem[],
	query: string,
	limit = 5,
): SearchItem[] => {
	const q = query.trim().toLowerCase();
	if (!q) return items.slice(0, limit);
	return items.filter((item) =>
		[item.title, item.description, ...item.tags].some((text) =>
			text.toLowerCase().includes(q),
		),
	);
};

/** text 中の query に一致する部分を <mark> で囲んだノード列を作る */
export const highlight = (text: string, query: string): Node[] => {
	const q = query.trim().toLowerCase();
	if (!q) return [document.createTextNode(text)];

	const nodes: Node[] = [];
	const lower = text.toLowerCase();
	let start = 0;
	for (let i = lower.indexOf(q); i !== -1; i = lower.indexOf(q, start)) {
		if (i > start) nodes.push(document.createTextNode(text.slice(start, i)));
		const mark = document.createElement("mark");
		mark.textContent = text.slice(i, i + q.length);
		nodes.push(mark);
		start = i + q.length;
	}
	if (start < text.length)
		nodes.push(document.createTextNode(text.slice(start)));
	return nodes;
};

const element = <K extends keyof HTMLElementTagNameMap>(
	tag: K,
	className: string,
	...children: (Node | string)[]
) => {
	const el = document.createElement(tag);
	el.className = className;
	el.append(...children);
	return el;
};

/** 検索モーダル (SearchModal) を開閉し、入力に合わせて記事を絞り込む */
export const setupSearchModal = () => {
	const dialog = document.querySelector<HTMLDialogElement>(".search-modal");
	const input = dialog?.querySelector<HTMLInputElement>(".search-input");
	const results = dialog?.querySelector<HTMLElement>(".results");
	if (!dialog || !input || !results) return;

	// Mac ではショートカットの表示を ⌘K にする (受け付けるのは Ctrl / ⌘ の両方)
	if (/Mac|iPhone|iPad/.test(navigator.userAgent)) {
		for (const kbd of document.querySelectorAll("[data-search-shortcut]")) {
			kbd.textContent = "⌘K";
		}
	}

	let items: Promise<SearchItem[]> | undefined;
	let hits: SearchItem[] = [];
	let selected = 0;

	const render = async () => {
		const query = input.value;
		// 検索用の記事一覧は初めて開いたときに 1 回だけ取得する
		items ??= fetch("/search.json").then((res) => res.json());
		hits = searchPosts(await items, query);
		selected = Math.min(selected, Math.max(0, hits.length - 1));

		const nodes = hits.map((item, i) => {
			const link = element(
				"a",
				"result",
				element("p", "result-title", ...highlight(item.title, query)),
				element(
					"p",
					"result-description",
					...highlight(item.description, query),
				),
				element(
					"div",
					"result-meta",
					element("span", "", item.date),
					element(
						"span",
						"result-tags",
						item.tags.map((tag) => `#${tag}`).join(" "),
					),
				),
			);
			link.href = item.url;
			link.setAttribute("role", "option");
			link.setAttribute("aria-selected", String(i === selected));
			return link;
		});

		if (!query.trim())
			results.replaceChildren(element("p", "label", "最近の記事"), ...nodes);
		else if (hits.length) results.replaceChildren(...nodes);
		else
			results.replaceChildren(
				element("p", "empty", `「${query.trim()}」に一致する記事はありません`),
			);
	};

	const open = () => {
		if (dialog.open) return;
		input.value = "";
		selected = 0;
		dialog.showModal();
		void render();
	};

	input.addEventListener("input", () => {
		selected = 0;
		void render();
	});

	input.addEventListener("keydown", (event) => {
		if ((event.key === "ArrowDown" || event.key === "ArrowUp") && hits.length) {
			event.preventDefault();
			selected =
				(selected + (event.key === "ArrowDown" ? 1 : -1) + hits.length) %
				hits.length;
			for (const [i, option] of results.querySelectorAll(".result").entries()) {
				option.setAttribute("aria-selected", String(i === selected));
				if (i === selected) option.scrollIntoView({ block: "nearest" });
			}
		} else if (event.key === "Enter" && hits[selected]) {
			event.preventDefault();
			location.href = hits[selected].url;
		}
	});

	// パネルの外側 (::backdrop) をクリックしたら閉じる
	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) dialog.close();
	});

	// ナビの検索ボタンや FloatingMenu の Search など、data-open-search を持つ要素から開く
	document.addEventListener("click", (event) => {
		if ((event.target as Element).closest("[data-open-search]")) open();
	});

	document.addEventListener("keydown", (event) => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
			event.preventDefault();
			if (dialog.open) dialog.close();
			else open();
		}
	});
};
