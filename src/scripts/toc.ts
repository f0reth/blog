/** 画面上部を通り過ぎた最後の見出しを「現在の見出し」として、目次 (サイドバー・FloatingMenu の両方) で強調する */
export const setupToc = () => {
	const links = document.querySelectorAll<HTMLElement>("[data-toc-link]");
	const headings = [...new Set([...links].map((link) => link.dataset.tocLink))]
		.map((id) => (id ? document.getElementById(id) : null))
		.filter((heading) => heading !== null);
	if (!headings.length) return;

	const update = () => {
		let current = headings[0].id;
		for (const heading of headings) {
			if (heading.getBoundingClientRect().top < 140) current = heading.id;
		}
		for (const link of links) {
			link.classList.toggle("active", link.dataset.tocLink === current);
		}
	};

	window.addEventListener("scroll", update, { passive: true });
	update();
};
