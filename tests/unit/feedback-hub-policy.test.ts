import { describe, expect, it } from "vitest";
import {
  canAccessFeedback,
  canApproveDesirable,
  canSubmitFeedback,
  canViewFeedbackRow
} from "@/lib/feedback-hub/policy";

const admin = { id: "a", role: "admin" as const, cellId: null };
const leader = { id: "l", role: "cell leader" as const, cellId: "c1" };
const member = { id: "m", role: "member" as const, cellId: "c1" };

describe("feedback hub policy", () => {
  it("allows admin and cell leader access", () => {
    expect(canAccessFeedback(admin).ok).toBe(true);
    expect(canAccessFeedback(leader).ok).toBe(true);
    expect(canAccessFeedback(member).ok).toBe(false);
  });

  it("lets leaders see own cell and blocking issues", () => {
    expect(
      canViewFeedbackRow(leader, {
        kind: "issue",
        severity: "blocks",
        submitterId: "x",
        cellId: "c2",
        status: "open"
      })
    ).toBe(true);
    expect(
      canViewFeedbackRow(leader, {
        kind: "issue",
        severity: "minor",
        submitterId: "x",
        cellId: "c2",
        status: "open"
      })
    ).toBe(false);
  });

  it("reserves approve for admin", () => {
    expect(canApproveDesirable(admin).ok).toBe(true);
    expect(canApproveDesirable(leader).ok).toBe(false);
  });

  it("allows submit for leaders", () => {
    expect(canSubmitFeedback(leader, "issue").ok).toBe(true);
    expect(canSubmitFeedback(member, "issue").ok).toBe(false);
  });
});
