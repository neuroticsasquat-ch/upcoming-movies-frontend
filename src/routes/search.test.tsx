import { RouterContextProvider, createRoutesStub } from "react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw/server";
import { cloudflareContext } from "@/lib/load-context";
import { filmsSearchHandler } from "@/test/msw/films-search";
import SearchPage, { loader } from "@/routes/search";
import type { FilmIndexItem } from "@/api/types";

const BACKEND = "https://api.upmovies.localhost";

const sampleItem: FilmIndexItem = {
  slug: "the-matrix-1999",
  title: "The Matrix",
  release_year: 1999,
  poster_path: null,
  arc_stage: "released",
};

function contextWithEnv() {
  const context = new RouterContextProvider();
  context.set(cloudflareContext, { env: { API_BASE_URL: BACKEND } });
  return context;
}

function callLoader(url: string) {
  return loader({
    request: new Request(url),
    context: contextWithEnv(),
    params: {},
  } as unknown as Parameters<typeof loader>[0]);
}

describe("search route loader", () => {
  it("fetches results when q is present", async () => {
    server.use(filmsSearchHandler({ items: [sampleItem] }));
    const data = await callLoader("https://upmovies.example/search?q=matrix");
    expect(data.results).not.toBeNull();
    expect(data.results!.items).toHaveLength(1);
    expect(data.results!.items[0].slug).toBe("the-matrix-1999");
  });

  it("returns landing shape (results: null) for empty q", async () => {
    const data = await callLoader("https://upmovies.example/search?q=");
    expect(data.results).toBeNull();
    expect(data.q).toBe("");
  });

  it("returns landing shape (results: null) when q is missing", async () => {
    const data = await callLoader("https://upmovies.example/search");
    expect(data.results).toBeNull();
    expect(data.q).toBe("");
  });
});

describe("search route render", () => {
  it("renders film results as cards linking to /film/{slug}", async () => {
    const loaderData = {
      q: "matrix",
      results: { items: [sampleItem], total: 1, limit: 20, offset: 0 },
    };
    const Stub = createRoutesStub([
      { path: "/search", Component: SearchPage, loader: () => loaderData },
    ]);
    render(<Stub initialEntries={["/search"]} />);
    const link = await screen.findByRole("link", { name: /The Matrix/i });
    expect(link).toHaveAttribute("href", "/film/the-matrix-1999");
  });

  it("renders the no-results state when items is empty", async () => {
    const loaderData = {
      q: "xyz",
      results: { items: [], total: 0, limit: 20, offset: 0 },
    };
    const Stub = createRoutesStub([
      { path: "/search", Component: SearchPage, loader: () => loaderData },
    ]);
    render(<Stub initialEntries={["/search"]} />);
    expect(await screen.findByText(/No films match/i)).toBeInTheDocument();
  });

  it("renders the landing prompt when results is null", async () => {
    const loaderData = { q: "", results: null };
    const Stub = createRoutesStub([
      { path: "/search", Component: SearchPage, loader: () => loaderData },
    ]);
    render(<Stub initialEntries={["/search"]} />);
    expect(await screen.findByText(/Type a film title/i)).toBeInTheDocument();
  });
});
