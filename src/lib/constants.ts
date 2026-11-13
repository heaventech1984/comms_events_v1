export const ROLES = ["admin", "cell leader", "member"] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORIES = ["Social", "Professional", "Faith", "Activities"] as const;
export type Category = (typeof CATEGORIES)[number];

/** Stickers on an event. An event has one category and any number of these. */
export const TAGS = [
  "Christian",
  "University",
  "Family-Friendly",
  "Networking",
  "Meetup",
  "Free",
  "Fee",
  "In Person",
  "Online",
  "Spirituality",
  "Philosophy",
  "Music",
  "Fitness",
  "Learning",
  "Church",
  "Creative"
] as const;
export type Tag = (typeof TAGS)[number];

/** The mark drawn in front of a tag button. The stored tag is still the word. */
export const TAG_MARK: Record<Tag, string> = {
  Christian: "✝️",
  University: "🎓",
  "Family-Friendly": "👨‍👩‍👧",
  Networking: "🔗",
  Meetup: "🤝",
  Free: "🎫",
  Fee: "💵",
  "In Person": "📍",
  Online: "💻",
  Spirituality: "🪷",
  Philosophy: "🧠",
  Music: "🎵",
  Fitness: "🏋️",
  Learning: "📖",
  Church: "⛪",
  Creative: "🎨"
};

export function tagChipLabel(tag: Tag): string {
  return `${TAG_MARK[tag]} ${tag}`;
}

/** Soft but distinct accents — berry / sage / gold family to match the blush UI. */
export const DEFAULT_COLOURS: Record<Category, string> = {
  Social: "#c48b9f",
  Professional: "#a8434d",
  Faith: "#7d9b78",
  Activities: "#c4a574"
};

// COUNT_AND_NAME_CELL lets every member read the name and cell number of everyone booked
// on an event. Default stays COUNT; see DECISIONS.md "Member attendee view".
export const MEMBER_ATTENDEE_VIEWS = ["COUNT", "COUNT_AND_INITIALS", "COUNT_AND_NAME_CELL"] as const;
export type MemberAttendeeView = (typeof MEMBER_ATTENDEE_VIEWS)[number];

export function parseMemberAttendeeView(value: unknown): MemberAttendeeView {
  return MEMBER_ATTENDEE_VIEWS.includes(value as MemberAttendeeView) ? (value as MemberAttendeeView) : "COUNT";
}

/** How a person felt after an event they went to. Private to them. */
export const FEEDBACK_RATINGS = ["LOVED", "OK", "NOT_FOR_ME"] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export function parseFeedbackRating(value: unknown): FeedbackRating | null {
  return FEEDBACK_RATINGS.includes(value as FeedbackRating) ? (value as FeedbackRating) : null;
}

export function parseCategory(value: unknown): Category | null {
  return CATEGORIES.includes(value as Category) ? (value as Category) : null;
}

export const SESSION_COOKIE = "gather_session";
export const SESSION_HOURS = 12;
export const GENERIC_LOGIN_ERROR = "Cell number or password is not recognised.";

export function parseRole(value: string): Role | null {
  const normalised = value.trim().toLowerCase();
  if (normalised === "admin") return "admin";
  if (normalised === "cell leader" || normalised === "cell_leader" || normalised === "cellleader") {
    return "cell leader";
  }
  if (normalised === "member" || normalised === "user") return "member";
  return null;
}

export function categoryEnabledKey(category: Category) {
  switch (category) {
    case "Social":
      return "socialEnabled" as const;
    case "Professional":
      return "professionalEnabled" as const;
    case "Faith":
      return "faithEnabled" as const;
    case "Activities":
      return "activitiesEnabled" as const;
  }
}
