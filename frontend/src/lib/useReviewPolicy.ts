"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "./apiClient";
import type { ReviewPolicyDto } from "./types";

// The three request screens each offer a counter-signing tab, which only
// means anything when that system is set to two-level review. Switching the
// level off left the tab in place pointing at a queue that can never fill.
//
// Null while it loads: callers render the tab only once the answer is known,
// so it never flashes in and out.
export function useReviewPolicy(): ReviewPolicyDto | null {
  const [policy, setPolicy] = useState<ReviewPolicyDto | null>(null);
  useEffect(() => {
    apiFetch<ReviewPolicyDto>("/review-policy").then(setPolicy).catch(() => {});
  }, []);
  return policy;
}
