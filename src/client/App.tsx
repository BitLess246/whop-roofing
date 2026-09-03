import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { WhopElements } from "@whop/elements-react";
import { loadWhop } from "@whop/elements";
import type { PublicConfig } from "../shared/types";
import { ConfigProvider } from "./lib/config";
import { Router, useRouter } from "./lib/router";
import { Layout } from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomePage } from "./pages/Home";
import { ServicePage } from "./pages/Service";
import { BookPage } from "./pages/Book";
import { EstimatePage } from "./pages/Estimate";
import { CardOnFilePage } from "./pages/CardOnFile";
import { ThankYouPage } from "./pages/ThankYou";
import { BillingPage } from "./pages/Billing";
import { NotFoundPage } from "./pages/NotFound";

export function App({ config, url }: { config: PublicConfig; url: string }) {
  return (
    <ConfigProvider value={config}>
      <Router url={url}>
        <ElementsProvider>
          <Layout>
            <ErrorBoundary>
              <Routes />
            </ErrorBoundary>
          </Layout>
        </ElementsProvider>
      </Router>
    </ConfigProvider>
  );
}

/**
 * True when the hosted elements script could not load — a blocked CDN, an
 * offline visitor, an ad blocker. Payment surfaces read it so they can offer a
 * phone number instead of an indefinite loading skeleton.
 */
const ElementsFailedContext = createContext(false);
export const useElementsFailed = () => useContext(ElementsFailedContext);

/**
 * `loadWhop()` injects the hosted elements script, so it can only run in the
 * browser. Deferring it to an effect keeps the SSR pass identical to the first
 * client render — the provider simply holds `null` until the script resolves,
 * which the elements packages support by design.
 */
function ElementsProvider({ children }: { children: ReactNode }) {
  const [elements, setElements] =
    useState<Promise<Awaited<ReturnType<typeof loadWhop>> | null> | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // A blocked or failed CDN must not take the marketing site down: the
    // provider accepts `null`, and only the payment surfaces go quiet.
    setElements(
      loadWhop().catch((err) => {
        console.error("[elements] failed to load the Whop SDK", err);
        setFailed(true);
        return null;
      }),
    );
  }, []);

  const appearance = useMemo(
    () => ({ theme: { appearance: "light" as const, accentColor: "orange" as const } }),
    [],
  );

  return (
    <ElementsFailedContext.Provider value={failed}>
      <WhopElements elements={elements} appearance={appearance}>
        {children}
      </WhopElements>
    </ElementsFailedContext.Provider>
  );
}

function Routes() {
  const { path } = useRouter();

  if (path === "/") return <HomePage />;
  if (path === "/estimate") return <EstimatePage />;
  if (path === "/card-on-file") return <CardOnFilePage />;
  if (path === "/thank-you") return <ThankYouPage />;
  if (path === "/admin/billing") return <BillingPage />;

  const service = matchPrefix(path, "/services/");
  if (service) return <ServicePage slug={service} />;

  const booking = matchPrefix(path, "/book/");
  if (booking) return <BookPage offeringKey={booking} />;

  return <NotFoundPage />;
}

function matchPrefix(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix)) return null;
  const rest = path.slice(prefix.length).replace(/\/+$/, "");
  return rest.length > 0 && !rest.includes("/") ? rest : null;
}
