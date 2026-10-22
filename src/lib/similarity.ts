const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N} ]/gu, '').trim();

/** 0..100 similarity between what was heard and the target word (Levenshtein). */
export function similarity(heard: string, target: string) {
  const a = norm(heard);
  const b = norm(target);
  if (!a || !b) return 0;
  if (a.includes(b)) return 100;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return Math.max(0, Math.round((1 - dp[a.length][b.length] / Math.max(a.length, b.length)) * 100));
}
