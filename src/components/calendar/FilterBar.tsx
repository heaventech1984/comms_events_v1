import Link from "next/link";
import { CategoryThumb } from "@/components/CategoryThumb";
import { calendarHref, toggleCategory, type CalendarState } from "@/lib/calendar";
import { TAGS, type Category } from "@/lib/constants";
import { toggleTag } from "@/lib/tags";

export function FilterBar({
  state,
  categories,
  colours
}: {
  state: CalendarState;
  categories: Category[];
  colours: Record<string, string>;
}) {
  const none = state.categories.length === 0;
  const noTags = state.tags.length === 0;
  return (
    <div className="calendar-filters">
      <div className="filters" role="group" aria-label="Category">
        <Chip href={calendarHref(state, { categories: [] })} current={none} pressed={none}>
          All categories
        </Chip>
        {categories.map((c) => {
          const on = state.categories.includes(c);
          return (
            <Chip
              key={c}
              href={calendarHref(state, { categories: toggleCategory(state.categories, c) })}
              current={on}
              pressed={on}
            >
              <CategoryThumb category={c} size="sm" />
              <span className="swatch" style={{ background: colours[c] }} />
              {c}
            </Chip>
          );
        })}
      </div>
      <div className="filters" role="group" aria-label="Tags">
        <Chip href={calendarHref(state, { tags: [] })} current={noTags} pressed={noTags}>
          All tags
        </Chip>
        {TAGS.map((tag) => {
          const on = state.tags.includes(tag);
          return (
            <Chip key={tag} href={calendarHref(state, { tags: toggleTag(state.tags, tag) })} current={on} pressed={on}>
              {tag}
            </Chip>
          );
        })}
      </div>
    </div>
  );
}

export function Chip({
  href,
  current,
  pressed,
  children,
  "data-testid": testId
}: {
  href: string;
  current: boolean;
  pressed?: boolean;
  children: React.ReactNode;
  "data-testid"?: string;
}) {
  return (
    <Link
      className="chip"
      href={href}
      aria-current={current ? "true" : undefined}
      aria-pressed={pressed}
      scroll={false}
      data-testid={testId}
    >
      {children}
    </Link>
  );
}
