import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setupCopyButtons } from "../../src/scripts/copyCode";
import MarkdownFixture from "../fixtures/markdown-features.md";
import { createContainer, parseHtml } from "../helpers/html";

let document: Document;
const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(async () => {
	// 実際に変換された Markdown の HTML に対してスクリプトを実行する
	const container = await createContainer();
	document = parseHtml(await container.renderToString(MarkdownFixture));
	writeText.mockResolvedValue();
	vi.stubGlobal("document", document);
	vi.stubGlobal("navigator", { clipboard: { writeText } });
	vi.useFakeTimers();
	setupCopyButtons();
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	writeText.mockReset();
});

const clickCopyButton = async () => {
	const button = document.querySelector<HTMLButtonElement>(".copy-button");
	button?.click();
	// クリップボードへの書き込み (Promise) の完了を待つ
	await writeText.mock.results[0]?.value;
	return button;
};

test("コピーボタンを押すと、空行を含むコード全体を元のテキストどおりにコピーする", async () => {
	await clickCopyButton();
	expect(writeText).toHaveBeenCalledWith(
		'package main\n\nfunc main() {\n\tprintln("hello")\n}',
	);
});

test("コピー後しばらくはコピー済みの表示になり、2 秒後に戻る", async () => {
	const button = await clickCopyButton();
	expect(button?.hasAttribute("data-copied")).toBe(true);

	vi.advanceTimersByTime(2000);
	expect(button?.hasAttribute("data-copied")).toBe(false);
});
