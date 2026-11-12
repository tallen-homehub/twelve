// Small stroke icons so we don't pull an icon library for five glyphs.
const base = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconToday = () => (
  <svg {...base} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconTrack = () => (
  <svg {...base} aria-hidden="true"><path d="M4 19V5M4 5h11l-2 3 2 3H4" /></svg>
);
export const IconPractice = () => (
  <svg {...base} aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
);
export const IconRecordings = () => (
  <svg {...base} aria-hidden="true"><path d="M3 12h2l2-6 4 12 3-9 2 3h5" /></svg>
);
export const IconMe = () => (
  <svg {...base} aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const IconQueue = () => (
  <svg {...base} aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
);
export const IconReps = () => (
  <svg {...base} aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></svg>
);
export const IconThemes = () => (
  <svg {...base} aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const IconContent = () => (
  <svg {...base} aria-hidden="true"><path d="M4 4h12l4 4v12H4z" /><path d="M8 12h8M8 16h5" /></svg>
);
export const IconInbox = () => (
  <svg {...base} aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" /></svg>
);
