import { useQuery } from "@tanstack/react-query";
import { env } from "@/env";
import { getCollectionsSearch, getCompaniesSearch, getPeopleSearch } from "./public";
import type {
  CollectionSearchItem,
  CompanySearchItem,
  EntitySearchResponse,
  FollowEntityType,
  PersonSearchItem,
} from "./types";

/** What the add-follow box can search. `title` is deliberately absent: films are found through
 *  the header's film search, which already goes to the film page where the title follow button
 *  lives, and duplicating it here would give the same entity two front doors. */
export type SearchableEntityType = Extract<FollowEntityType, "person" | "company" | "franchise">;

/** One search result, flattened to the three fields the list renders, so the component does not
 *  branch on which endpoint produced it. `secondary` is the line under the name — a
 *  department, an origin country — and is null where the entity has none. */
export interface EntityResult {
  entityType: SearchableEntityType;
  entityId: string;
  label: string;
  imagePath: string | null;
  secondary: string | null;
}

/** Below this a query is "not typed yet": the backend answers an empty page rather than a 422,
 *  and asking it on the first keystroke would spend a request per letter to say so. */
export const MIN_QUERY_LEN = 2;

const RESULT_LIMIT = 10;

/** One search, already flattened: the endpoint and its shape-flattener bound together so the
 *  map below holds three values of one type. Keeping them apart in a `Record` instead makes
 *  the pairing unprovable to the compiler — nothing stops the person normaliser being handed a
 *  company — and only widening both to `never` typechecks, which is worse than useless. */
type EntitySearch = (
  baseUrl: string,
  q: string,
  signal: AbortSignal | undefined,
) => Promise<EntityResult[]>;

function bind<T>(
  fetcher: (
    baseUrl: string,
    q: string,
    opts?: { limit?: number; offset?: number; signal?: AbortSignal },
  ) => Promise<EntitySearchResponse<T>>,
  normalise: (item: T) => EntityResult,
): EntitySearch {
  return async (baseUrl, q, signal) => {
    const res = await fetcher(baseUrl, q, { limit: RESULT_LIMIT, signal });
    return res.items.map(normalise);
  };
}

const SEARCHES: Record<SearchableEntityType, EntitySearch> = {
  person: bind(getPeopleSearch, (item: PersonSearchItem) => ({
    entityType: "person",
    entityId: String(item.id),
    label: item.name,
    imagePath: item.profile_path,
    secondary: item.known_for_department,
  })),
  company: bind(getCompaniesSearch, (item: CompanySearchItem) => ({
    entityType: "company",
    entityId: String(item.id),
    label: item.name,
    imagePath: item.logo_path,
    secondary: item.origin_country,
  })),
  franchise: bind(getCollectionsSearch, (item: CollectionSearchItem) => ({
    entityType: "franchise",
    entityId: String(item.id),
    label: item.name,
    imagePath: item.poster_path,
    secondary: null,
  })),
};

export const entitySearchKey = (entityType: SearchableEntityType, q: string) =>
  ["entity-search", entityType, q] as const;

/**
 * Search one kind of follow target. Public, so it works for an unentitled account too — the
 * follows page is gated above this, but the endpoint is not, and keeping the hook ungated
 * means the film page could use it later without a second copy.
 *
 * Results are cached per (type, query), which is what makes flipping the type selector back
 * and forth free, and the 5-minute `staleTime` what keeps re-typing a query the user just ran
 * from spending a request. Caller debounces; this fires on whatever `q` it is handed.
 */
export function useEntitySearch(entityType: SearchableEntityType, q: string) {
  const search = SEARCHES[entityType];
  return useQuery({
    queryKey: entitySearchKey(entityType, q),
    queryFn: ({ signal }) => search(env.apiBaseUrl, q, signal),
    enabled: q.length >= MIN_QUERY_LEN,
    staleTime: 5 * 60 * 1000,
  });
}
