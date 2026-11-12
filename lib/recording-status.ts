/** How each pipeline status reads to a rep and to Chase. Safe for client and server. */
export const REP_STATUS: Record<string, string> = {
  uploaded: "Processing",
  transcribing: "Processing",
  analyzing: "Processing",
  needs_consent_review: "Checking consent",
  awaiting_review: "With Chase",
  released: "Coached",
  failed: "Didn't process",
};

export const STAFF_STATUS: Record<string, string> = {
  uploaded: "Uploaded",
  transcribing: "Transcribing",
  analyzing: "AI drafting",
  needs_consent_review: "No consent found",
  awaiting_review: "Ready for review",
  released: "Released",
  failed: "Failed",
};
