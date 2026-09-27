// PRD B2: catch merchants whose name imitates a verified merchant (ticketsmaster vs ticketmaster).

const HOMOGLYPHS: [RegExp, string][] = [
  [/0/g, "o"],
  [/1/g, "l"],
  [/3/g, "e"],
  [/5/g, "s"],
  [/rn/g, "m"],
  [/vv/g, "w"],
  [/[íìîï]/g, "i"],
  [/[áàâäа]/g, "a"], // includes Cyrillic а
  [/[еéèêë]/g, "e"], // includes Cyrillic е
  [/[оóòôö]/g, "o"], // includes Cyrillic о
];

export function normalize(name: string): string {
  let s = name.toLowerCase();
  for (const [re, to] of HOMOGLYPHS) s = s.replace(re, to);
  return s.replace(/[^a-z]/g, "");
}

export function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Returns the verified name being imitated, or null. An exact match is the merchant itself, not a lookalike. */
export function imitates(candidate: string, verified: string[]): string | null {
  const c = normalize(candidate);
  for (const v of verified) {
    if (candidate.toLowerCase() === v.toLowerCase()) continue;
    const n = normalize(v);
    if (c === n) return v;
    if (Math.min(c.length, n.length) >= 5 && distance(c, n) <= 2) return v;
  }
  return null;
}
