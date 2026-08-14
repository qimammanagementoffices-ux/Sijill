"use client";

import { createContext, useContext } from "react";

export type SessionEmployee = {
  id: string;
  name: string;
  permissions: string[];
};

// AppShell already fetches /auth/me for the sidebar before it renders any
// page, so every page below it was asking the API for something the shell
// was holding. Each of those duplicate calls counted against the rate limit
// and raced the shell's own request on a cold start.
const SessionContext = createContext<SessionEmployee | null>(null);

export const SessionProvider = SessionContext.Provider;

/**
 * The signed-in employee. Non-null inside AppShell, which does not render
 * its children until /auth/me has resolved.
 */
export function useSession(): SessionEmployee {
  const session = useContext(SessionContext);
  if (!session) {
    // Only reachable if a component is mounted outside AppShell -- a wiring
    // mistake, not a runtime condition, so fail loudly rather than silently
    // handing back an employee with no permissions.
    throw new Error("useSession must be used inside AppShell");
  }
  return session;
}

/** Permissions only, for the many call sites that need nothing else. */
export function usePermissions(): string[] {
  return useSession().permissions;
}
