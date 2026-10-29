/**
 * A failing story test lists its steps in the failure message, so a red run
 * shows how far the story got without opening the report.
 *
 * `it.failing` keeps errors out of circus's `test.errors`, so each case fails
 * by hand instead: it pushes its error onto the running test the way circus
 * does. The story module's afterEach (registered at import) annotates it, then
 * the afterEach below (registered after it, so it runs next) takes the error
 * back out so the case passes, and keeps it for the checks.
 */
import { afterEach, describe, expect, it } from "@jest/globals";
import { story, _internal } from "../story-api";
import { STEP_TRAIL_MARKER, stripStepTrail } from "../step-trail";

const seen: Record<string, Error> = {};
let pending: { key: string; err: Error } | undefined;

/** Fail the running test with `err`, as circus records a thrown error. */
function failWith(key: string, err: Error): void {
  _internal.currentCircusTest()!.errors.push(err);
  pending = { key, err };
}

afterEach(() => {
  if (!pending) return;
  const errors = _internal.currentCircusTest()!.errors;
  errors.splice(errors.indexOf(pending.err), 1);
  seen[pending.key] = pending.err;
  pending = undefined;
});

describe("failure step trail", () => {
  it("marker steps: the last claim is the one that failed", () => {
    story.init();
    story.given("a balance of 50");
    story.when("100 is deposited");
    story.then("the balance is 150");
    failWith("marker", new Error("expected 150 to be 151"));
  });

  it("wrapped step: the body that threw is marked", () => {
    story.init();
    story.given("setup", () => {});
    try {
      story.when("it breaks", () => {
        throw new Error("kaput");
      });
    } catch (err) {
      failWith("wrapped", err as Error);
    }
  });

  it("failure after a finished wrapped step", () => {
    story.init();
    story.given("setup", () => {});
    failWith("after", new Error("later"));
  });

  it("a caught throw does not own a later failure", () => {
    story.init();
    expect(() =>
      story.given("a rejected input", () => {
        throw new Error("rejected");
      }),
    ).toThrow("rejected");
    story.then("the total is 3");
    failWith("caught", new Error("expected 1 to be 3"));
  });

  it("nested steps mark the inner one that threw", () => {
    story.init();
    try {
      story.when("the order is placed", () => {
        story.and("payment is taken", () => {
          throw new Error("declined");
        });
      });
    } catch (err) {
      failWith("nested", err as Error);
    }
  });

  it("a plain test after a story gets no trail", () => {
    failWith("plain", new Error("plain"));
  });
});

describe("failure step trail: results", () => {
  it("appends a checklist to the message", () => {
    expect(seen.marker.message).toBe(
      "expected 150 to be 151" +
        STEP_TRAIL_MARKER +
        "  ✓ Given a balance of 50\n  ✓ When 100 is deposited\n  ✗ Then the balance is 150",
    );
    expect(seen.wrapped.message).toBe("kaput" + STEP_TRAIL_MARKER + "  ✓ Given setup\n  ✗ When it breaks");
    expect(seen.after.message).toBe(
      "later" + STEP_TRAIL_MARKER + "  ✓ Given setup\n  ✗ (failed after the last step)",
    );
    expect(seen.plain.message).toBe("plain");
    expect(seen.caught.message).toBe(
      "expected 1 to be 3" + STEP_TRAIL_MARKER + "  ✓ Given a rejected input\n  ✗ Then the total is 3",
    );
    expect(seen.nested.message).toBe(
      "declined" + STEP_TRAIL_MARKER + "  ✓ When the order is placed\n  ✗ And payment is taken",
    );
  });

  it("puts it in the stack Jest prints, and stripStepTrail takes it back out", () => {
    const stack = seen.wrapped.stack!;
    expect(stack).toMatch(/^Error: kaput\n\nStory steps:\n {2}✓ Given setup\n {2}✗ When it breaks\n {4}at /);
    expect(stripStepTrail(stack)).toMatch(/^Error: kaput\n {4}at /);
  });
});

describe("stripStepTrail", () => {
  it("keeps a timeout message's closing quote", () => {
    const thrown = `thrown: "Exceeded timeout of 200 ms for a test.${STEP_TRAIL_MARKER}  ✗ Given a slow call"\n\n    at x`;
    expect(stripStepTrail(thrown)).toBe(`thrown: "Exceeded timeout of 200 ms for a test."\n\n    at x`);
  });
});
