function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

export function compareNames(inputName: string, verifiedName: string): {
  normalizedInput: string;
  normalizedVerified: string;
  similarity: number;
  isStrongMatch: boolean;
} {
  const left = normalize(inputName);
  const right = normalize(verifiedName);
  if (!left || !right) {
    return {
      normalizedInput: left,
      normalizedVerified: right,
      similarity: 0,
      isStrongMatch: false
    };
  }
  const distance = levenshtein(left, right);
  const maxLength = Math.max(left.length, right.length);
  const similarity = Math.max(0, 1 - distance / maxLength);
  return {
    normalizedInput: left,
    normalizedVerified: right,
    similarity,
    isStrongMatch: similarity >= 0.85
  };
}

