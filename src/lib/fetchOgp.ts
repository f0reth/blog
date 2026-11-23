import { JSDOM } from "jsdom";

export type Ogp = {
	title?: string;
	description?: string;
	image?: string;
	host: string;
	favicon: string;
};

/** リンク先の OGP を取得する。取得に失敗してもホスト名と favicon は返す */
export const fetchOgp = async (url: string): Promise<Ogp> => {
	const host = new URL(url).host;
	const ogp: Ogp = {
		host,
		favicon: `https://www.google.com/s2/favicons?domain=${host}`,
	};

	try {
		const { document } = (await JSDOM.fromURL(url)).window;
		const content = (selector: string) =>
			document.querySelector(selector)?.getAttribute("content") || undefined;

		return {
			...ogp,
			title:
				content('meta[property="og:title"]') ??
				(document.querySelector("title")?.textContent || undefined),
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
