"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { InventoryRequestOption } from "@/lib/types";

// Type-to-search over the item catalogue, replacing a <select> that had to be
// scrolled through. Follows the same shape as the asset autocomplete on the
// asset request form, with the item's photo alongside each row: a storekeeper
// recognises "the blue 5L bottle" faster than "WH-0142".
export default function ItemPicker({
  items,
  value,
  placeholder,
  ariaLabel,
  emptyLabel,
  loadingLabel,
  errorLabel,
  clearLabel,
  loading = false,
  required = false,
  selectedItem,
  onSearchChange,
  onChange,
}: {
  // Already filtered by the caller — by category, and to drop items taken by
  // another row.
  items: InventoryRequestOption[];
  value: string;
  placeholder: string;
  ariaLabel?: string;
  emptyLabel: string;
  loadingLabel?: string;
  errorLabel?: string | null;
  clearLabel?: string;
  loading?: boolean;
  required?: boolean;
  selectedItem?: InventoryRequestOption | null;
  onSearchChange?: (query: string) => void;
  onChange: (itemId: string, item?: InventoryRequestOption) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const composingRef = useRef(false);
  const listboxId = useId();

  const selected = selectedItem ?? items.find((item) => item.id === value) ?? null;
  const needle = query.trim().toLowerCase();
  const matches = onSearchChange
    ? items
    : needle
    ? items.filter(
        (item) =>
          item.code.toLowerCase().includes(needle) ||
          item.nameAr.toLowerCase().includes(needle) ||
          item.nameEn.toLowerCase().includes(needle)
      )
    : items;
  const visibleMatches = matches.slice(0, 20);

  useEffect(() => () => {
    if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
    if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
  }, []);

  useEffect(() => {
    if (!open || activeIndex < 0 || !visibleMatches[activeIndex]) return;
    document.getElementById(`${listboxId}-${visibleMatches[activeIndex].id}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId, open, visibleMatches]);

  function search(nextQuery: string, immediate = false) {
    if (!onSearchChange) return;
    if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
    if (immediate) {
      onSearchChange(nextQuery);
      return;
    }
    searchTimerRef.current = window.setTimeout(() => onSearchChange(nextQuery), 300);
  }

  function choose(item: InventoryRequestOption) {
    if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
    onChange(item.id, item);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }

  function clearSearch() {
    setQuery("");
    setActiveIndex(-1);
    search("", true);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(visibleMatches.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && open && visibleMatches[activeIndex]) {
      event.preventDefault();
      choose(visibleMatches[activeIndex]);
    } else if (event.key === "Escape") {
      if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className={`asset-autocomplete${open && query ? " has-clear" : ""}`}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel ?? placeholder}
        aria-activedescendant={open && activeIndex >= 0 && visibleMatches[activeIndex] ? `${listboxId}-${visibleMatches[activeIndex].id}` : undefined}
        aria-busy={loading}
        aria-required={required}
        required={required}
        // Shows the chosen item while idle, and whatever is being typed while
        // searching — so the field never looks empty after a selection.
        value={open ? query : selected ? `${selected.code} — ${selected.nameAr}` : ""}
        onFocus={() => {
          if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
          setQuery("");
          setOpen(true);
          setActiveIndex(-1);
          search("", true);
        }}
        // Still needed for clicking away or tabbing out; the options prevent
        // their own mousedown, so this no longer races the selection.
        onBlur={() => {
          blurTimerRef.current = window.setTimeout(() => setOpen(false), 150);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setOpen(true);
          setActiveIndex(-1);
          if (!composingRef.current) search(nextQuery);
        }}
        onCompositionStart={() => {
          composingRef.current = true;
          if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
        }}
        onCompositionEnd={(event) => {
          composingRef.current = false;
          search(event.currentTarget.value);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && query && clearLabel && (
        <button
          type="button"
          className="asset-autocomplete-clear"
          aria-label={clearLabel}
          title={clearLabel}
          onMouseDown={(event) => event.preventDefault()}
          onClick={clearSearch}
        >
          ×
        </button>
      )}
      {open && (
        <div id={listboxId} className="asset-autocomplete-options item-picker-options" role="listbox">
          {loading ? (
            <div className="asset-autocomplete-empty" role="status">
              <span className="spinner" /> {loadingLabel}
            </div>
          ) : errorLabel ? (
            <div className="asset-autocomplete-empty" role="alert">{errorLabel}</div>
          ) : visibleMatches.length === 0 ? (
            <div className="asset-autocomplete-empty">{emptyLabel}</div>
          ) : (
            visibleMatches.map((item, index) => (
              <button
                id={`${listboxId}-${item.id}`}
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === value}
                className={index === activeIndex ? "is-active" : undefined}
                // The input's blur closes this list, and blur fires on
                // mousedown -- before the click ever lands. Preventing the
                // default keeps focus on the input so the click arrives at a
                // button that still exists.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(item)}
              >
                <span className="item-picker-thumb">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <em aria-hidden="true">▣</em>}
                </span>
                <span className="item-picker-text">
                  <b>{item.nameAr}</b>
                  <span>
                    {item.code} · {item.quantity} {item.unit ?? ""}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
