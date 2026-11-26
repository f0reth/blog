import { beforeAll, beforeEach, expect, test, vi } from "vitest";
import { setupCopyButtons } from "../../src/scripts/copyCode";
import MarkdownFixture from "../fixtures/markdown-features.md";
import { openDom } from "../helpers/dom";
import { renderHtml } from "../helpers/html";

let html: string;
beforeAll(async () => {
	// 実際に変換された Markdown の HTML に対してスクリプトを実行する
	html = await renderHtml(MarkdownFixture);
});

const writeText = vi.fn<(text: string) => Promise<void>>();
let buttons: HTMLButtonElement[];

beforeEach(({ onTestFinished }) => {
	const { window, document } = openDom(html);
	writeText.mockReset().mockResolvedValue();
	Object.defineProperty(window.navigator, "clipboard", {
		value: { writeText },
	});
	vi.useFakeTimers();
	onTestFinished(() => {
		vi.useRealTimers();
	});
	setupCopyButtons();
	buttons = [...document.querySelectorAll<HTMLButtonElement>(".copy-button")];
});

/** ボタンを押して、クリップボードへの書き込み (Promise) の完了を待つ */
const clickCopyButton = async (button: HTMLButtonElement) => {
	button.click();
	await vi.advanceTimersByTimeAsync(0);
	return button;
};

const copied = (button: HTMLButtonElement) =>
	button.hasAttribute("data-copied");

test("コピーボタンを押すと、空行を含むコード全体を元のテキストどおりにコピーする", async () => {
	await clickCopyButton(buttons[0]);

	expect(writeText).toHaveBeenCalledWith(
		'package main\n\nfunc main() {\n\tprintln("hello")\n}',
	);
});

test("各コードブロックのボタンは、そのブロックのコードだけをコピーする", async () => {
	expect(buttons).toHaveLength(2);

	await clickCopyButton(buttons[1]);

	expect(writeText).toHaveBeenCalledExactlyOnceWith("const answer = 42;");
});

test("コピー後しばらくはコピー済みの表示になり、2 秒後に戻る", async () => {
	const button = await clickCopyButton(buttons[0]);
	expect(copied(button)).toBe(true);

	vi.advanceTimersByTime(1999);
	expect(copied(button)).toBe(true);
	vi.advanceTimersByTime(1);
	expect(copied(button)).toBe(false);
});

test("コピー済みの表示中にもう一度押すと、そこから 2 秒間表示を延ばす", async () => {
	const button = await clickCopyButton(buttons[0]);
	vi.advanceTimersByTime(1500);

	await clickCopyButton(button);
	vi.advanceTimersByTime(1500);

	expect(copied(button)).toBe(true);
	vi.advanceTimersByTime(500);
	expect(copied(button)).toBe(false);
});

test("コピー済みの表示はボタンごとに独立している", async () => {
	await clickCopyButton(buttons[0]);
	vi.advanceTimersByTime(1000);
	await clickCopyButton(buttons[1]);

	vi.advanceTimersByTime(1000);

	expect(copied(buttons[0])).toBe(false);
	expect(copied(buttons[1])).toBe(true);
});

test("クリップボードに書き込めなかったときは、エラーを出力してコピー済みの表示にしない", async () => {
	const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
	writeText.mockRejectedValue(new DOMException("denied", "NotAllowedError"));

	const button = await clickCopyButton(buttons[0]);

	expect(copied(button)).toBe(false);
	expect(consoleError).toHaveBeenCalledWith(
		"Failed to copy code:",
		expect.any(DOMException),
	);
	consoleError.mockRestore();
});
