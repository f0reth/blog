/**
 * 実際の記事から期待値を求めるテスト用。記事が 0 件だと期待値も空になり、空同士の比較や空ループで素通りしてしまうため、
 * 0 件ならその場で失敗させる (astro:content が posts/ を読み込めていないときなど)
 */
export const nonEmpty = <T>(posts: T[]): T[] => {
	if (posts.length === 0) {
		throw new Error("記事が 0 件のため、このテストは何も検証できません");
	}
	return posts;
};
