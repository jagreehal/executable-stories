import { describe, it, expect } from "vitest";

import { analyzeSync, applySync, projectBehaviours, collectAttachments } from "../../src/sync/engine";
import { emptyLockfile, hashCaseBody, entriesFor, setEntry } from "../../src/sync/lockfile";
import type { RemoteCase } from "../../src/sync/port";
import { fakeProvider, makeCase, makeRun, silentLogger } from "./helpers";

const config = {};

describe("projectBehaviours", () => {
  it("keeps the same fingerprint when a test is renamed and its file moves", () => {
    const before = projectBehaviours(makeRun([makeCase()]), config);
    const after = projectBehaviours(
      makeRun([
        makeCase({
          story: {
            ...makeCase().story,
            scenario: "A signed-in user reaches the dashboard",
          },
          sourceFile: "src/features/auth/signin.story.test.ts",
        }),
      ]),
      config,
    );

    expect(after[0]!.fingerprint).toBe(before[0]!.fingerprint);
  });

  it("falls back to the canonical id when two scenarios share their content", () => {
    const steps = [{ keyword: "Given", text: "identical" }];
    const run = makeRun([
      makeCase({ id: "tc-a", story: { ...makeCase().story, scenario: "One", steps } }),
      makeCase({ id: "tc-b", story: { ...makeCase().story, scenario: "Two", steps } }),
    ]);

    const behaviours = projectBehaviours(run, config);

    expect(behaviours[0]!.fingerprint).toBe("tc-a");
    expect(behaviours[1]!.fingerprint).toBe("tc-b");
  });

  it("puts the source location and requirements into the case description", () => {
    const run = makeRun([
      makeCase({
        story: {
          ...makeCase().story,
          tickets: [{ id: "PAY-1", url: "https://jira/PAY-1" }],
          covers: ["src/pay.ts"],
        },
      }),
    ]);

    const [behaviour] = projectBehaviours(run, config);

    expect(behaviour!.body.description).toContain("PAY-1");
    expect(behaviour!.body.description).toContain("src/pay.ts");
    expect(behaviour!.body.description).toContain("src/auth.story.test.ts:1");
  });
});

describe("analyzeSync", () => {
  it("plans a create for a story with no binding", async () => {
    const provider = fakeProvider();

    const analysis = await analyzeSync({
      run: makeRun([makeCase()]),
      provider,
      lockfile: emptyLockfile(),
      config,
    });

    expect(analysis.create).toHaveLength(1);
    expect(analysis.update).toHaveLength(0);
    expect(analysis.results).toHaveLength(0);
  });

  it("reports unchanged when the provider already holds exactly this body", async () => {
    const run = makeRun([makeCase()]);
    const [behaviour] = projectBehaviours(run, config);
    const remote: RemoteCase = {
      id: "42",
      url: "https://fake/42",
      title: behaviour!.body.title,
      body: behaviour!.body,
    };

    const lockfile = emptyLockfile();
    setEntry(lockfile, "fake", behaviour!.fingerprint, {
      caseId: "42",
      url: remote.url,
      hash: hashCaseBody(behaviour!.body),
      title: remote.title,
      owned: true,
    });

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({ cases: [remote] }),
      lockfile,
      config,
    });

    expect(analysis.unchanged).toHaveLength(1);
    expect(analysis.update).toHaveLength(0);
    expect(analysis.results).toHaveLength(1);
  });

  it("skips a case a human edited after we last wrote it", async () => {
    const run = makeRun([makeCase()]);
    const [behaviour] = projectBehaviours(run, config);
    const remote: RemoteCase = {
      id: "42",
      url: "https://fake/42",
      title: behaviour!.body.title,
      body: { ...behaviour!.body, description: "someone typed this by hand" },
    };

    const lockfile = emptyLockfile();
    setEntry(lockfile, "fake", behaviour!.fingerprint, {
      caseId: "42",
      url: remote.url,
      hash: hashCaseBody(behaviour!.body),
      title: remote.title,
      owned: true,
    });

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({ cases: [remote] }),
      lockfile,
      config,
    });

    expect(analysis.skipped).toEqual([
      expect.objectContaining({ caseId: "42", reason: "remote-edited" }),
    ]);
    expect(analysis.update).toHaveLength(0);
  });

  it("falls back to the stored hash when the provider returns no body", async () => {
    const run = makeRun([makeCase()]);
    const [behaviour] = projectBehaviours(run, config);
    // No `body`: some providers only list ids and titles.
    const remote: RemoteCase = { id: "42", url: "https://fake/42", title: behaviour!.body.title };

    const lockfile = emptyLockfile();
    setEntry(lockfile, "fake", behaviour!.fingerprint, {
      caseId: "42",
      url: remote.url,
      hash: hashCaseBody(behaviour!.body),
      title: remote.title,
      owned: true,
    });

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({ cases: [remote] }),
      lockfile,
      config,
    });

    // Nothing changed on our side since the last write, so re-sending an
    // identical body would be noise. The plan still says drift is unverifiable.
    expect(analysis.unchanged).toHaveLength(1);
    expect(analysis.update).toHaveLength(0);
    expect(analysis.driftUncheckable).toBe(1);
  });

  it("updates a bodyless case once the story actually changes", async () => {
    const run = makeRun([makeCase()]);
    const [behaviour] = projectBehaviours(run, config);
    const remote: RemoteCase = { id: "42", url: "https://fake/42", title: behaviour!.body.title };

    const lockfile = emptyLockfile();
    setEntry(lockfile, "fake", behaviour!.fingerprint, {
      caseId: "42",
      url: remote.url,
      hash: hashCaseBody({ ...behaviour!.body, description: "what we wrote last time" }),
      title: remote.title,
      owned: true,
    });

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({ cases: [remote] }),
      lockfile,
      config,
    });

    expect(analysis.update).toHaveLength(1);
    expect(analysis.unchanged).toHaveLength(0);
  });

  it("never rewrites the body of a hand-authored case reached through a ticket", async () => {
    const run = makeRun([
      makeCase({ story: { ...makeCase().story, tickets: [{ id: "C42" }] } }),
    ]);
    const remote: RemoteCase = {
      id: "42",
      url: "https://fake/42",
      title: "Hand written by QA",
      body: { title: "Hand written by QA", steps: [], description: "theirs", links: [] },
    };

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({ cases: [remote] }),
      lockfile: emptyLockfile(),
      config: { ticketPrefix: "C" },
    });

    expect(analysis.adopted).toHaveLength(1);
    expect(analysis.update).toHaveLength(0);
    expect(analysis.create).toHaveLength(0);
    // Executions still land against it.
    expect(analysis.results).toEqual([expect.objectContaining({ caseId: "42" })]);
  });

  it("keeps the whole ticket id when the prefix is part of it", async () => {
    const run = makeRun([
      makeCase({ story: { ...makeCase().story, tickets: [{ id: "PROJ-42" }] } }),
    ]);
    const remote: RemoteCase = { id: "PROJ-42", url: "https://jira/PROJ-42", title: "Existing" };

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({ cases: [remote] }),
      lockfile: emptyLockfile(),
      config: { ticketPrefix: "PROJ-", ticketPrefixStrip: false },
    });

    expect(analysis.adopted[0]!.caseId).toBe("PROJ-42");
  });

  it("classifies remote cases the tests already cover", async () => {
    const run = makeRun([makeCase()]);
    const cases: RemoteCase[] = [
      { id: "1", url: "u", title: "User signs in!" },
      { id: "2", url: "u", title: "Completely unrelated admin flow" },
    ];

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({ cases }),
      lockfile: emptyLockfile(),
      config,
    });

    const byId = new Map(analysis.remote.map((entry) => [entry.case.id, entry.classification]));
    expect(byId.get("1")).toBe("duplicated");
    expect(byId.get("2")).toBe("manual-only");
  });

  it("flags a near-identical manual case without ever binding to it", async () => {
    const run = makeRun([makeCase()]);
    const remote: RemoteCase = {
      id: "7",
      url: "u",
      title: "Sign in happy path",
      body: {
        title: "Sign in happy path",
        steps: [
          { keyword: "Given", text: "a registered user" },
          { keyword: "When", text: "they submit valid credentials" },
          { keyword: "Then", text: "they reach the dashboard" },
        ],
        description: "",
        links: [],
      },
    };

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({ cases: [remote] }),
      lockfile: emptyLockfile(),
      config,
    });

    expect(analysis.remote[0]!.classification).toBe("possible-duplicate");
    expect(analysis.remote[0]!.resembles).toBe("User signs in");
    // Still planned as a create: a guess never becomes a binding.
    expect(analysis.create).toHaveLength(1);
  });

  it("reports orphans and warns when the run looks filtered", async () => {
    const lockfile = emptyLockfile();
    for (const index of [1, 2, 3, 4]) {
      setEntry(lockfile, "fake", `gone-${index}`, {
        caseId: String(index),
        url: "u",
        hash: "h",
        title: `Deleted story ${index}`,
        owned: true,
      });
    }

    const analysis = await analyzeSync({
      run: makeRun([makeCase()]),
      provider: fakeProvider(),
      lockfile,
      config,
    });

    expect(analysis.orphaned).toHaveLength(4);
    expect(analysis.partialRunWarning).toContain("4 of 4");
  });

  it("names the capabilities a read-only provider is missing", async () => {
    const analysis = await analyzeSync({
      run: makeRun([makeCase()]),
      provider: fakeProvider({ readOnly: true }),
      lockfile: emptyLockfile(),
      config,
    });

    expect(analysis.unsupported).toContain("createCase");
  });
});

describe("collectAttachments", () => {
  const attachment = {
    name: "screenshot.png",
    mediaType: "image/png",
    body: Buffer.from("pretend png").toString("base64"),
    contentEncoding: "BASE64" as const,
  };

  it("uploads nothing for a passing test under the default policy", () => {
    const result = collectAttachments({
      testCase: makeCase({ attachments: [attachment] }),
      policy: "failed",
    });

    expect(result.attachments).toHaveLength(0);
  });

  it("uploads evidence for a failing test", () => {
    const result = collectAttachments({
      testCase: makeCase({ status: "failed", attachments: [attachment] }),
      policy: "failed",
    });

    expect(result.attachments[0]).toMatchObject({ filename: "screenshot.png", role: "screenshot" });
  });

  it("reports a file over the provider limit instead of trying to send it", () => {
    const result = collectAttachments({
      testCase: makeCase({ status: "failed", attachments: [attachment] }),
      policy: "all",
      maxBytes: 3,
    });

    expect(result.attachments).toHaveLength(0);
    expect(result.oversized[0]).toMatchObject({ filename: "screenshot.png", limit: 3 });
  });

  it("classifies video by media type", () => {
    const result = collectAttachments({
      testCase: makeCase({
        status: "failed",
        attachments: [{ ...attachment, name: "run.webm", mediaType: "video/webm" }],
      }),
      policy: "all",
    });

    expect(result.attachments[0]!.role).toBe("video");
  });
});

describe("applySync", () => {
  it("records the binding for a created case as owned", async () => {
    const provider = fakeProvider();
    const lockfile = emptyLockfile();
    const run = makeRun([makeCase()]);

    const analysis = await analyzeSync({ run, provider, lockfile, config });
    const applied = await applySync({ analysis, provider, lockfile, config }, { logger: silentLogger });

    expect(applied.created).toHaveLength(1);
    const entry = Object.values(entriesFor(lockfile, "fake"))[0];
    expect(entry).toMatchObject({ caseId: "901", owned: true });
    // The execution for the just-created case is recorded in the same pass.
    expect(provider.recorded).toHaveLength(1);
  });

  it("collects an error per failed write rather than aborting the run", async () => {
    const provider = fakeProvider();
    provider.createCase = async () => {
      throw new Error("TestRail said no");
    };
    const lockfile = emptyLockfile();
    const run = makeRun([makeCase()]);

    const analysis = await analyzeSync({ run, provider, lockfile, config });
    const applied = await applySync({ analysis, provider, lockfile, config }, { logger: silentLogger });

    expect(applied.errors[0]).toContain("TestRail said no");
    expect(applied.created).toHaveLength(0);
  });

  it("marks a ticket-bound case as not owned so later runs leave it alone", async () => {
    const provider = fakeProvider({
      cases: [{ id: "42", url: "https://fake/42", title: "Theirs" }],
    });
    const lockfile = emptyLockfile();
    const run = makeRun([
      makeCase({ story: { ...makeCase().story, tickets: [{ id: "C42" }] } }),
    ]);
    const ticketConfig = { ticketPrefix: "C" };

    const analysis = await analyzeSync({ run, provider, lockfile, config: ticketConfig });
    await applySync({ analysis, provider, lockfile, config: ticketConfig }, { logger: silentLogger });

    const entry = Object.values(entriesFor(lockfile, "fake"))[0];
    expect(entry).toMatchObject({ caseId: "42", owned: false });
    expect(provider.updated).toHaveLength(0);
  });
});
