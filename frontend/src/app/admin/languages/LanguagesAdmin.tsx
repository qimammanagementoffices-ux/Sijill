"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { getToken } from "@/lib/auth";
import type { LanguageDto, TranslationExtraValueDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function LanguagesAdmin({ dict }: { dict: Dictionary["adminLanguages"] }) {
  const router = useRouter();
  const [languages, setLanguages] = useState<LanguageDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  if (reviewing) {
    return <LanguageReview code={reviewing} dict={dict} onBack={() => setReviewing(null)} />;
  }

  if (!languages) return null;

  return (
    <main style={{ maxWidth: 800, margin: "5vh auto", padding: "0 1rem" }}>
      <h1>{dict.title}</h1>
      {error && <p role="alert">{error}</p>}
      <p>{dict.builtInNote}</p>

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
              <td>{c}</td>
              <td>—</td>
              <td>{c === "ar" ? dict.directionRtl : dict.directionLtr}</td>
              <td></td>
            </tr>
          ))}
          {languages.map((l) => (
            <tr key={l.code}>
              <td>{l.code}</td>
              <td>{l.name}</td>
              <td>{l.direction === "rtl" ? dict.directionRtl : dict.directionLtr}</td>
              <td>
                <button type="button" onClick={() => setReviewing(l.code)}>
                  {dict.review}
                </button>
                <button type="button" onClick={() => handleDelete(l.code)}>
                  {dict.delete}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{dict.addTitle}</h2>
      <form onSubmit={handleAdd}>
        <label>
          {dict.codeLabel}
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase())}
            placeholder={dict.codeHint}
            pattern="[a-z]{2,10}"
            required
            disabled={adding}
          />
        </label>
        <label>
          {dict.nameLabel}
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={adding} />
        </label>
        <label>
          {dict.directionLabel}
          <select value={direction} onChange={(e) => setDirection(e.target.value as "ltr" | "rtl")} disabled={adding}>
            <option value="ltr">{dict.directionLtr}</option>
            <option value="rtl">{dict.directionRtl}</option>
          </select>
        </label>
        <button type="submit" disabled={adding}>
          {adding ? dict.adding : dict.add}
        </button>
      </form>
    </main>
  );
}

function LanguageReview({
  code,
  dict,
  onBack,
}: {
  code: string;
  dict: Dictionary["adminLanguages"];
  onBack: () => void;
}) {
  const [values, setValues] = useState<TranslationExtraValueDto[] | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TranslationExtraValueDto[]>(`/i18n/languages/${code}/values`).then(setValues);
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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  }

  if (!values) return null;

  return (
    <main style={{ maxWidth: 900, margin: "5vh auto", padding: "0 1rem" }}>
      <button type="button" onClick={onBack}>
        {dict.reviewBack}
      </button>
      <h1>
        {dict.reviewTitle}: {code}
      </h1>
      {error && <p role="alert">{error}</p>}
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
                <code>{v.key}</code>
              </td>
              <td>
                <input
                  type="text"
                  value={edits[v.key] ?? v.value}
                  onChange={(e) => setEdits({ ...edits, [v.key]: e.target.value })}
                />
              </td>
              <td>
                <button type="button" onClick={() => handleSave(v.key)}>
                  {dict.save}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
