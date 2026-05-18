// Levenshtein edit distance + a normalised similarity helper used by all
// three aux-training runners (dictation / shadowing / read-aloud).
//
// Distance is computed on tokenised lowercase words with all surrounding
// punctuation stripped, so trivial casing or punctuation drift doesn't tank
// the score. For dictation we still report exact-string fidelity as well.

export function tokenise(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function editDistance<T>(a: readonly T[], b: readonly T[]): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  const curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    prev = curr.slice();
  }
  return prev[b.length];
}

/** Returns similarity in [0, 1] where 1 means identical (token level). */
export function similarity(reference: string, candidate: string): number {
  const ref = tokenise(reference);
  const cand = tokenise(candidate);
  if (ref.length === 0 && cand.length === 0) return 1;
  const dist = editDistance(ref, cand);
  const denom = Math.max(ref.length, cand.length);
  return denom === 0 ? 1 : 1 - dist / denom;
}
