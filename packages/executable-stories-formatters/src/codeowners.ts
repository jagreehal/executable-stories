/**
 * CODEOWNERS parsing, so a failing scenario can name the team that fixes it.
 *
 * A red run that belongs to everyone belongs to nobody until someone
 * volunteers. `triage --by-owner` groups the worklist the way the repo already
 * divides responsibility, using the file every GitHub repo already has.
 *
 * Supports the common CODEOWNERS subset — leading `/`, trailing `/`,
 * `*`, `**`, and bare extension globs. Character classes, `?`, and negation are
 * not implemented; swap in a gitignore-grade matcher if a repo needs them.
 */

export interface CodeownersRule {
  pattern: string;
  owners: string[];
}

export function parseCodeowners(text: string): CodeownersRule[] {
  const rules: CodeownersRule[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.split("#")[0]!.trim();
    if (line === "") continue;
    const [pattern, ...owners] = line.split(/\s+/);
    if (!pattern || owners.length === 0) continue;
    rules.push({ pattern, owners });
  }
  return rules;
}

function toRegExp(pattern: string): RegExp {
  // A pattern with no slash (except a trailing one) matches at any depth, the
  // way `*.md` does in gitignore; anything anchored with `/` matches from root.
  const anchored = pattern.startsWith("/");
  const body = anchored ? pattern.slice(1) : pattern;
  const floating = !body.replace(/\/$/, "").includes("/");

  // `**` crosses directory boundaries, a single `*` does not. Split on the
  // double star first so each half can be globbed without a sentinel.
  const globbed = body
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .split("**")
    .map((part) => part.replace(/\*/g, "[^/]*"))
    .join(".*");

  // A directory pattern owns everything under it; a file pattern owns itself.
  const tail = body.endsWith("/") ? ".*" : "(/.*)?";
  return new RegExp(`^${floating ? "(.*/)?" : ""}${globbed}${tail}$`);
}

/** Owners of a path — last matching rule wins, as git resolves CODEOWNERS. */
export function ownersFor(rules: readonly CodeownersRule[], path: string): string[] {
  const clean = path.replace(/^\.\//, "").replace(/^\//, "");
  let owners: string[] = [];
  for (const rule of rules) {
    if (toRegExp(rule.pattern).test(clean)) owners = rule.owners;
  }
  return owners;
}
