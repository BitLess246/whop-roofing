import { hydrateRoot } from "react-dom/client";
import { App } from "./App";
import type { PublicConfig } from "../shared/types";
import "./styles.css";

declare global {
  interface Window {
    __SITE_CONFIG__?: PublicConfig;
  }
}

const config = window.__SITE_CONFIG__;
const root = document.getElementById("root");

if (config && root) {
  const url = window.location.pathname + window.location.search;
  hydrateRoot(root, <App config={config} url={url} />);
  reportClientNavigations();
} else {
  console.error("[app] missing bootstrap config or #root");
}

/**
 * The Whop pixel reports a page view on load. After that this is a single-page
 * app, so history transitions are reported explicitly — otherwise every route
 * after the landing page would be invisible in the dashboard.
 */
function reportClientNavigations() {
  const report = () => {
    try {
      window.whop?.track?.("page_view");
    } catch {
      /* analytics must never break navigation */
    }
  };

  const originalPush = history.pushState.bind(history);
  history.pushState = (...args: Parameters<History["pushState"]>) => {
    originalPush(...args);
    report();
  };

  const originalReplace = history.replaceState.bind(history);
  history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    originalReplace(...args);
    report();
  };

  window.addEventListener("popstate", report);
}
