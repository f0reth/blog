import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { getContainerRenderer } from "@astrojs/mdx/container-renderer";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro/virtual-modules/container.js";
import { JSDOM } from "jsdom";

type Route = { status?: number; body: string };

/** LinkCard / fetchOgp が実際に HTTP で取得しに行く先として使うローカルサーバー */
export const startHtmlServer = async (routes: Record<string, Route>) => {
	const server = createServer((req, res) => {
		const route = routes[req.url ?? ""];
		res.writeHead(route?.status ?? (route ? 200 : 404), {
			"Content-Type": "text/html; charset=utf-8",
		});
		res.end(route?.body ?? "not found");
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const { port } = server.address() as AddressInfo;

	return {
		origin: `http://127.0.0.1:${port}`,
		host: `127.0.0.1:${port}`,
		close: () =>
			new Promise<void>((resolve, reject) => {
				server.closeAllConnections();
				server.close((err) => (err ? reject(err) : resolve()));
			}),
	};
};

/** MDX も描画できる Astro Container を作る */
export const createContainer = async () =>
	AstroContainer.create({
		renderers: await loadRenderers([getContainerRenderer()]),
	});

/** 描画結果の HTML を DOM として検証するためにパースする */
export const parseHtml = (html: string) => new JSDOM(html).window.document;
