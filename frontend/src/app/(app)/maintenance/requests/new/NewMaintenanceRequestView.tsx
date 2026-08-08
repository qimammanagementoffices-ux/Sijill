"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { FaultTypeDto, MaintenanceRequestDetail, MaintenancePriority } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";

const PRIORITIES: MaintenancePriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function NewMaintenanceRequestView({
  dict,
  errorsDict,
}: {
  dict: Dictionary["maintenanceRequests"];
  errorsDict: Dictionary["errors"];
}) {
  const router = useRouter();
  const [faultTypes, setFaultTypes] = useState<FaultTypeDto[] | null>(null);
  const [faultTypeId, setFaultTypeId] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState<MaintenancePriority>("MEDIUM");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function priorityLabel(p: MaintenancePriority) {
    return {
      LOW: dict.priorityLow,
      MEDIUM: dict.priorityMedium,
      HIGH: dict.priorityHigh,
      URGENT: dict.priorityUrgent,
    }[p];
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<FaultTypeDto[]>("/maintenance/fault-types")
      .then(setFaultTypes)
      .catch(() => router.replace("/maintenance/requests"));
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiFetch<MaintenanceRequestDetail>("/maintenance/requests", {
        method: "POST",
        body: JSON.stringify({
          faultTypeId: faultTypeId || null,
          location: location || null,
          priority,
          description: description || null,
        }),
      });
      router.push(`/maintenance/requests/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
      setSubmitting(false);
    }
  }

  if (!faultTypes) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.addNew}</h1>
      <form onSubmit={handleSubmit}>
        <div className="panel">
          <div className="panel-body">
            <div className="form-grid">
              <div className="field">
                <label>{dict.faultTypeLabel}</label>
                <select value={faultTypeId} onChange={(e) => setFaultTypeId(e.target.value)}>
                  <option value="">—</option>
                  {faultTypes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nameAr} / {f.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>{dict.locationLabel}</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="field">
                <label>{dict.priorityLabel}</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as MaintenancePriority)}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {priorityLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field span2">
                <label>{dict.descriptionLabel}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting && <span className="spinner" />}
          {dict.submit}
        </button>
      </form>
    </>
  );
}
