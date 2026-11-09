export const FEEDBACK_AREAS = [
  "For you",
  "Mobile",
  "Scraper",
  "UI",
  "Security",
  "Ops",
  "Data",
  "Leaders",
  "Members",
  "Pending",
  "Insights",
  "Calendar",
  "Bookings",
  "Home",
  "Login",
  "Import",
  "Other"
] as const;

export type FeedbackArea = (typeof FEEDBACK_AREAS)[number];

export const ISSUE_SEVERITIES = ["blocks", "annoying", "minor"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export function isFeedbackArea(value: string): value is FeedbackArea {
  return (FEEDBACK_AREAS as readonly string[]).includes(value);
}

export function isIssueSeverity(value: string): value is IssueSeverity {
  return (ISSUE_SEVERITIES as readonly string[]).includes(value);
}
