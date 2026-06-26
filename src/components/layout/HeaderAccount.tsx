import { Link } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/components/AuthContext";

// Module-level QueryClient for production hydration stability (mirrors spa-layout.tsx).
// Tests must NOT use this instance — use a fresh per-test QueryClient instead.
const moduleClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Inner account area component. Consumes `useAuth()` from an externally-supplied
 * `AuthProvider` + `QueryClientProvider`. Exported separately so tests can render
 * it with per-test providers without touching the module-level `moduleClient`.
 *
 * Renders the logged-out default (`!user`) synchronously — no loading skeleton —
 * so the first client paint matches the SSR default (no hydration mismatch).
 */
export function AccountArea() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <Link to="/login" className="text-sm underline-offset-4 hover:underline">
          Log in
        </Link>
        <Link to="/signup" className="text-sm underline-offset-4 hover:underline">
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm">{user.display_name}</span>
      {user.is_admin && (
        <Link to="/admin/ingest" className="text-sm underline-offset-4 hover:underline">
          Admin
        </Link>
      )}
      <button onClick={() => logout()} className="text-sm underline-offset-4 hover:underline">
        Log out
      </button>
    </div>
  );
}

/**
 * Self-contained account island. Wraps `QueryClientProvider` + `AuthProvider`
 * around `AccountArea` using the module-level `QueryClient`.
 *
 * Use this as the default export when embedding the island in a page that has
 * no existing React Query or Auth context (e.g. the public site header).
 */
export default function HeaderAccount() {
  return (
    <QueryClientProvider client={moduleClient}>
      <AuthProvider>
        <AccountArea />
      </AuthProvider>
    </QueryClientProvider>
  );
}
