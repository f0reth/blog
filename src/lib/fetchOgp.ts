import { parse } from "node-html-parser";

export type Ogp = {
	title?: string;
	description?: string;
	image?: string;
	host: string;
	favicon: string;
};

/** 同じ URL への LinkCard が複数あっても取得は 1 回で済ませる */
const cache = new Map<string, Promise<Ogp>>();

/** リンク先の OGP を取得する。取得に失敗してもホスト名と favicon は返す */
export const fetchOgp = (url: string): Promise<Ogp> => {
	let ogp = cache.get(url);
	if (!ogp) {
		ogp = scrapeOgp(url);
		cache.set(url, ogp);
	}
	return ogp;
};

const scrapeOgp = async (url: string): Promise<Ogp> => {
	const host = new URL(url).host;
	const ogp: Ogp = {
		host,
		favicon: `https://www.google.com/s2/favicons?domain=${host}`,
	};

	try {
		const document = parse(await fetchHtml(url));
		const content = (selector: string) =>
			document.querySelector(selector)?.getAttribute("content") || undefined;

		return {
			...ogp,
			title:
				content('meta[property="og:title"]') ??
				(document.querySelector("title")?.text || undefined),
			description:
				content('meta[property="og:description"]') ??
				content('meta[name="description"]'),
			image:
				content('meta[property="og:image"]') ??
				content('meta[name="og:image"]'),
		};
	} catch (e) {
		console.error(
			`Error fetching OGP data (${url}): ${e instanceof Error ? e.message : e}`,
		);
		return ogp;
	}
};

const fetchHtml = async (url: string) => {
	// 応答のないサイトでビルドが止まらないようにタイムアウトさせる
	const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	// Shift_JIS などで配信されるページも文字化けしないよう Content-Type の charset でデコードする
	const charset =
		response.headers.get("content-type")?.match(/charset=([^;]+)/i)?.[1] ??
		"utf-8";
	return new TextDecoder(charset.trim()).decode(await response.arrayBuffer());
};
