/** 記事本文の画像をクリックすると拡大表示し、複数あれば前後に切り替えられるようにする */
export const setupImageLightbox = () => {
	const dialog = document.querySelector<HTMLDialogElement>(".lightbox");
	const view = dialog?.querySelector("img");
	const count = dialog?.querySelector(".count");
	const images = [
		...document.querySelectorAll<HTMLImageElement>(".markdown p > img"),
	];
	if (!dialog || !view || !count || !images.length) return;

	let index = 0;
	const show = (i: number) => {
		index = (i + images.length) % images.length;
		view.src = images[index].currentSrc || images[index].src;
		view.alt = images[index].alt;
		count.textContent = `${index + 1} / ${images.length}`;
	};

	dialog.toggleAttribute("data-single", images.length < 2);
	for (const [i, image] of images.entries()) {
		image.addEventListener("click", () => {
			show(i);
			dialog.showModal();
		});
	}

	dialog.addEventListener("click", (event) => {
		const action = (event.target as Element).closest<HTMLElement>(
			"[data-action]",
		)?.dataset.action;
		if (action === "prev") show(index - 1);
		else if (action === "next") show(index + 1);
		else if (action === "close" || event.target === dialog) dialog.close();
	});
	dialog.addEventListener("keydown", (event) => {
		if (event.key === "ArrowLeft") show(index - 1);
		if (event.key === "ArrowRight") show(index + 1);
	});
};
