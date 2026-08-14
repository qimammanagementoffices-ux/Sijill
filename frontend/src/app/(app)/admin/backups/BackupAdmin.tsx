"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchBlob, ApiError } from "@/lib/apiClient";
import { getToken, clearToken } from "@/lib/auth";
import type { BackupSnapshotDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";

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

export default function BackupAdmin({
  dict,
  commonDict,
}: {
  dict: Dictionary["backups"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [backups, setBackups] = useState<BackupSnapshotDto[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupSnapshotDto | null>(null);
  const [pin, setPin] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BackupSnapshotDto | null>(null);
  const [deletePin, setDeletePin] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setToast(commonDict.actionSuccess);
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

  function openDeleteModal(backup: BackupSnapshotDto) {
    setDeleteTarget(backup);
    setDeletePin("");
    setDeleteError(null);
  }

  function closeDeleteModal() {
    setDeleteTarget(null);
    setDeletePin("");
    setDeleteError(null);
  }

  async function handleDeleteSubmit(e: FormEvent) {
    e.preventDefault();
    if (!deleteTarget) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await apiFetch(`/backups/${deleteTarget.id}`, {
        method: "DELETE",
        body: JSON.stringify({ pin: deletePin }),
      });
      closeDeleteModal();
      load();
      setToast(commonDict.actionSuccess);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setDeleteError(dict.deleteRateLimited);
      } else if (err instanceof ApiError && err.status === 409) {
        // Same as restore: 409 also covers "a backup/restore is already in
        // progress," not just wrong PIN — only show the localized wrong-PIN
        // text for that specific message.
        setDeleteError(err.message === "Invalid PIN" ? dict.deleteInvalidPin : err.message);
      } else {
        setDeleteError(err instanceof ApiError ? err.message : dict.deleteFailed);
      }
      setDeleting(false);
    }
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
        // 409 also covers "a backup/restore is already in progress" (the
        // backupLock guard in BackupService) — only show the localized
        // wrong-PIN text for that specific case, otherwise surface the
        // backend's own message like every other error path here.
        setRestoreError(err.message === "Invalid PIN" ? dict.restoreInvalidPin : err.message);
      } else {
        setRestoreError(err instanceof ApiError ? err.message : dict.restoreFailed);
      }
      setRestoring(false);
    }
  }

  if (!backups) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.title}</h1>
      {error && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div className="panel">
        <div className="panel-head" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleRunNow} disabled={running}>
            {running && <span className="spinner" />}
            {running ? dict.running : dict.runNow}
          </button>
        </div>

        {backups.length === 0 ? (
          <div className="empty">
            <b>{dict.noBackups}</b>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table-center">
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
                    <td className="mono">{b.filename}</td>
                    <td className="mono">{formatSize(b.sizeBytes)}</td>
                    <td>
                      <span className="chip chip-sm">{triggeredByLabel(b.triggeredBy)}</span>
                    </td>
                    <td className="mono">{new Date(b.createdAt).toLocaleString()}</td>
                    <td style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => handleDownload(b)}>
                        {dict.download}
                      </button>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => openRestoreModal(b)}>
                        {dict.restore}
                      </button>
                      <button type="button" className="btn btn-seal btn-sm" onClick={() => openDeleteModal(b)}>
                        {dict.delete}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {restoreTarget && (
        <div className="overlay" role="dialog" aria-modal="true">
          <form onSubmit={handleRestoreSubmit} className="modal">
            <div className="modal-head">
              <h3>{dict.restoreConfirmTitle}</h3>
              <button type="button" className="modal-close" onClick={closeRestoreModal} aria-label="close" disabled={restoring}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0 }}>{dict.restoreConfirmWarning}</p>
              <div className="field">
                <label>{dict.pinLabel}</label>
                <input
                  type="password"
                  name="pin"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {restoreError && (
                <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginTop: 10 }}>
                  {restoreError}
                </p>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={closeRestoreModal} disabled={restoring}>
                {dict.restoreCancel}
              </button>
              <button type="submit" className="btn btn-seal btn-sm" disabled={restoring}>
                {restoring && <span className="spinner" />}
                {restoring ? dict.restoring : dict.restoreConfirm}
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="overlay" role="dialog" aria-modal="true">
          <form onSubmit={handleDeleteSubmit} className="modal">
            <div className="modal-head">
              <h3>{dict.deleteConfirmTitle}</h3>
              <button type="button" className="modal-close" onClick={closeDeleteModal} aria-label="close" disabled={deleting}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginTop: 0 }}>{dict.deleteConfirm}</p>
              <div className="field">
                <label>{dict.pinLabel}</label>
                <input
                  type="password"
                  name="pin"
                  inputMode="numeric"
                  value={deletePin}
                  onChange={(e) => setDeletePin(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {deleteError && (
                <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginTop: 10 }}>
                  {deleteError}
                </p>
              )}
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-outline btn-sm" onClick={closeDeleteModal} disabled={deleting}>
                {dict.restoreCancel}
              </button>
              <button type="submit" className="btn btn-seal btn-sm" disabled={deleting}>
                {deleting && <span className="spinner" />}
                {deleting ? dict.deleting : dict.delete}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
