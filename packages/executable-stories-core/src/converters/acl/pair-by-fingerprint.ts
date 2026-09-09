/**
 * Pairing removals with additions by behaviour fingerprint.
 *
 * Deliberately its own module rather than part of `ids.ts`: that file imports
 * `node:crypto` for the id hashes, so anything sharing it is Node-only, and
 * this rule is needed by browser bundles too (the span graph is derived in the
 * report island). `ids.ts` re-exports it so it stays discoverable beside
 * `behaviourFingerprint`, whose contract it encodes.
 */

/**
 * Pair removals with additions that share a behaviour fingerprint.
 *
 * This is the rule `behaviourFingerprint` asks its callers for, kept beside it
 * so every consumer honours the same two guards:
 *
 * - **The empty fingerprint never matches.** `behaviourFingerprint` returns ""
 *   for a scenario with no steps and no covers, which every planned `it.todo`
 *   placeholder in a suite shares. Matching on it pairs unrelated placeholders.
 * - **One-to-one only.** When one removal could be either of two identical
 *   additions, nothing says which, and pairing one would make the answer depend
 *   on the order the scenarios happen to arrive in.
 *
 * Exact matching only. Fuzzy re-pairing of a scenario that was renamed *and*
 * edited needs similarity scoring and belongs to the caller that wants it.
 */
export function pairByFingerprint<T>(
  removed: readonly T[],
  added: readonly T[],
  fingerprintOf: (item: T) => string,
): Array<{ removed: T; added: T }> {
  const group = (items: readonly T[]): Map<string, T[]> => {
    const byFingerprint = new Map<string, T[]>();
    for (const item of items) {
      const fingerprint = fingerprintOf(item);
      if (fingerprint === "") continue;
      const bucket = byFingerprint.get(fingerprint) ?? [];
      bucket.push(item);
      byFingerprint.set(fingerprint, bucket);
    }
    return byFingerprint;
  };

  const addedByFingerprint = group(added);
  const pairs: Array<{ removed: T; added: T }> = [];

  for (const [fingerprint, removedGroup] of group(removed)) {
    const addedGroup = addedByFingerprint.get(fingerprint);
    if (removedGroup.length === 1 && addedGroup?.length === 1) {
      pairs.push({ removed: removedGroup[0], added: addedGroup[0] });
    }
  }

  return pairs;
}
