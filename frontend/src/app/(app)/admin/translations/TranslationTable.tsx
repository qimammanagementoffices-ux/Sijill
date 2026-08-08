"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { PagedResponse, TranslationRow } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";

type Edited = { valueAr: string; valueEn: string; valueHi: string };

export default function TranslationTable({
  dict,
  commonDict,
}: {
  dict: Dictionary["adminTranslations"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [page, setPage] = useState<PagedResponse<TranslationRow> | null>(null);
  const [edits, setEdits] = useState<Record<string, Edited>>({});
  const [error, setError] = useState<string | null>(null);
  const [conflictKeys, setConflictKeys] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  function load(pageNumber: number, query: string) {
    apiFetch<PagedResponse<TranslationRow>>(
      `/i18n/translations?q=${encodeURIComponent(query)}&page=${pageNumber}`
    )
      .then(setPage)
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
    load(0, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    load(0, q);
  }

  async function handleSave(row: TranslationRow) {
    const edited = edits[row.key];
    if (!edited) return;
    setError(null);
    try {
      await apiFetch(`/i18n/translations/${encodeURIComponent(row.key)}`, {
        method: "PUT",
        body: JSON.stringify({
          valueAr: edited.valueAr,
          valueEn: edited.valueEn,
          valueHi: edited.valueHi || null,
          version: row.version,
        }),
      });
      setConflictKeys((prev) => {
        const next = new Set(prev);
        next.delete(row.key);
        return next;
      });
      load(page?.page ?? 0, q);
      setToast(commonDict.actionSuccess);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setConflictKeys((prev) => new Set(prev).add(row.key));
      } else {
        setError(err instanceof ApiError ? err.message : String(err));
      }
    }
  }

  if (!page) return <SectionLoading />;

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
        <div className="panel-head">
          <form onSubmit={handleSearch} className="filter-row" style={{ flex: 1 }}>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={dict.searchPlaceholder}
              style={{ border: "1.5px solid var(--line)", borderRadius: 9, padding: "8px 12px", flex: 1, maxWidth: 280 }}
            />
            <button type="submit" className="btn btn-outline btn-sm">
              {dict.search}
            </button>
          </form>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{dict.columnKey}</th>
                <th>{dict.columnEn}</th>
                <th>{dict.columnAr}</th>
                <th>{dict.columnHi}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {page.content.map((row) => {
                const edited = edits[row.key] ?? {
                  valueAr: row.valueAr,
                  valueEn: row.valueEn,
                  valueHi: row.valueHi ?? "",
                };
                return (
                  <tr key={row.key}>
                    <td>
                      <code className="mono" style={{ fontSize: 11.5 }}>
                        {row.key}
                      </code>
                      {conflictKeys.has(row.key) && (
                        <div className="chip s-rejected chip-sm" style={{ marginTop: 4 }}>
                          {dict.conflictNotice}
                        </div>
                      )}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={edited.valueEn}
                        onChange={(e) => setEdits({ ...edits, [row.key]: { ...edited, valueEn: e.target.value } })}
                        style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={edited.valueAr}
                        onChange={(e) => setEdits({ ...edits, [row.key]: { ...edited, valueAr: e.target.value } })}
                        style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                        dir="rtl"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={edited.valueHi}
                        onChange={(e) => setEdits({ ...edits, [row.key]: { ...edited, valueHi: e.target.value } })}
                        style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                      />
                    </td>
                    <td>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => handleSave(row)}>
                        {dict.save}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {page.totalPages > 1 && (
          <div className="panel-note" style={{ display: "flex", gap: 6, paddingTop: 14 }}>
            {Array.from({ length: page.totalPages }, (_, i) => i).map((i) => (
              <button
                key={i}
                type="button"
                className={`btn btn-sm ${i === page.page ? "btn-primary" : "btn-outline"}`}
                onClick={() => load(i, q)}
                disabled={i === page.page}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
