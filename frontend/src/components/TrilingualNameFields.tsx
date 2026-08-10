"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type { Dictionary } from "@/i18n/getDictionary";

type SourceLang = "ar" | "en" | "hi";

// Shared by every bilingual/trilingual name form in the app (departments,
// job titles, categories, items, assets, rooms, fault types) -- three name
// inputs plus an auto-translate button that fills the other two from
// whichever field the user just typed in. Expects to sit inside an
// existing <form className="form-grid">.
export default function TrilingualNameFields({
  nameAr,
  setNameAr,
  nameEn,
  setNameEn,
  nameHi,
  setNameHi,
  dict,
  errorsDict,
}: {
  nameAr: string;
  setNameAr: (v: string) => void;
  nameEn: string;
  setNameEn: (v: string) => void;
  nameHi: string;
  setNameHi: (v: string) => void;
  dict: Dictionary["categoriesModal"];
  errorsDict: Dictionary["errors"];
}) {
  const [lastEdited, setLastEdited] = useState<SourceLang | null>(null);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAutoTranslate() {
    if (!lastEdited) return;
    const text = { ar: nameAr, en: nameEn, hi: nameHi }[lastEdited];
    if (!text || !text.trim()) return;
    setError(null);
    setTranslating(true);
    try {
      const result = await apiFetch<{ nameAr: string; nameEn: string; nameHi: string }>("/translate", {
        method: "POST",
        body: JSON.stringify({ text, sourceLang: lastEdited }),
      });
      setNameAr(result.nameAr);
      setNameEn(result.nameEn);
      setNameHi(result.nameHi);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
    } finally {
      setTranslating(false);
    }
  }

  return (
    <>
      <div className="field">
        <label>{dict.nameArLabel}</label>
        <input
          type="text"
          value={nameAr}
          onChange={(e) => {
            setNameAr(e.target.value);
            setLastEdited("ar");
          }}
          dir="rtl"
          required
        />
      </div>
      <div className="field">
        <label>{dict.nameHiLabel}</label>
        <input
          type="text"
          value={nameHi}
          onChange={(e) => {
            setNameHi(e.target.value);
            setLastEdited("hi");
          }}
          dir="ltr"
        />
      </div>
      <div className="field">
        <label>{dict.nameEnLabel}</label>
        <input
          type="text"
          value={nameEn}
          onChange={(e) => {
            setNameEn(e.target.value);
            setLastEdited("en");
          }}
          required
        />
      </div>

      {error && (
        <p role="alert" className="field span2" style={{ color: "var(--seal)", fontSize: 12.5, margin: 0 }}>
          {error}
        </p>
      )}

      <div className="field span2" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={handleAutoTranslate}
          disabled={!lastEdited || translating}
        >
          {translating && <span className="spinner" />}
          {dict.autoTranslate}
        </button>
      </div>
      <p className="panel-note field span2" style={{ padding: 0, margin: 0, fontSize: 11.5 }}>
        {dict.autoTranslateNote}
      </p>
    </>
  );
}
