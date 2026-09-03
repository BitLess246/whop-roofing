import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * A render error in a payment surface must not take the marketing site with
 * it. Anything that throws below this boundary is replaced by a phone number,
 * which is what the visitor actually needs at that point.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[boundary] caught", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      this.props.fallback ?? (
        <div className="setup-notice" role="alert">
          <h3>Something on this page did not load</h3>
          <p>Refresh the page, or call us and we will take care of it by hand.</p>
        </div>
      )
    );
  }
}
