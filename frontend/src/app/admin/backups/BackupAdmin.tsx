"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchBlob, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { BackupSnapshotDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

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
    return t === "MANUAL" ? dict.triggeredManual : dict.triggeredScheduled;
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
