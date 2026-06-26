import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { WORDMARK } from "@/components/layout/nav-items";
import { GlobalFooter } from "@/components/layout/GlobalFooter";

function renderFooter() {
  return render(
    <MemoryRouter>
      <GlobalFooter />
    </MemoryRouter>,
  );
}

describe("GlobalFooter", () => {
  it("renders the wordmark", () => {
    renderFooter();
    expect(screen.getByText(new RegExp(WORDMARK))).toBeInTheDocument();
  });

  it("renders a copyright line including the current year", () => {
    renderFooter();
    const year = new Date().getUTCFullYear().toString();
    const copyright = screen.getByText(/©\s*\d{4}/);
    expect(copyright).toBeInTheDocument();
    expect(copyright.textContent).toContain(year);
  });

  it("renders at least one static link", () => {
    renderFooter();
    expect(screen.getAllByRole("link").length).toBeGreaterThanOrEqual(1);
  });
});
