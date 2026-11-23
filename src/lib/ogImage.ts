import { Resvg } from "@resvg/resvg-js";
import { loadDefaultJapaneseParser } from "budoux";
import satori from "satori";
import { SiteConfig } from "../../site.config";

type GoogleFontOptions = {
	family: string;
	weight?: number;
	text?: string;
	display?: string;
};

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
	// 日本語を文節単位で折り返すため BudouX で分割する
	const parsedTitle = parser.parse(title);

	fontCache ??= loadGoogleFont({ family: "Noto Sans JP", weight: 600 });
	const notoSansBold = await fontCache;

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
						...parsedTitle,
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
						"d2m",
					),
					h("h1", { tw: "font-semibold" }, new URL(SiteConfig.url).host),
				),
			),
		) as Parameters<typeof satori>[0],
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: "NotoSansJP",
					data: notoSansBold,
					weight: 600,
					style: "normal",
				},
			],
		},
	);

	// Response の BodyInit に渡せるよう ArrayBuffer ベースの Uint8Array にコピーする
	return new Uint8Array(new Resvg(svg).render().asPng());
};

function buildGoogleFontUrl({
	family,
	weight,
	text,
	display,
}: GoogleFontOptions) {
	const params: Record<string, string> = {
		family: `${encodeURIComponent(family)}${weight ? `:wght@${weight}` : ""}`,
	};

	if (text) {
		params.text = text;
	} else {
		params.subset = "latin";
	}

	if (display) {
		params.display = display;
	}

	return `https://fonts.googleapis.com/css2?${Object.keys(params)
		.map((key) => `${key}=${params[key]}`)
		.join("&")}`;
}

async function loadGoogleFont({ family, weight, text }: GoogleFontOptions) {
	const url = buildGoogleFontUrl({ family, weight, text });

	const response = await fetch(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch Google Font CSS");
	}

	const css = await response.text();
	const fontUrlMatch = css.match(
		/src: url\((.+?)\) format\('(opentype|truetype)'\)/,
	);
	const fontUrl = fontUrlMatch?.[1];

	if (!fontUrl) {
		throw new Error("Could not find font URL");
	}

	const fontResponse = await fetch(fontUrl);

	if (!fontResponse.ok) {
		throw new Error("Failed to fetch font file");
	}

	return fontResponse.arrayBuffer();
}
