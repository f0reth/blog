import type { APIRoute, GetStaticPaths } from "astro";
import { renderOgImage } from "../../lib/ogImage";
import { getPostPaths, type Post } from "../../lib/posts";

export const getStaticPaths = getPostPaths satisfies GetStaticPaths;

export const GET: APIRoute<{ post: Post }> = async ({ props }) =>
	new Response(await renderOgImage(props.post.data.title), {
		headers: { "Content-Type": "image/png" },
	});
