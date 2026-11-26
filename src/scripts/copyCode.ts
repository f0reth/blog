/** rehypeCopyButton がコードブロックに追加したボタンで、コードをクリップボードにコピーできるようにする */
export const setupCopyButtons = () => {
	for (const button of document.querySelectorAll<HTMLButtonElement>(
		".copy-button",
	)) {
		let timer: ReturnType<typeof setTimeout> | undefined;

		button.addEventListener("click", async () => {
			const lines =
				button.parentElement?.querySelectorAll("pre code > [data-line]") ?? [];
			// rehype-pretty-code は空行に高さを持たせるため、トークンの span ではなく空白文字だけを入れる。
			// そのままコピーすると空行に空白が混ざるため、子要素を持たない行は空行として扱う
			const text = Array.from(lines, (line) =>
				line.childElementCount === 0 ? "" : line.textContent,
			).join("\n");

			try {
				await navigator.clipboard.writeText(text);
			} catch (error) {
				// 権限がない・ページが非アクティブなどで書き込めなかった場合は、コピー済みの表示にしない
				console.error("Failed to copy code:", error);
				return;
			}

			// コピーできたことを示すため、少しの間チェックアイコンに切り替える
			button.dataset.copied = "";
			clearTimeout(timer);
			timer = setTimeout(() => delete button.dataset.copied, 2000);
		});
	}
};
