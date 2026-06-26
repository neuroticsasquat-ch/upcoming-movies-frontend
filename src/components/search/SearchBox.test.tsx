import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, createRoutesStub } from "react-router";
import { server } from "@/test/msw/server";
import { filmsSearchHandler } from "@/test/msw/films-search";
import { SearchBox } from "@/components/search/SearchBox";
import type { FilmIndexItem } from "@/api/types";

const BACKEND = "https://api.upmovies.localhost";

const sampleItem: FilmIndexItem = {
  slug: "the-odyssey-2026",
  title: "The Odyssey",
  release_year: 2026,
  poster_path: "/odyssey.jpg",
  arc_stage: "trailer",
};

function renderSearchBox() {
  return render(
    <MemoryRouter>
      <SearchBox />
    </MemoryRouter>,
  );
}

describe("SearchBox", () => {
  it("renders a role=search landmark", () => {
    renderSearchBox();
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("form has action=/search and method=get", () => {
    const { container } = renderSearchBox();
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    expect(form).toHaveAttribute("action", "/search");
    expect(form).toHaveAttribute("method", "get");
  });

  it("input has name=q", () => {
    renderSearchBox();
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("name", "q");
  });

  it("input is accessibly labeled", () => {
    renderSearchBox();
    expect(screen.getByRole("combobox", { name: /search/i })).toBeInTheDocument();
  });

  it("renders a submit button", () => {
    renderSearchBox();
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });
});

describe("SearchBox dropdown", () => {
  it("opens on typing two or more characters", async () => {
    server.use(filmsSearchHandler({ items: [sampleItem] }));
    renderSearchBox();
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "od");
    await screen.findByRole("listbox");
  });

  it("renders role=option rows with film titles and a See all results row", async () => {
    server.use(filmsSearchHandler({ items: [sampleItem] }));
    renderSearchBox();
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "od");
    await screen.findByRole("listbox");
    expect(screen.getByRole("option", { name: /The Odyssey/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /see all results/i })).toHaveAttribute(
      "href",
      "/search?q=od",
    );
  });

  it("debounce fires at most one request when typing rapidly", async () => {
    let requestCount = 0;
    server.use(
      http.get(`${BACKEND}/films/search`, () => {
        requestCount++;
        return HttpResponse.json({
          items: [sampleItem],
          total: 1,
          limit: 8,
          offset: 0,
        });
      }),
    );
    renderSearchBox();
    const user = userEvent.setup({ delay: null });
    const input = screen.getByRole("combobox");
    await user.type(input, "abc");
    await screen.findByRole("listbox");
    expect(requestCount).toBeLessThanOrEqual(1);
  });

  it("ArrowDown sets aria-activedescendant to the first option id", async () => {
    server.use(filmsSearchHandler({ items: [sampleItem] }));
    renderSearchBox();
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "od");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", "search-opt-0");
  });

  it("Escape closes the dropdown", async () => {
    server.use(filmsSearchHandler({ items: [sampleItem] }));
    renderSearchBox();
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "od");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("pressing Enter on the active option navigates to the film page", async () => {
    server.use(filmsSearchHandler({ items: [sampleItem] }));
    const Stub = createRoutesStub([
      { path: "/", Component: () => <SearchBox /> },
      { path: "/film/:slug", Component: () => <div>film-page</div> },
    ]);
    render(<Stub initialEntries={["/"]} />);
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "od");
    await screen.findByRole("listbox");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");
    expect(await screen.findByText("film-page")).toBeInTheDocument();
  });

  it("shows the no-results message when the backend returns an empty list", async () => {
    server.use(filmsSearchHandler({ items: [] }));
    renderSearchBox();
    const user = userEvent.setup();
    const input = screen.getByRole("combobox");
    await user.type(input, "xyzzy");
    await screen.findByRole("listbox");
    expect(screen.getByText(/no films match/i)).toBeInTheDocument();
  });

  it("closes the dropdown gracefully on a 500 error but keeps the form", async () => {
    server.use(filmsSearchHandler({ status: 500 }));
    renderSearchBox();
    const user = userEvent.setup({ delay: null });
    const input = screen.getByRole("combobox");
    await user.type(input, "err");
    // Wait for debounce (300ms) + request + processing slack, wrapped in act
    // so React can flush state updates that happen during the timeout
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 600));
    });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("search")).toBeInTheDocument();
  });
});
