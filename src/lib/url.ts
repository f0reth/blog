/**
 * build.format: "file" ではビルド時の pathname が `/tags.html` や `/index.html` になるため、
 * 公開 URL のパス (`/tags`, `/`) に揃える
 */
export const publicPath = (pathname: string) =>
	pathname.replace(/(index)?\.html$/, "");
