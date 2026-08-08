"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { MaintenanceDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import MaintenancePage from "./MaintenancePage";

type EmployeeSummary = { permissions: string[] };

// /login always renders normally, even while maintenance mode is on — an
// admin needs to be able to log in to turn it back off. The backend's
// MaintenanceModeFilter permits POST /auth/login unconditionally for the
// same reason.
const ALWAYS_ALLOWED_PATHS = new Set(["/login"]);

export default function MaintenanceGate({
  status,
  dict,
  children,
}: {
  status: MaintenanceDto;
  dict: Dictionary["siteMaintenancePage"];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [bypassChecked, setBypassChecked] = useState(!status.enabled);
  const [canBypass, setCanBypass] = useState(false);

  useEffect(() => {
    if (!status.enabled) return;
    const token = getToken();
    if (!token) {
      setBypassChecked(true);
      return;
    }
    apiFetch<EmployeeSummary>("/auth/me")
      .then((me) => setCanBypass(me.permissions.includes("sys.maintenance")))
      .catch((err) => {
        // A 401 here means the stored token is stale — apiClient.ts's own
        // interceptor already clears it and redirects; nothing else to do.
        // Any other error (e.g. the maintenance filter itself returning 503
        // for a non-bypass caller) just means no bypass, which is correct.
        if (!(err instanceof ApiError && err.status === 401)) {
          setCanBypass(false);
        }
      })
      .finally(() => setBypassChecked(true));
  }, [status.enabled]);

  if (!status.enabled || ALWAYS_ALLOWED_PATHS.has(pathname)) {
    return <>{children}</>;
  }
  if (!bypassChecked) {
    // Brief window while the bypass check is in flight — show the
    // maintenance page rather than a flash of protected content.
    return <MaintenancePage status={status} dict={dict} />;
  }
  return canBypass ? <>{children}</> : <MaintenancePage status={status} dict={dict} />;
}
