"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchBlob, ApiError } from "@/lib/apiClient";
import { getToken, clearToken } from "@/lib/auth";
import type { BackupSnapshotDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

// Read once by LoginForm on mount to show a one-time "please log in again"
// message — a restore can replace the employee table under the current
// session, so we always force a fresh login after a successful restore
// rather than trusting the now-stale JWT.
const RESTORE_FLASH_KEY = "sijill.restoredFlash";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function BackupAdmin({ dict }: { dict: Dictionary["backups"] }) {
  const router = useRouter();
  const [backups, setBackups] = useState<BackupSnapshotDto[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupSnapshotDto | null>(null);
  const [pin, setPin] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  function load() {
    apiFetch<BackupSnapshotDto[]>("/backups")
      .then(setBackups)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
        }
      });
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function handleRunNow() {
    setError(null);
    setRunning(true);
    try {
      await apiFetch("/backups", { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  async function handleDownload(backup: BackupSnapshotDto) {
    const blob = await apiFetchBlob(`/backups/${backup.id}/download`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backup.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function triggeredByLabel(t: string) {
    if (t === "MANUAL") return dict.triggeredManual;
    if (t === "PRE_RESTORE") return dict.triggeredPreRestore;
    return dict.triggeredScheduled;
  }

  function openRestoreModal(backup: BackupSnapshotDto) {
    setRestoreTarget(backup);
    setPin("");
    setRestoreError(null);
  }

  function closeRestoreModal() {
    setRestoreTarget(null);
    setPin("");
    setRestoreError(null);
  }

  async function handleRestoreSubmit(e: FormEvent) {
    e.preventDefault();
    if (!restoreTarget) return;
    setRestoreError(null);
    setRestoring(true);
    try {
      await apiFetch(`/backups/${restoreTarget.id}/restore`, {
        method: "POST",
        body: JSON.stringify({ pin }),
      });
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(RESTORE_FLASH_KEY, dict.restoreSuccess);
      }
      clearToken();
      router.replace("/login");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setRestoreError(dict.restoreRateLimited);
      } else if (err instanceof ApiError && err.status === 409) {
        setRestoreError(dict.restoreInvalidPin);
      } else {
        setRestoreError(err instanceof ApiError ? err.message : dict.restoreFailed);
      }
      setRestoring(false);
    }
  }

  if (!backups) return null;

  return (
    <main style={{ maxWidth: 700, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>
      {error && <p role="alert">{error}</p>}

      <button type="button" onClick={handleRunNow} disabled={running}>
        {running ? dict.running : dict.runNow}
      </button>

      {backups.length === 0 ? (
        <p>{dict.noBackups}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>{dict.columnFilename}</th>
              <th>{dict.columnSize}</th>
              <th>{dict.columnTriggeredBy}</th>
              <th>{dict.columnCreatedAt}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.id}>
                <td>{b.filename}</td>
                <td>{formatSize(b.sizeBytes)}</td>
                <td>{triggeredByLabel(b.triggeredBy)}</td>
                <td>{new Date(b.createdAt).toLocaleString()}</td>
                <td>
                  <button type="button" onClick={() => handleDownload(b)}>
                    {dict.download}
                  </button>
                  <button type="button" onClick={() => openRestoreModal(b)}>
                    {dict.restore}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {restoreTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <form
            onSubmit={handleRestoreSubmit}
            style={{ background: "white", padding: "1.5rem", maxWidth: 400, width: "100%" }}
          >
            <h2>{dict.restoreConfirmTitle}</h2>
            <p>{dict.restoreConfirmWarning}</p>
            <label>
              {dict.pinLabel}
              <input
                type="password"
                name="pin"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                autoFocus
              />
            </label>
            {restoreError && <p role="alert">{restoreError}</p>}
            <div>
              <button type="button" onClick={closeRestoreModal} disabled={restoring}>
                {dict.restoreCancel}
              </button>
              <button type="submit" disabled={restoring}>
                {restoring ? dict.restoring : dict.restoreConfirm}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
