/**
 * Whop pixel wrapper.
 *
 * Every site served from whop.app ships the Whop pixel already installed, and
 * `window.whop` exists before app code runs — page views, checkout views, and
 * purchases are tracked with no code. These are the funnel steps Whop cannot
 * see on its own.
 *
 * https://docs.whop.com/developer/websites/tracking
 */

export type WhopTrackProps = {
  value?: number;
  currency?: string;
  /** Whop counts each name + event_id pair once. Pass one for anything retryable. */
  event_id?: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    whop?: { track?: (name: string, props?: WhopTrackProps) => void };
    /** Set by the server so `whop.track` calls are visible during a demo. */
    __WHOP_TRACK_LOG__?: { name: string; props?: WhopTrackProps; at: string }[];
  }
}

/** The custom events this template fires. Named here so they cannot drift. */
export const EVENTS = {
  /** Estimate form submitted and a Whop lead was created. */
  ESTIMATE_REQUESTED: "estimate_requested",
  /** A service detail page was opened. */
  SERVICE_VIEWED: "service_viewed",
  /** A buyer reached the deposit checkout with Payment Elements mounted. */
  DEPOSIT_STARTED: "deposit_started",
  /** Any non-deposit checkout was opened. */
  CHECKOUT_VIEWED: "checkout_viewed",
  /** The card-on-file setup checkout was opened. */
  CARD_ON_FILE_STARTED: "card_on_file_started",
} as const;

export function track(name: string, props?: WhopTrackProps): void {
  if (typeof window === "undefined") return;

  // Keep a local trail so events are demonstrable from the console during a
  // walkthrough, independent of the dashboard's ingest delay.
  (window.__WHOP_TRACK_LOG__ ||= []).push({
    name,
    props,
    at: new Date().toISOString(),
  });

  try {
    window.whop?.track?.(name, props);
  } catch (err) {
    // Never let analytics break a checkout.
    console.warn("[track] failed", name, err);
  }

  if (import.meta.env.DEV) console.info("[whop.track]", name, props ?? {});
}

/** Fire an event at most once per mount, keyed by a stable string. */
const fired = new Set<string>();
export function trackOnce(key: string, name: string, props?: WhopTrackProps): void {
  if (fired.has(key)) return;
  fired.add(key);
  track(name, props);
}
