import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/AuthContext";
import { lookupFollowLabel, resetFollowLabelCache } from "@/lib/follow-labels";
import { server } from "@/test/msw/server";
import { meHandler } from "@/test/msw/me";
import { entitySearchHandlers, followGraphHandlers } from "@/test/msw/follows";
import { FollowEntitySearch } from "./FollowEntitySearch";

const PEOPLE = [{ id: 525, name: "Christopher Nolan" }];
const COMPANIES = [{ id: 41, name: "A24" }];
const COLLECTIONS = [{ id: 10, name: "Star Wars Collection" }];

function renderSearch() {
  const graph = followGraphHandlers();
  server.use(
    meHandler({ entitled: true }),
    ...graph.handlers,
    ...entitySearchHandlers({ people: PEOPLE, companies: COMPANIES, collections: COLLECTIONS }),
  );
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Stub = createRoutesStub([{ path: "/me/follows", Component: FollowEntitySearch }]);
  render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <Stub initialEntries={["/me/follows"]} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return graph;
}

beforeEach(() => {
  localStorage.clear();
  resetFollowLabelCache();
});

describe("FollowEntitySearch", () => {
  it("asks for a query before searching anything", async () => {
    renderSearch();
    expect(await screen.findByText(/at least 2 characters/i)).toBeInTheDocument();
  });

  it("does not search on a single character", async () => {
    renderSearch();
    await userEvent.type(screen.getByRole("searchbox"), "n");
    // The hint stays put: below the minimum there is no request and nothing to show.
    expect(await screen.findByText(/at least 2 characters/i)).toBeInTheDocument();
  });

  it("searches people by default and lists what comes back", async () => {
    renderSearch();
    await userEvent.type(screen.getByRole("searchbox"), "nolan");

    expect(await screen.findByText("Christopher Nolan")).toBeInTheDocument();
    expect(screen.getByText("Directing")).toBeInTheDocument();
  });

  it("switches endpoint with the tab", async () => {
    renderSearch();
    await userEvent.type(screen.getByRole("searchbox"), "a24");
    await screen.findByText("Christopher Nolan");

    await userEvent.click(screen.getByRole("tab", { name: "Companies" }));

    expect(await screen.findByText("A24")).toBeInTheDocument();
    expect(screen.queryByText("Christopher Nolan")).not.toBeInTheDocument();
  });

  it("searches collections under their own tab", async () => {
    renderSearch();
    await userEvent.click(screen.getByRole("tab", { name: "Collections" }));
    await userEvent.type(screen.getByRole("searchbox"), "star");

    expect(await screen.findByText("Star Wars Collection")).toBeInTheDocument();
  });

  it("follows a result and remembers its name for the list below", async () => {
    const graph = renderSearch();
    await userEvent.type(screen.getByRole("searchbox"), "nolan");

    await userEvent.click(await screen.findByRole("button", { name: /follow christopher nolan/i }));

    await waitFor(() =>
      expect(graph.follows).toEqual([
        expect.objectContaining({ entity_type: "person", entity_id: "525" }),
      ]),
    );
    // The point of the whole exercise: `GET /me/follows` will answer with "525" and nothing
    // else, so the name has to have been kept here on the way past.
    expect(lookupFollowLabel("person", "525")?.label).toBe("Christopher Nolan");
  });

  it("a result already followed arrives saying so", async () => {
    const graph = followGraphHandlers({
      follows: [
        { entity_type: "person", entity_id: "525", source: "manual", created_at: "2026-09-01" },
      ],
    });
    server.use(
      meHandler({ entitled: true }),
      ...graph.handlers,
      ...entitySearchHandlers({ people: PEOPLE }),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Stub = createRoutesStub([{ path: "/me/follows", Component: FollowEntitySearch }]);
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <Stub initialEntries={["/me/follows"]} />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByRole("searchbox"), "nolan");
    expect(
      await screen.findByRole("button", { name: /unfollow christopher nolan/i }),
    ).toHaveTextContent("Following");
  });

  it("says nothing matched rather than showing an empty list", async () => {
    const graph = followGraphHandlers();
    server.use(meHandler({ entitled: true }), ...graph.handlers, ...entitySearchHandlers());
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Stub = createRoutesStub([{ path: "/me/follows", Component: FollowEntitySearch }]);
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <Stub initialEntries={["/me/follows"]} />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByRole("searchbox"), "zzzz");
    expect(await screen.findByText(/no people match/i)).toBeInTheDocument();
  });
});
