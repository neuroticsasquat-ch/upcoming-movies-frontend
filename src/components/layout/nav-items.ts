import type { FollowAccess } from "@/components/follow/access";
import { SITE_NAME } from "@/lib/seo";

export const WORDMARK = SITE_NAME;

export interface NavItem {
  label: string;
  href: string;
}

/** The calendar is the same destination for everybody, so it is spelled once. */
const CALENDAR: NavItem = { label: "Calendar", href: "/calendar" };

/**
 * The primary nav, which depends on whether the reader has a timeline to be offered.
 *
 * `/` is the reader's own timeline once they are signed in **and** granted access
 * (NEU-1354, D-12), and the global feed otherwise — which is exactly what `/feed` renders.
 * So for anyone without a grant the two items were the *same destination under two names*,
 * and the second one is dropped.
 *
 * The predicate is `access`, not "is signed in": a signed-in account without a grant sees
 * the global feed on `/` just as an anonymous visitor does, so it gets the same single item.
 * That is the same three-way split `useFollowAccess` already drives for the follow buttons
 * and `TimelineOrFeed`, which is why this takes it rather than inventing its own.
 *
 * The labels for a reader who *does* have both say which feed is which. "Updates" and "All
 * updates" did not: nothing in the pair conveyed that the first was narrowed to the people
 * you follow and the second was everything we track.
 */
export function navItemsFor(access: FollowAccess): NavItem[] {
  if (access === "ready") {
    return [{ label: "Following", href: "/" }, { label: "Everything", href: "/feed" }, CALENDAR];
  }
  // `/feed` keeps working and stays in the sitemap; it is just not worth a nav entry when it
  // is a second door onto the page the reader is already looking at.
  return [{ label: "Updates", href: "/" }, CALENDAR];
}
