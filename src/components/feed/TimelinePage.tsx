import { useState } from "react";
import { Link } from "react-router";
import { fetchTimeline, useTimeline } from "@/api/me";
import type { FeedDayItem, FeedDayResponse } from "@/api/types";
import { Button } from "@/components/ui/button";
import { groupByDay } from "@/lib/feed-groups";
import { DAYS_PER_PAGE } from "@/lib/global-feed";
import { FeedDayGroups, ViewMoreButton } from "@/components/feed/FeedDayGroups";

/**
 * The signed-in home page: the grouped feed restricted to the films the reader's follows reach
 * (`GET /me/timeline`, NEU-1351). Mounted by `TimelineOrFeed` only once the account has resolved
 * *and* proved entitled, so it never renders during SSR and never has to handle the 403.
 *
 * Days render through the same `FeedDayGroups` the global feed uses — the endpoint answers with
 * `/feed/grouped`'s exact shape, so there is nothing here to translate.
 */
export function TimelinePage() {
  const first = useTimeline({ limit: DAYS_PER_PAGE, offset: 0 });
  // Pages 2+ are fetched imperatively and appended, the same way the global feed pages: it keeps
  // one cache entry per reader rather than one per scroll depth, and "View more" stays a plain
  // button rather than a second source of truth about what is on screen.
  //
  // They are stamped with the first page they were appended to, and read back only while that is
  // still the first page. A refreshed page one — after a follow lands, or on the next mount —
  // therefore drops them without an effect to reset anything: keeping them would splice days from
  // an older follow graph underneath days from the current one.
  const [more, setMore] = useState<{ from?: FeedDayResponse; items: FeedDayItem[] }>({ items: [] });
  const [loading, setLoading] = useState(false);

  if (first.isPending) return <TimelineSkeleton />;

  const total = first.data?.total ?? 0;
  const appended = more.from === first.data ? more.items : [];
  const items = [...(first.data?.items ?? []), ...appended];
  const groups = groupByDay(items);
  const hasMore = groups.length < total;

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    try {
      const next = await fetchTimeline({ limit: DAYS_PER_PAGE, offset: groups.length });
      setMore({ from: first.data, items: [...appended, ...next.items] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <TimelineHeading />
      {total === 0 ? (
        <EmptyTimeline />
      ) : (
        <>
          <FeedDayGroups items={items} />
          <ViewMoreButton hasMore={hasMore} loading={loading} onClick={loadMore} />
        </>
      )}
    </main>
  );
}

/** The heading row: the page's own title, and the way back to everything it filtered out. */
function TimelineHeading() {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h1 className="text-2xl font-semibold">Your timeline</h1>
      <Link
        to="/feed"
        className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        All updates →
      </Link>
    </div>
  );
}

/** Shown while the first page is in flight. Occupies the content area only — the header, search
 *  bar and footer are outside this component and never move, so the swap from the server-rendered
 *  feed to the timeline does not reflow the page around it. */
function TimelineSkeleton() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <TimelineHeading />
      <div aria-busy="true" aria-label="Loading your timeline" className="mt-6 space-y-8">
        {[0, 1, 2].map((n) => (
          <div key={n} className="animate-pulse space-y-2">
            <div className="h-4 w-48 rounded bg-muted" />
            <div className="ml-3 space-y-2 border-l-2 border-border pl-3">
              <div className="h-16 rounded bg-muted" />
              <div className="h-16 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

/** An entitled account whose follow graph is still empty. Distinct from the locked panel an
 *  unentitled one gets (D-41): this reader *may* follow things and simply has not yet, so every
 *  word here is an instruction rather than an explanation. Never an empty page. */
function EmptyTimeline() {
  return (
    <div className="mt-6 rounded-lg border border-border p-6">
      <p className="text-sm text-foreground">
        Your timeline is empty. Follow people, studios and films to fill it.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Search for a film above, or start from what is coming out.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {/* NEU-1358's `/welcome` is the destination this button is meant to have; until that
            route exists it points at the calendar, which is the browse surface that actually
            ships today. Sending them to a 404 would be worse than sending them one hop wide. */}
        <Button asChild size="sm">
          <Link to="/calendar">Find films to follow</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/feed">Browse all updates</Link>
        </Button>
      </div>
    </div>
  );
}
