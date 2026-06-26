/* eslint-disable react-refresh/only-export-components -- route files intentionally export loader + meta + ErrorBoundary alongside the component */
import { Link } from "react-router";
import type { Route } from "./+types/browse";
import { getFilms, PAGE_SIZE } from "@/api/public";
import { cloudflareContext } from "@/lib/load-context";
import { buildMeta } from "@/lib/seo";
import { env } from "@/env";
import { FilmPosterCard } from "@/components/browse/FilmPosterCard";
import { Pagination } from "@/components/browse/Pagination";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { env: workerEnv } = context.get(cloudflareContext);
  const rawPage = new URL(request.url).searchParams.get("page");
  const parsed = parseInt(rawPage ?? "", 10);
  const page = isNaN(parsed) || parsed < 1 ? 1 : parsed;
  const limit = PAGE_SIZE;
  const offset = (page - 1) * limit;
  const films = await getFilms(workerEnv.API_BASE_URL, { limit, offset });
  const totalPages = Math.max(1, Math.ceil(films.total / limit));
  return { films, page, totalPages };
}

export function meta({ loaderData, location }: Route.MetaArgs): Route.MetaDescriptors {
  const base = buildMeta({
    title: "Browse",
    description: "Browse every upcoming film we track…",
    pathname: location.pathname,
    type: "website",
  });

  if (!loaderData) return base;

  const { page, totalPages, films } = loaderData;
  const canonical = new URL(location.pathname, env.publicSiteUrl).toString();

  if (page > 1) {
    base.push({ tagName: "link", rel: "prev", href: `${canonical}?page=${page - 1}` });
  }
  if (page < totalPages) {
    base.push({ tagName: "link", rel: "next", href: `${canonical}?page=${page + 1}` });
  }
  if (page > totalPages && films.total > 0) {
    base.push({ name: "robots", content: "noindex" });
  }

  return base;
}

export default function BrowsePage({ loaderData }: Route.ComponentProps) {
  const { films, page, totalPages } = loaderData;

  if (films.items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Browse Films</h1>
        <p className="mt-6 text-sm text-gray-500">No films tracked yet — check back soon.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Browse Films</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {films.items.map((f) => (
          <FilmPosterCard key={f.slug} item={f} />
        ))}
      </div>
      <div className="mt-6">
        <Pagination page={page} totalPages={totalPages} />
      </div>
    </main>
  );
}

export function ErrorBoundary() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-500">
        We couldn&apos;t load the film index. Please try again in a moment.
      </p>
      <Link to="/" className="mt-6 inline-block text-sm text-blue-600 underline">
        Go home
      </Link>
    </main>
  );
}
