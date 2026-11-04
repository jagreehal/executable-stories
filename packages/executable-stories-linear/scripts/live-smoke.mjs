/**
 * Live check of the built CLI against a REAL Linear workspace:
 *   LINEAR_API_KEY=lin_api_… pnpm --filter executable-stories-linear smoke
 *
 * Creates a throwaway issue, publishes a run naming it (plus an issue that
 * does not exist, which must be reported, not fatal), publishes again with
 * everything passing and checks the one attachment was updated in place,
 * then deletes the issue. Writes to the workspace: use a personal or sandbox one.
 */

import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
  console.error("Set LINEAR_API_KEY to a personal Linear API key.");
  process.exit(2);
}
const bin = fileURLToPath(new URL("../dist/bin.js", import.meta.url));

async function linear(query, variables = {}) {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join("; "));
  return body.data;
}

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? `: ${detail}` : ""}`);
};

/** A raw run as a framework reporter writes it, with these stories. */
const rawRun = (stories) =>
  JSON.stringify({
    projectRoot: "/smoke",
    ci: { name: "Smoke", branch: "main", commitSha: "0123456789abcdef" },
    testCases: stories.map(([title, status, tickets]) => ({
      title,
      sourceFile: "smoke.story.test.ts",
      status,
      story: { scenario: title, steps: [], tickets: tickets.map((id) => ({ id })) },
    })),
  });

const publish = async (dir, file, extra = []) => {
  try {
    const { stdout, stderr } = await run(
      process.execPath,
      [
        bin, "publish", file, "--scope", "smoke", "--link", "https://github.com/jagreehal/executable-stories",
        "--trust", "https://app.example/requirements", ...extra,
      ],
      { cwd: dir, env: { ...process.env, GITHUB_SERVER_URL: "", GITHUB_REPOSITORY: "" } },
    );
    return { code: 0, stdout, stderr };
  } catch (error) {
    return { code: error.code, stdout: error.stdout, stderr: error.stderr };
  }
};

const { teams } = await linear("{ teams(first: 1) { nodes { id key } } }");
const team = teams.nodes[0];
const { issueCreate } = await linear(
  "mutation($input: IssueCreateInput!) { issueCreate(input: $input) { issue { id identifier } } }",
  { input: { teamId: team.id, title: "[executable-stories-linear smoke] story", description: "Throwaway; deleted by the smoke test." } },
);
const issue = issueCreate.issue;
const missing = `${team.key}-999999`;
const dir = await mkdtemp(join(tmpdir(), "es-linear-smoke-"));
console.log(`Issue: ${issue.identifier}`);

const attachments = async () =>
  (
    await linear("query($id: String!) { issue(id: $id) { attachments { nodes { title subtitle url } } } }", {
      id: issue.identifier,
    })
  ).issue.attachments.nodes.filter((a) => a.url.includes("executable-stories-ticket="));

try {
  const first = join(dir, "first.json");
  await writeFile(
    first,
    rawRun([
      ["Refund a card payment", "pass", [issue.identifier]],
      ["Refund more than was paid", "fail", [issue.identifier]],
      ["Points at nothing", "pass", [missing]],
    ]),
  );
  const dry = await publish(dir, first, ["--dry-run"]);
  const modal = async () =>
    (
      await linear("query($id: String!) { issue(id: $id) { attachments { nodes { url metadata } } } }", {
        id: issue.identifier,
      })
    ).issue.attachments.nodes.find((a) => a.url.includes("executable-stories-ticket="))?.metadata;
  check("dry run lists both, posts nothing", dry.code === 0 && dry.stdout.includes(issue.identifier) && (await attachments()).length === 0);

  const one = await publish(dir, first);
  check("first publish exits 1 for the missing issue", one.code === 1, `exit ${one.code}`);
  check("first publish posted the real issue", one.stdout.includes(`posted ${issue.identifier}: smoke: 1 passed, 1 failed`), one.stdout.trim());
  check("missing issue reported, not fatal", one.stderr.includes(`could not post ${missing}`), one.stderr.trim());
  const stored = await modal();
  check(
    "Linear stores the modal's title, messages and attributes",
    stored?.title === "smoke: 1 passed, 1 failed" &&
      stored?.messages?.length === 2 &&
      stored.messages[0].body.startsWith("✗ Refund more than was paid (failed)") &&
      stored?.attributes?.some((attribute) => attribute.name === "Assertions"),
    JSON.stringify(stored).slice(0, 300),
  );
  const afterOne = await attachments();
  check("one attachment, failing", afterOne.length === 1 && afterOne[0].title === "Quality checks" && afterOne[0].subtitle === "smoke: 1 passed, 1 failed", JSON.stringify(afterOne));

  // Another writer (the hosted app) posted the same scope under its own link: publishing must replace it.
  await linear(
    "mutation($input: AttachmentCreateInput!) { attachmentCreate(input: $input) { success } }",
    {
      input: {
        issueId: issue.identifier,
        title: "Quality checks",
        subtitle: "from the hosted app",
        url: `https://app.example/requirements?executable-stories-ticket=${issue.identifier}&executable-stories-scope=smoke`,
        metadata: { source: "executable-stories", scope: "smoke" },
      },
    },
  );
  // And a lookalike: our marker on a link nobody trusted. It must be left exactly as it is.
  await linear(
    "mutation($input: AttachmentCreateInput!) { attachmentCreate(input: $input) { success } }",
    {
      input: {
        issueId: issue.identifier,
        title: "Quality checks passed",
        subtitle: "lookalike",
        url: `https://evil.example/login?executable-stories-ticket=${issue.identifier}`,
        metadata: { source: "executable-stories", scope: "smoke" },
      },
    },
  );
  check("hosted app's status and a lookalike seeded", (await attachments()).length === 3);

  const second = join(dir, "second.json");
  await writeFile(
    second,
    rawRun([
      ["Refund a card payment", "pass", [issue.identifier]],
      ["Refund more than was paid", "pass", [issue.identifier]],
    ]),
  );
  const two = await publish(dir, second);
  check("second publish exits 0", two.code === 0, `exit ${two.code} ${two.stderr.trim()}`);
  const afterTwo = await attachments();
  const trusted = afterTwo.filter((a) => !a.url.startsWith("https://evil.example"));
  const lookalike = afterTwo.filter((a) => a.url.startsWith("https://evil.example"));
  check(
    "one trusted status, updated in place to passed",
    trusted.length === 1 && trusted[0].title === "Quality checks passed" && trusted[0].subtitle === "smoke: 2 passed",
    JSON.stringify(trusted),
  );
  check("lookalike left untouched", lookalike.length === 1 && lookalike[0].subtitle === "lookalike", JSON.stringify(lookalike));

  // Two writers at the same moment on a scope with no status yet: both see none and both create.
  // Exactly one status for the scope must remain, never none and never two.
  for (let round = 1; round <= 4; round += 1) {
    const scope = `race-${round}`;
    const [a, b] = await Promise.all([
      // Writers that share a status trust each other's link, as the CLI and the hosted app do.
      publish(dir, second, ["--scope", scope, "--link", `https://writer-a.example/${round}`, "--trust", `https://writer-b.example/${round}`]),
      publish(dir, second, ["--scope", scope, "--link", `https://writer-b.example/${round}`, "--trust", `https://writer-a.example/${round}`]),
    ]);
    const left = (await attachments()).filter((attachment) => attachment.subtitle?.startsWith(`${scope}:`));
    check(
      `concurrent creates, ${scope}: both succeed, one status left`,
      a.code === 0 && b.code === 0 && left.length === 1,
      `exits ${a.code}/${b.code}, ${left.length} left ${a.stderr.trim()} ${b.stderr.trim()}`,
    );
  }

  // A scenario's video: stored in Linear, skipped when unchanged, replaced when it changes.
  const videos = async () =>
    (
      await linear("query($id: String!) { issue(id: $id) { attachments { nodes { title url metadata } } } }", {
        id: issue.identifier,
      })
    ).issue.attachments.nodes.filter((a) => a.metadata?.source === "executable-stories-video");
  const clip = process.env.SMOKE_VIDEO ? await readFile(process.env.SMOKE_VIDEO) : Buffer.from("\0\0\0\x18ftypmp42smoke");
  await mkdir(join(dir, "video"));
  await writeFile(join(dir, "video", "refund-a-card-payment.mp4"), clip);
  const attach = await publish(dir, second, ["--videos", "video"]);
  check("publish --videos attaches the file", attach.code === 0 && attach.stdout.includes(`attached ${issue.identifier}: refund-a-card-payment.mp4`), `${attach.stdout.trim()} ${attach.stderr.trim()}`);
  const stored1 = await videos();
  check("Linear stores the video", stored1.length === 1 && new URL(stored1[0].url).hostname === "uploads.linear.app", JSON.stringify(stored1).slice(0, 300));
  const download = await fetch(stored1[0].url, { headers: { authorization: apiKey } });
  const bytes = Buffer.from(await download.arrayBuffer());
  check("the stored file is the same bytes", download.ok && bytes.equals(clip), `${download.status} ${download.headers.get("content-type")} ${bytes.length} bytes`);
  const again = await publish(dir, second, ["--videos", "video"]);
  check("the same bytes upload nothing", again.stdout.includes(`unchanged ${issue.identifier}`) && (await videos())[0]?.url === stored1[0].url, again.stdout.trim());
  await writeFile(join(dir, "video", "refund-a-card-payment.mp4"), Buffer.concat([clip, Buffer.from("changed")]));
  const replaced = await publish(dir, second, ["--videos", "video"]);
  const stored2 = await videos();
  check("a changed video replaces the old one", replaced.code === 0 && stored2.length === 1 && stored2[0].url !== stored1[0].url, JSON.stringify(stored2.map((a) => a.url)));
} finally {
  await rm(dir, { recursive: true, force: true });
  const deleted = await linear("mutation($id: String!) { issueDelete(id: $id) { success } }", { id: issue.id }).then(
    () => true,
    () => false,
  );
  console.log(`${deleted ? "deleted" : "COULD NOT DELETE"} ${issue.identifier}`);
}
console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
