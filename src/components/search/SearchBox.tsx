import { useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router";
import { Input } from "@/components/ui/input";
import { env } from "@/env";
import { useDebouncedSearch } from "./useDebouncedSearch";
import { SearchResultItem } from "./SearchResultItem";

// SSR-safe hydration flag: returns false during server render, true on the client,
// without triggering the react-hooks/set-state-in-effect lint rule.
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function SearchBox() {
  const mounted = useMounted();
  const [inputValue, setInputValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  const { results, status } = useDebouncedSearch(inputValue, env.apiBaseUrl);

  // Options list for keyboard nav: film results + "see-all" sentinel when results exist
  const options = [...(results ?? []), ...(results && results.length > 0 ? ["see-all"] : [])];

  const showDropdown =
    mounted && (results !== null || status === "loading") && !dismissed && status !== "error";

  const activeDescendant = mounted && activeIndex >= 0 ? `search-opt-${activeIndex}` : undefined;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    // Reset dropdown state whenever the user changes the query
    setDismissed(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Escape":
        setDismissed(true);
        setActiveIndex(-1);
        break;
      case "Enter":
        if (activeIndex >= 0 && results && activeIndex < results.length) {
          e.preventDefault();
          void navigate(`/film/${results[activeIndex].slug}`);
        }
        break;
    }
  }

  return (
    <div role="search" aria-label="Film search">
      <form action="/search" method="get">
        <label htmlFor="search-q" className="sr-only">
          Search films
        </label>
        <Input
          id="search-q"
          type="search"
          name="q"
          placeholder="Search films…"
          value={inputValue}
          onChange={handleInputChange}
          role={mounted ? "combobox" : undefined}
          aria-expanded={mounted ? showDropdown : undefined}
          aria-controls={mounted ? "search-listbox" : undefined}
          aria-activedescendant={activeDescendant}
          onKeyDown={mounted ? handleKeyDown : undefined}
        />
        <button type="submit">Search</button>
      </form>
      {showDropdown && (
        <ul id="search-listbox" role="listbox" aria-label="Search results">
          {results?.map((item, i) => (
            <SearchResultItem
              key={item.slug}
              item={item}
              id={`search-opt-${i}`}
              isActive={activeIndex === i}
            />
          ))}
          {results?.length === 0 && (
            <li role="option" aria-selected={false}>
              <span aria-live="polite">No films match &quot;{inputValue}&quot;</span>
            </li>
          )}
          {results && results.length > 0 && (
            <li
              role="option"
              aria-selected={activeIndex === results.length}
              id={`search-opt-${results.length}`}
            >
              <Link to={`/search?q=${encodeURIComponent(inputValue)}`}>
                See all results for &quot;{inputValue}&quot;
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
