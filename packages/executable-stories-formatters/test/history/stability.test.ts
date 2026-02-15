import { describe, it, expect } from "vitest";
import { calculateStability } from "../../src/history/stability";

describe("calculateStability", () => {
  it("perfect pass rate + no flakiness -> grade A", () => {
    const grade = calculateStability({
      passRate: 1.0,
      flakinessScore: 0,
      longestPassStreak: 10,
      sampleSize: 10,
    });
    expect(grade).toBe("A");
  });

  it("high pass rate with some flakiness -> grade B or C", () => {
    // passRate=0.9, flakinessScore=0.3, streak=5, sample=10
    // score = 0.9*0.6 + 0.7*0.3 + (5/10)*0.1 = 0.54 + 0.21 + 0.05 = 0.80
    const grade = calculateStability({
      passRate: 0.9,
      flakinessScore: 0.3,
      longestPassStreak: 5,
      sampleSize: 10,
    });
    // 0.80 -> not >= 0.85 -> C
    expect(grade).toBe("C");
  });

  it("good pass rate with low flakiness -> grade B", () => {
    // passRate=0.95, flakinessScore=0.1, streak=8, sample=10
    // score = 0.95*0.6 + 0.9*0.3 + (8/10)*0.1 = 0.57 + 0.27 + 0.08 = 0.92
    const grade = calculateStability({
      passRate: 0.95,
      flakinessScore: 0.1,
      longestPassStreak: 8,
      sampleSize: 10,
    });
    expect(grade).toBe("B");
  });

  it("low pass rate -> grade D or F", () => {
    // passRate=0.3, flakinessScore=0.5, streak=2, sample=10
    // score = 0.3*0.6 + 0.5*0.3 + (2/10)*0.1 = 0.18 + 0.15 + 0.02 = 0.35
    const grade = calculateStability({
      passRate: 0.3,
      flakinessScore: 0.5,
      longestPassStreak: 2,
      sampleSize: 10,
    });
    expect(grade).toBe("F");
  });

  it("grade boundary: A >= 0.95", () => {
    // passRate=1.0, flakinessScore=0.05, streak=10, sample=10
    // score = 1.0*0.6 + 0.95*0.3 + (10/10)*0.1 = 0.6 + 0.285 + 0.1 = 0.985
    const grade = calculateStability({
      passRate: 1.0,
      flakinessScore: 0.05,
      longestPassStreak: 10,
      sampleSize: 10,
    });
    expect(grade).toBe("A");
  });

  it("grade boundary: B >= 0.85", () => {
    // passRate=0.9, flakinessScore=0, streak=9, sample=10
    // score = 0.9*0.6 + 1.0*0.3 + (9/10)*0.1 = 0.54 + 0.3 + 0.09 = 0.93
    const grade = calculateStability({
      passRate: 0.9,
      flakinessScore: 0,
      longestPassStreak: 9,
      sampleSize: 10,
    });
    expect(grade).toBe("B");
  });

  it("grade boundary: C >= 0.70", () => {
    // passRate=0.7, flakinessScore=0, streak=7, sample=10
    // score = 0.7*0.6 + 1.0*0.3 + (7/10)*0.1 = 0.42 + 0.3 + 0.07 = 0.79
    const grade = calculateStability({
      passRate: 0.7,
      flakinessScore: 0,
      longestPassStreak: 7,
      sampleSize: 10,
    });
    expect(grade).toBe("C");
  });

  it("grade boundary: D >= 0.50", () => {
    // passRate=0.5, flakinessScore=0.3, streak=3, sample=10
    // score = 0.5*0.6 + 0.7*0.3 + (3/10)*0.1 = 0.30 + 0.21 + 0.03 = 0.54
    const grade = calculateStability({
      passRate: 0.5,
      flakinessScore: 0.3,
      longestPassStreak: 3,
      sampleSize: 10,
    });
    expect(grade).toBe("D");
  });

  it("grade F < 0.50", () => {
    // passRate=0.2, flakinessScore=0.8, streak=1, sample=10
    // score = 0.2*0.6 + 0.2*0.3 + (1/10)*0.1 = 0.12 + 0.06 + 0.01 = 0.19
    const grade = calculateStability({
      passRate: 0.2,
      flakinessScore: 0.8,
      longestPassStreak: 1,
      sampleSize: 10,
    });
    expect(grade).toBe("F");
  });

  it("uses min(sampleSize, 10) for streak normalization", () => {
    // With sampleSize=5, streak=5 normalizes to 5/5 = 1.0 (not 5/10 = 0.5)
    const gradeSmall = calculateStability({
      passRate: 1.0,
      flakinessScore: 0,
      longestPassStreak: 5,
      sampleSize: 5,
    });
    // score = 1.0*0.6 + 1.0*0.3 + (5/5)*0.1 = 0.6 + 0.3 + 0.1 = 1.0
    expect(gradeSmall).toBe("A");
  });
});
