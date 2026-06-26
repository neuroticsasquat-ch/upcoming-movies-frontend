import { Link } from "react-router";
import { WORDMARK } from "@/components/layout/nav-items";

/**
 * Site-wide footer. Fully server-rendered — no auth, no providers needed.
 * Shows the wordmark, a copyright line, and a small set of static links.
 */
export function GlobalFooter() {
  const year = new Date().getUTCFullYear();

  return (
    <footer className="border-t border-border mt-auto py-8 text-sm text-muted-foreground">
      <div className="mx-auto max-w-4xl flex flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <span>
            © {year} {WORDMARK}
          </span>
        </div>

        <nav aria-label="Footer navigation">
          <ul className="flex flex-wrap gap-4">
            <li>
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/browse" className="hover:text-foreground transition-colors">
                Browse
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
