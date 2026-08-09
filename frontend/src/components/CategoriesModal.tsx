"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import TrilingualNameFields from "@/components/TrilingualNameFields";
import type { CategoryDto } from "@/lib/types";
import type { Dictionary } from "@/i18n/getDictionary";

export default function CategoriesModal({
  basePath,
  title,
  description,
  dict,
  errorsDict,
  onClose,
  onChanged,
}: {
  basePath: string;
  title: string;
  description: string;
  dict: Dictionary["categoriesModal"];
  errorsDict: Dictionary["errors"];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [icon, setIcon] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameUr, setNameUr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<CategoryDto[]>(basePath).then(setCategories);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(basePath, {
        method: "POST",
        body: JSON.stringify({ nameAr, nameEn, nameUr: nameUr || null, icon: icon || null, version: null }),
      });
      setIcon("");
      setNameAr("");
      setNameEn("");
      setNameUr("");
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(category: CategoryDto) {
    if (!window.confirm(dict.removeConfirm)) return;
    setError(null);
    try {
      await apiFetch(`${basePath}/${category.id}/deactivate`, { method: "POST" });
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorsDict.generic);
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="panel-note" style={{ padding: 0, margin: "0 0 14px" }}>
            {description}
          </p>

          {!categories ? (
            <p className="panel-note" style={{ padding: 0 }}>
              …
            </p>
          ) : categories.length === 0 ? (
            <p className="panel-note" style={{ padding: 0, marginBottom: 14 }}>
              {dict.noResults}
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
              {categories.map((c) => (
                <span key={c.id} className="chip" style={{ gap: 8 }}>
                  {c.icon && <span>{c.icon}</span>}
                  {c.nameAr}
                  <button
                    type="button"
                    onClick={() => handleRemove(c)}
                    aria-label="remove"
                    style={{ border: "none", background: "none", cursor: "pointer", color: "var(--seal)", fontWeight: 700 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <form id="category-add-form" onSubmit={handleCreate} className="form-grid">
            <div className="field">
              <label>{dict.iconLabel}</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder={dict.iconPlaceholder}
                maxLength={8}
                style={{ textAlign: "center" }}
              />
            </div>
            <TrilingualNameFields
              nameAr={nameAr}
              setNameAr={setNameAr}
              nameEn={nameEn}
              setNameEn={setNameEn}
              nameUr={nameUr}
              setNameUr={setNameUr}
              dict={dict}
              errorsDict={errorsDict}
            />

            {error && (
              <p role="alert" className="field span2" style={{ color: "var(--seal)", fontSize: 12.5, margin: 0 }}>
                {error}
              </p>
            )}

            <div className="field span2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting && <span className="spinner" />}
                {dict.addNew}
              </button>
            </div>
          </form>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            {dict.done}
          </button>
        </div>
      </div>
    </div>
  );
}
