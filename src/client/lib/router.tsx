/**
 * A ~70-line history router. The site has six routes and no data loading, so a
 * routing dependency would cost more than it saves — and the Whop pixel already
 * reports page views on `pushState`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface RouterValue {
  path: string;
  search: URLSearchParams;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

export function Router({ url, children }: { url: string; children: ReactNode }) {
  const initial = useMemo(() => splitUrl(url), [url]);
  const [path, setPath] = useState(initial.path);
  const [searchString, setSearchString] = useState(initial.search);

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname);
      setSearchString(window.location.search);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (typeof window === "undefined") return;
    if (/^https?:\/\//.test(to) || to.startsWith("tel:") || to.startsWith("mailto:")) {
      window.location.href = to;
      return;
    }
    const next = splitUrl(to);
    if (opts?.replace) window.history.replaceState({}, "", to);
    else window.history.pushState({}, "", to);
    setPath(next.path);
    setSearchString(next.search);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const value = useMemo<RouterValue>(
    () => ({ path, search: new URLSearchParams(searchString), navigate }),
    [path, searchString, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRouter must be used inside <Router>");
  return ctx;
}

/** An anchor that stays a real anchor — crawlable, middle-clickable, previewable. */
export function Link({
  to,
  children,
  className,
  onClick,
  ...rest
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const { navigate } = useRouter();
  const external = /^https?:\/\//.test(to) || to.startsWith("tel:") || to.startsWith("mailto:");
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (external || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

function splitUrl(url: string): { path: string; search: string } {
  const q = url.indexOf("?");
  if (q === -1) return { path: url || "/", search: "" };
  return { path: url.slice(0, q) || "/", search: url.slice(q) };
}

/** Anchor-scroll helper for the one-page nav links. */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
