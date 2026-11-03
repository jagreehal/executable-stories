import { describe, it, expect } from "vitest";

import { analyzeSync, applySync, projectBehaviours, collectAttachments } from "../../src/sync/engine";
import { emptyLockfile, hashCaseBody, entriesFor, setEntry } from "../../src/sync/lockfile";
import { renderPlan } from "../../src/sync/report";
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

describe("a story whose steps changed", () => {
  const before = makeCase();
  const edited = makeCase({
    story: {
      ...makeCase().story,
      steps: [{ keyword: "Given", text: "a registered user with a typo fixed" }],
    },
  });

  async function syncedOnce(run = makeRun([before])) {
    const provider = fakeProvider();
    const lockfile = emptyLockfile();
    const analysis = await analyzeSync({ run, provider, lockfile, config });
    await applySync({ analysis, provider, lockfile, config }, { logger: silentLogger });
    return { provider, lockfile };
  }

  function remoteFrom(provider: ReturnType<typeof fakeProvider>, index = 0): RemoteCase {
    const body = provider.created[index]!;
    const id = String(901 + index);
    return { id, url: `https://fake/${id}`, title: body.title, body };
  }

  function withTicket(id: string) {
    return makeCase({ story: { ...edited.story, tickets: [{ id }] } });
  }

  it("records no step outcomes against a case whose update failed", async () => {
    const { provider: first, lockfile } = await syncedOnce();
    const provider = fakeProvider({ cases: [remoteFrom(first)] });
    provider.updateCase = async () => {
      throw new Error("rate limited");
    };
    const stepResults = [{ index: 0, status: "passed", durationMs: 1 }] as const;
    const run = makeRun([makeCase({ ...edited, stepResults: [...stepResults] })]);

    const analysis = await analyzeSync({ run, provider, lockfile, config });
    const applied = await applySync({ analysis, provider, lockfile, config }, { logger: silentLogger });

    expect(applied.errors).toHaveLength(1);
    expect(provider.recorded).toEqual([expect.objectContaining({ caseId: "901", steps: undefined })]);
    expect(analysis.results[0]!.steps).toHaveLength(1);
  });

  it("keeps step outcomes on a case whose update succeeded", async () => {
    const { provider: first, lockfile } = await syncedOnce();
    const provider = fakeProvider({ cases: [remoteFrom(first)] });
    const stepResults = [{ index: 0, status: "passed", durationMs: 1 }] as const;
    const run = makeRun([makeCase({ ...edited, stepResults: [...stepResults] })]);

    const analysis = await analyzeSync({ run, provider, lockfile, config });
    await applySync({ analysis, provider, lockfile, config }, { logger: silentLogger });

    expect(provider.recorded).toEqual([
      expect.objectContaining({ caseId: "901", steps: [{ status: "passed" }] }),
    ]);
  });

  describe("and whose ticket names a case", () => {
    const ticketConfig = { ticketPrefix: "C" };

    it("follows a ticket naming a different case over the title match", async () => {
      const { provider: first, lockfile } = await syncedOnce();
      const other = { id: "902", url: "https://fake/902", title: "Hand written" };
      const provider = fakeProvider({ cases: [remoteFrom(first), other] });

      const analysis = await analyzeSync({
        run: makeRun([withTicket("C902")]),
        provider,
        lockfile,
        config: ticketConfig,
      });
      await applySync({ analysis, provider, lockfile, config: ticketConfig }, { logger: silentLogger });

      expect(analysis.rebound).toHaveLength(0);
      expect(analysis.adopted).toEqual([expect.objectContaining({ caseId: "902" })]);
      expect(analysis.moved).toEqual([expect.objectContaining({ from: "901", to: "902" })]);
      expect(analysis.orphaned).toHaveLength(0);
      expect(provider.updated).toHaveLength(0);
      expect(Object.values(entriesFor(lockfile, "fake"))).toEqual([
        expect.objectContaining({ caseId: "902", owned: false }),
      ]);
    });

    it("keeps the title match and warns when the ticket names no case", async () => {
      const { provider: first, lockfile } = await syncedOnce();
      const provider = fakeProvider({ cases: [remoteFrom(first)] });

      const analysis = await analyzeSync({
        run: makeRun([withTicket("C999")]),
        provider,
        lockfile,
        config: ticketConfig,
      });

      expect(analysis.rebound).toHaveLength(1);
      expect(analysis.update).toEqual([expect.objectContaining({ caseId: "901" })]);
      expect(analysis.skipped).toHaveLength(0);
      expect(analysis.ticketWarnings).toEqual([expect.stringContaining("999")]);
    });

    it("stays owned when the ticket names the case it is already bound to", async () => {
      const { provider: first, lockfile } = await syncedOnce();
      const provider = fakeProvider({ cases: [remoteFrom(first)] });

      const analysis = await analyzeSync({
        run: makeRun([withTicket("C901")]),
        provider,
        lockfile,
        config: ticketConfig,
      });

      expect(analysis.rebound).toHaveLength(1);
      expect(analysis.update).toEqual([expect.objectContaining({ caseId: "901" })]);
      expect(analysis.adopted).toHaveLength(0);
      expect(analysis.orphaned).toHaveLength(0);
    });

    it("still rebinds when the ticket is a requirement, not a case", async () => {
      const { provider: first, lockfile } = await syncedOnce();
      const provider = Object.assign(fakeProvider({ cases: [remoteFrom(first)] }), {
        linksRequirements: true,
      });

      const analysis = await analyzeSync({
        run: makeRun([withTicket("C5")]),
        provider,
        lockfile,
        config: ticketConfig,
      });

      expect(analysis.rebound).toHaveLength(1);
      expect(analysis.update).toEqual([expect.objectContaining({ caseId: "901" })]);
    });
  });

  describe("and whose update failed partway", () => {
    async function halfWritten() {
      const { provider: first, lockfile } = await syncedOnce();
      const remote = remoteFrom(first);
      const provider = fakeProvider({ cases: [remote] });
      const update = provider.updateCase;
      provider.updateCase = async (_id, body) => {
        remote.body = { ...remote.body!, steps: [body.steps[0]!, ...remote.body!.steps.slice(1)] };
        throw new Error("rate limited");
      };
      const run = makeRun([edited]);
      const analysis = await analyzeSync({ run, provider, lockfile, config });
      const applied = await applySync({ analysis, provider, lockfile, config }, { logger: silentLogger });
      provider.updateCase = update;
      return { provider, lockfile, remote, run, applied };
    }

    it("retries on the next run instead of calling it a human edit", async () => {
      const { provider, lockfile, run } = await halfWritten();

      const analysis = await analyzeSync({ run, provider, lockfile, config });

      expect(analysis.skipped).toHaveLength(0);
      expect(analysis.update).toEqual([expect.objectContaining({ caseId: "901" })]);
    });

    it("still protects a human edit made after the failure", async () => {
      const { provider, lockfile, remote, run } = await halfWritten();
      remote.body = { ...remote.body!, description: "edited by hand" };

      const analysis = await analyzeSync({ run, provider, lockfile, config });

      expect(analysis.skipped).toEqual([expect.objectContaining({ reason: "remote-edited" })]);
    });

    it("says the case may be half written when it cannot be read back", async () => {
      const { provider: first, lockfile } = await syncedOnce();
      const provider = fakeProvider({ cases: [remoteFrom(first)] });
      provider.updateCase = async () => {
        throw new Error("rate limited");
      };
      const analysis = await analyzeSync({ run: makeRun([edited]), provider, lockfile, config });
      provider.listCases = async () => {
        throw new Error("still rate limited");
      };

      const applied = await applySync({ analysis, provider, lockfile, config }, { logger: silentLogger });

      expect(applied.errors).toEqual([
        expect.stringContaining("rate limited"),
        expect.stringContaining("may be half written"),
      ]);
    });
  });

  describe("an unchanged story that gains a ticket", () => {
    const ticketConfig = { ticketPrefix: "C" };
    const ticketed = (id: string) =>
      makeCase({ story: { ...before.story, tickets: [{ id }] } });

    it("moves to the case the ticket names and leaves the old one alone", async () => {
      const { provider: first, lockfile } = await syncedOnce();
      const other = { id: "902", url: "https://fake/902", title: "Hand written" };
      const provider = fakeProvider({ cases: [remoteFrom(first), other] });

      const analysis = await analyzeSync({
        run: makeRun([ticketed("C902")]),
        provider,
        lockfile,
        config: ticketConfig,
      });
      await applySync({ analysis, provider, lockfile, config: ticketConfig }, { logger: silentLogger });

      expect(analysis.moved).toEqual([
        expect.objectContaining({ scenario: "User signs in", from: "901", to: "902" }),
      ]);
      expect(renderPlan(analysis, { dryRun: true })).toContain("901 → 902");
      expect(provider.updated).toHaveLength(0);
      expect(provider.recorded).toEqual([expect.objectContaining({ caseId: "902", steps: undefined })]);
      expect(Object.values(entriesFor(lockfile, "fake"))).toEqual([
        expect.objectContaining({ caseId: "902", owned: false }),
      ]);
    });

    it("keeps its binding and results, and warns, when the ticket names no case", async () => {
      const { provider: first, lockfile } = await syncedOnce();
      const provider = fakeProvider({ cases: [remoteFrom(first)] });

      const analysis = await analyzeSync({
        run: makeRun([ticketed("CORE-12")]),
        provider,
        lockfile,
        config: ticketConfig,
      });

      expect(analysis.moved).toHaveLength(0);
      expect(analysis.skipped).toHaveLength(0);
      expect(analysis.results).toEqual([expect.objectContaining({ caseId: "901" })]);
      expect(renderPlan(analysis, { dryRun: true })).toContain("ORE-12");
    });

    it("stays on its case when that is one of several tickets", async () => {
      const { provider: first, lockfile } = await syncedOnce();
      const other = { id: "100", url: "https://fake/100", title: "Hand written" };
      const provider = fakeProvider({ cases: [remoteFrom(first), other] });
      const run = makeRun([
        makeCase({ story: { ...before.story, tickets: [{ id: "C100" }, { id: "C901" }] } }),
      ]);

      const analysis = await analyzeSync({ run, provider, lockfile, config: ticketConfig });

      expect(analysis.moved).toHaveLength(0);
    });

    it("does not warn about a requirement", async () => {
      const { provider: first, lockfile } = await syncedOnce();
      const provider = Object.assign(fakeProvider({ cases: [remoteFrom(first)] }), {
        linksRequirements: true,
      });

      const analysis = await analyzeSync({
        run: makeRun([ticketed("C5")]),
        provider,
        lockfile,
        config: ticketConfig,
      });

      expect(analysis.ticketWarnings).toHaveLength(0);
    });
  });

  it("keeps its case and history instead of making a new one", async () => {
    const { provider: first, lockfile } = await syncedOnce();
    const provider = fakeProvider({ cases: [remoteFrom(first)] });

    const analysis = await analyzeSync({ run: makeRun([edited]), provider, lockfile, config });
    await applySync({ analysis, provider, lockfile, config }, { logger: silentLogger });

    expect(analysis.create).toHaveLength(0);
    expect(analysis.orphaned).toHaveLength(0);
    expect(analysis.update).toEqual([expect.objectContaining({ caseId: "901" })]);
    expect(analysis.rebound).toHaveLength(1);
    expect(provider.updated).toHaveLength(1);
    expect(Object.values(entriesFor(lockfile, "fake"))).toEqual([
      expect.objectContaining({ caseId: "901" }),
    ]);
  });

  it("changes nothing in the lockfile on a dry run", async () => {
    const { provider: first, lockfile } = await syncedOnce();
    const snapshot = JSON.stringify(lockfile);

    await analyzeSync({
      run: makeRun([edited]),
      provider: fakeProvider({ cases: [remoteFrom(first)] }),
      lockfile,
      config,
    });

    expect(JSON.stringify(lockfile)).toBe(snapshot);
  });

  it("does not overwrite a case someone edited by hand", async () => {
    const { provider: first, lockfile } = await syncedOnce();
    const remote = remoteFrom(first);
    remote.body = { ...remote.body!, description: "a tester added this" };

    const analysis = await analyzeSync({
      run: makeRun([edited]),
      provider: fakeProvider({ cases: [remote] }),
      lockfile,
      config,
    });

    expect(analysis.update).toHaveLength(0);
    expect(analysis.skipped).toEqual([expect.objectContaining({ reason: "remote-edited" })]);
  });

  it("will not guess when two stories share the title", async () => {
    const { provider: first, lockfile } = await syncedOnce();
    const twin = makeCase({
      id: "tc-2",
      story: { ...makeCase().story, steps: [{ keyword: "Given", text: "another path" }] },
    });

    const analysis = await analyzeSync({
      run: makeRun([edited, twin]),
      provider: fakeProvider({ cases: [remoteFrom(first)] }),
      lockfile,
      config,
    });

    expect(analysis.rebound).toHaveLength(0);
    expect(analysis.create).toHaveLength(2);
  });

  it("treats a new title with new steps as a new story", async () => {
    const { provider: first, lockfile } = await syncedOnce();
    const other = makeCase({
      story: {
        ...makeCase().story,
        scenario: "User resets a password",
        steps: [{ keyword: "Given", text: "a forgotten password" }],
      },
    });

    const analysis = await analyzeSync({
      run: makeRun([other]),
      provider: fakeProvider({ cases: [remoteFrom(first)] }),
      lockfile,
      config,
    });

    expect(analysis.create).toHaveLength(1);
    expect(analysis.orphaned).toHaveLength(1);
  });
});

describe("step results", () => {
  const steps = [
    { index: 0, status: "passed", durationMs: 1 },
    { index: 1, status: "failed", durationMs: 1, errorMessage: "boom" },
    { index: 2, status: "skipped", durationMs: 0 },
  ] as const;

  it("travels with a result on a case we own", async () => {
    const provider = fakeProvider();
    const lockfile = emptyLockfile();
    const run = makeRun([makeCase({ status: "failed", stepResults: [...steps] })]);

    const analysis = await analyzeSync({ run, provider, lockfile, config });
    await applySync({ analysis, provider, lockfile, config }, { logger: silentLogger });

    expect(provider.recorded[0]!.steps).toEqual([
      { status: "passed" },
      { status: "failed", message: "boom" },
      { status: "skipped" },
    ]);
  });

  it("stays off a hand-written case, whose steps are not ours", async () => {
    const run = makeRun([
      makeCase({
        status: "failed",
        stepResults: [...steps],
        story: { ...makeCase().story, tickets: [{ id: "C42" }] },
      }),
    ]);
    const remote: RemoteCase = { id: "42", url: "https://fake/42", title: "QA", body: undefined };

    const analysis = await analyzeSync({
      run,
      provider: fakeProvider({ cases: [remote] }),
      lockfile: emptyLockfile(),
      config: { ticketPrefix: "C" },
    });

    expect(analysis.results[0]!.steps).toBeUndefined();
  });
});

describe("a story ticket that names a requirement", () => {
  const ticketed = makeCase({
    story: { ...makeCase().story, tickets: [{ id: "PROJ-5" }, { id: "PAY-892" }] },
  });
  const xrayLike = { ticketPrefix: "PROJ-", ticketPrefixStrip: false };

  it("creates the test and links the requirement", async () => {
    const provider = Object.assign(fakeProvider(), { linksRequirements: true });
    const lockfile = emptyLockfile();
    const run = makeRun([ticketed]);

    const analysis = await analyzeSync({ run, provider, lockfile, config: xrayLike });
    await applySync({ analysis, provider, lockfile, config: xrayLike }, { logger: silentLogger });

    expect(analysis.skipped).toHaveLength(0);
    expect(analysis.create).toHaveLength(1);
    expect(provider.recorded[0]!.requirements).toEqual({
      title: "User signs in",
      keys: ["PROJ-5", "PAY-892"],
    });
  });

  it("adopts the test a later ticket names, past a requirement", async () => {
    const provider = Object.assign(
      fakeProvider({ cases: [{ id: "PROJ-42", url: "https://fake/42", title: "Hand written" }] }),
      { linksRequirements: true },
    );
    const run = makeRun([
      makeCase({ story: { ...makeCase().story, tickets: [{ id: "PROJ-1" }, { id: "PROJ-42" }] } }),
    ]);

    const analysis = await analyzeSync({ run, provider, lockfile: emptyLockfile(), config: xrayLike });

    expect(analysis.create).toHaveLength(0);
    expect(analysis.adopted).toEqual([expect.objectContaining({ caseId: "PROJ-42" })]);
  });

  it("still skips a missing case on a provider without requirements", async () => {
    const analysis = await analyzeSync({
      run: makeRun([ticketed]),
      provider: fakeProvider(),
      lockfile: emptyLockfile(),
      config: xrayLike,
    });

    expect(analysis.skipped).toEqual([expect.objectContaining({ reason: "case-missing" })]);
  });
});

describe("the plan", () => {
  it("counts the results a new case will record", async () => {
    const analysis = await analyzeSync({
      run: makeRun([makeCase(), makeCase({ id: "tc-2", status: "pending", story: { ...makeCase().story, scenario: "Later", steps: [] } })]),
      provider: fakeProvider(),
      lockfile: emptyLockfile(),
      config,
    });

    expect(renderPlan(analysis, { dryRun: true })).toMatch(/results\s+1 executions/);
  });
});
