import { describe, expect, it } from "vitest";
import { cleanFeedbackComment, feedbackInputProblem } from "@/lib/feedback";
import { LIMITS } from "@/lib/security";

describe("feedbackInputProblem", () => {
  it("asks for a rating and caps the note", () => {
    expect(feedbackInputProblem({ rating: "nope", comment: "" })).toMatch(/how it felt/i);
    expect(feedbackInputProblem({ rating: "LOVED", comment: "" })).toBeNull();
    expect(feedbackInputProblem({ rating: "OK", comment: "Nice hall." })).toBeNull();
    expect(feedbackInputProblem({ rating: "LOVED", comment: "x".repeat(LIMITS.feedbackComment + 1) })).toMatch(
      /400 characters/
    );
  });
});

describe("cleanFeedbackComment", () => {
  it("trims and strips control characters", () => {
    expect(cleanFeedbackComment("  Warm room\u0000  ")).toBe("Warm room");
  });
});
