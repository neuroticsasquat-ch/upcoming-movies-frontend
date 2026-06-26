import { Link } from "react-router";
import type { FilmIndexItem } from "@/api/types";
import { posterUrl } from "@/lib/poster";

interface SearchResultItemProps {
  item: FilmIndexItem;
  isActive: boolean;
  id: string;
}

export function SearchResultItem({ item, isActive, id }: SearchResultItemProps) {
  return (
    <li id={id} role="option" aria-selected={isActive} className={isActive ? "bg-gray-100" : ""}>
      <Link to={`/film/${item.slug}`} tabIndex={-1}>
        {item.poster_path && (
          <img src={posterUrl(item.poster_path, "w92") ?? ""} alt="" aria-hidden />
        )}
        <span>{item.title}</span>
        {item.release_year && <span>{item.release_year}</span>}
      </Link>
    </li>
  );
}
