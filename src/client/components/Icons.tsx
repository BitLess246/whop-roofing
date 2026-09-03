/** Inline SVG icons. No icon dependency, no network request, themeable by `currentColor`. */

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export type IconName = "clipboard" | "wrench" | "home" | "droplet" | "shield";

export function Icon({ name, className }: { name: IconName; className?: string }) {
  switch (name) {
    case "clipboard":
      return (
        <svg {...base} className={className} aria-hidden="true">
          <path d="M9 4h6v3H9z" />
          <path d="M15 5.5h2.5A1.5 1.5 0 0 1 19 7v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V7a1.5 1.5 0 0 1 1.5-1.5H9" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...base} className={className} aria-hidden="true">
          <path d="M15.4 4.6a4.5 4.5 0 0 0-5.9 5.6L4 15.7 8.3 20l5.5-5.5a4.5 4.5 0 0 0 5.6-5.9l-2.7 2.7-2.3-.6-.6-2.3z" />
        </svg>
      );
    case "home":
      return (
        <svg {...base} className={className} aria-hidden="true">
          <path d="M3.5 11 12 4l8.5 7" />
          <path d="M5.5 9.6V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.6" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "droplet":
      return (
        <svg {...base} className={className} aria-hidden="true">
          <path d="M12 3.5s5.5 5.6 5.5 9.4A5.5 5.5 0 0 1 12 18.4a5.5 5.5 0 0 1-5.5-5.5C6.5 9.1 12 3.5 12 3.5z" />
        </svg>
      );
    case "shield":
      return (
        <svg {...base} className={className} aria-hidden="true">
          <path d="M12 3.5 19 6v6c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
  }
}

export function StarRow({ rating }: { rating: number }) {
  return (
    <span className="stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"
             fill={i < rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
          <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z" />
        </svg>
      ))}
    </span>
  );
}

export function Check({ className }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
         className={className} aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export function Phone() {
  return (
    <svg {...base} width={18} height={18} aria-hidden="true">
      <path d="M6.5 4h3l1.4 3.5-2 1.4a11 11 0 0 0 5.2 5.2l1.4-2L19 13.5v3a1.5 1.5 0 0 1-1.7 1.5A14 14 0 0 1 5 5.7 1.5 1.5 0 0 1 6.5 4z" />
    </svg>
  );
}

/** Decorative roofline used behind the hero. Purely CSS-driven elsewhere. */
export function Roofline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 220" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 220 L0 140 L180 60 L360 140 L360 96 L560 20 L760 96 L760 150 L940 70 L1200 170 L1200 220 Z"
            fill="currentColor" opacity="0.14" />
      <path d="M0 220 L0 176 L200 120 L420 178 L640 118 L880 176 L1200 128 L1200 220 Z"
            fill="currentColor" opacity="0.22" />
    </svg>
  );
}
