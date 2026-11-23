import { Resvg } from "@resvg/resvg-js";
import { loadDefaultJapaneseParser } from "budoux";
import satori from "satori";
import { SiteConfig } from "../../site.config";

type Node = {
	type: string;
	props: Record<string, unknown> & { children?: unknown };
};

/** satori 用の要素を JSX なしで組み立てるヘルパー */
const h = (
	type: string,
	props: Record<string, unknown>,
	...children: unknown[]
): Node => ({
	type,
	props: { ...props, children: children.length === 1 ? children[0] : children },
});

const parser = loadDefaultJapaneseParser();

let fontCache: Promise<ArrayBuffer> | undefined;

export const renderOgImage = async (
	title: string,
): Promise<Uint8Array<ArrayBuffer>> => {
	fontCache ??= loadNotoSansJp();
	const font = await fontCache;

	const svg = await satori(
		h(
			"div",
			{ tw: "w-full h-full bg-[#E0EFFF] flex p-9" },
			h(
				"div",
				{
					tw: "w-full flex flex-col justify-end bg-white/85 rounded-3xl border-solid",
				},
				h(
					"div",
					{ tw: "w-full flex flex-1 items-center mt-10 px-34" },
					h(
						"div",
						{ tw: "flex justify-center flex-wrap text-[4.4rem]" },
						// 日本語を文節単位で折り返すため BudouX で分割する
						...parser.parse(title),
					),
				),
				h(
					"div",
					{
						tw: "w-full flex items-center justify-between px-18 mb-10 text-gray-900",
					},
					h(
						"div",
						{ tw: "flex items-center text-4xl" },
						h("img", {
							src: "https://avatars.githubusercontent.com/u/65765140?v=4",
							alt: "avatar",
							tw: "rounded-full mr-4 w-16 h-16",
						}),
						SiteConfig.blogName,
					),
					h("h1", { tw: "font-semibold" }, new URL(SiteConfig.url).host),
				),
			),
		) as Parameters<typeof satori>[0],
		{
			width: 1200,
			height: 630,
			fonts: [{ name: "NotoSansJP", data: font, weight: 600, style: "normal" }],
		},
	);

	// Response の BodyInit に渡せるよう ArrayBuffer ベースの Uint8Array にコピーする
	return new Uint8Array(new Resvg(svg).render().asPng());
};

/** Google Fonts から Noto Sans JP (SemiBold) を取得する */
const loadNotoSansJp = async () => {
	// satori は WOFF2 を読めないため、TTF/OTF を返す古いブラウザの User-Agent で CSS を取得する
	const response = await fetch(
		"https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@600",
		{
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
			},
		},
	);
	if (!response.ok) {
		throw new Error("Failed to fetch Google Font CSS");
	}

	const fontUrl = (await response.text()).match(
		/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
	)?.[1];
	if (!fontUrl) {
		throw new Error("Could not find font URL");
	}

	const fontResponse = await fetch(fontUrl);
	if (!fontResponse.ok) {
		throw new Error("Failed to fetch font file");
	}
	return fontResponse.arrayBuffer();
};
