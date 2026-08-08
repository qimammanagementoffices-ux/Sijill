"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { LanguageDto, TranslationExtraValueDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";
import SectionLoading from "@/components/SectionLoading";
import Toast from "@/components/Toast";

function revalidateDictionary() {
  fetch("/api/revalidate-dictionary", { method: "POST" }).catch(() => {});
}

export default function LanguagesAdmin({
  dict,
  commonDict,
}: {
  dict: Dictionary["adminLanguages"];
  commonDict: Dictionary["common"];
}) {
  const router = useRouter();
  const [languages, setLanguages] = useState<LanguageDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");
  const [adding, setAdding] = useState(false);

  const [reviewing, setReviewing] = useState<string | null>(null);

  function load() {
    apiFetch<LanguageDto[]>("/i18n/languages")
      .then(setLanguages)
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/dashboard");
          return;
        }
        // Any other failure (500, network error) used to be swallowed here,
        // leaving `languages` permanently null and the whole page rendering
        // nothing -- a blank page with no indication anything went wrong.
        // Surface it and fall back to an empty list so the built-in
        // ar/en/hi rows and the add-language form still render.
        setError(err instanceof ApiError ? err.message : String(err));
        setLanguages([]);
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

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await apiFetch("/i18n/languages", {
        method: "POST",
        body: JSON.stringify({ code, name, direction }),
      });
      setCode("");
      setName("");
      setDirection("ltr");
      load();
      setToast(commonDict.actionSuccess);
      revalidateDictionary();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : dict.addFailed);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(languageCode: string) {
    if (!window.confirm(dict.deleteConfirm)) return;
    setError(null);
    try {
      await apiFetch(`/i18n/languages/${languageCode}`, { method: "DELETE" });
      load();
      setToast(commonDict.actionSuccess);
      revalidateDictionary();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  if (reviewing) {
    return <LanguageReview code={reviewing} dict={dict} commonDict={commonDict} onBack={() => setReviewing(null)} />;
  }

  if (!languages) return <SectionLoading />;

  return (
    <>
      <div className="eyebrow">{dict.title}</div>
      <h1 className="section-title disp">{dict.title}</h1>
      {error && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </p>
      )}
      <p className="section-desc">
        {dict.builtInNote} <Link href="/admin/translations">{dict.editBuiltIn}</Link>
      </p>

      <div className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{dict.columnCode}</th>
                <th>{dict.columnName}</th>
                <th>{dict.columnDirection}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {["ar", "en", "hi"].map((c) => (
                <tr key={c}>
                  <td className="mono">{c}</td>
                  <td>—</td>
                  <td>{c === "ar" ? dict.directionRtl : dict.directionLtr}</td>
                  <td></td>
                </tr>
              ))}
              {languages.map((l) => (
                <tr key={l.code}>
                  <td className="mono">{l.code}</td>
                  <td>{l.name}</td>
                  <td>{l.direction === "rtl" ? dict.directionRtl : dict.directionLtr}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setReviewing(l.code)}>
                      {dict.review}
                    </button>
                    <button type="button" className="btn btn-seal btn-sm" onClick={() => handleDelete(l.code)}>
                      {dict.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel-body" style={{ borderTop: "1px solid var(--line-soft)" }}>
          <h3 style={{ marginTop: 0 }}>{dict.addTitle}</h3>
          <form onSubmit={handleAdd} className="form-grid">
            <div className="field">
              <label>{dict.codeLabel}</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                placeholder={dict.codeHint}
                pattern="[a-z]{2,10}"
                required
                disabled={adding}
              />
            </div>
            <div className="field">
              <label>{dict.nameLabel}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={adding} />
            </div>
            <div className="field">
              <label>{dict.directionLabel}</label>
              <select value={direction} onChange={(e) => setDirection(e.target.value as "ltr" | "rtl")} disabled={adding}>
                <option value="ltr">{dict.directionLtr}</option>
                <option value="rtl">{dict.directionRtl}</option>
              </select>
            </div>
            <div className="field span2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>
                {adding && <span className="spinner" />}
                {adding ? dict.adding : dict.add}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

function LanguageReview({
  code,
  dict,
  commonDict,
  onBack,
}: {
  code: string;
  dict: Dictionary["adminLanguages"];
  commonDict: Dictionary["common"];
  onBack: () => void;
}) {
  const [values, setValues] = useState<TranslationExtraValueDto[] | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TranslationExtraValueDto[]>(`/i18n/languages/${code}/values`)
      .then(setValues)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : String(err));
        setValues([]);
      });
  }, [code]);

  async function handleSave(key: string) {
    const value = edits[key];
    if (value === undefined) return;
    setError(null);
    try {
      await apiFetch(`/i18n/languages/${code}/values/${encodeURIComponent(key)}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      });
      setToast(commonDict.actionSuccess);
      revalidateDictionary();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  if (!values) return <SectionLoading />;

  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 10 }}>
        {dict.reviewBack}
      </button>
      <div className="eyebrow">{code}</div>
      <h1 className="section-title disp">{dict.reviewTitle}</h1>
      {error && (
        <p role="alert" style={{ color: "var(--seal)", fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </p>
      )}

      <div className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{dict.columnKey}</th>
                <th>{dict.columnValue}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {values.map((v) => (
                <tr key={v.key}>
                  <td>
                    <code className="mono" style={{ fontSize: 11.5 }}>
                      {v.key}
                    </code>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={edits[v.key] ?? v.value}
                      onChange={(e) => setEdits({ ...edits, [v.key]: e.target.value })}
                      style={{ border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 9px", width: "100%" }}
                    />
                  </td>
                  <td>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => handleSave(v.key)}>
                      {dict.save}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
