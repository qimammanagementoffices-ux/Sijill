"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export default function SearchablePicker<T extends { id: string }>({
  items,
  value,
  selectedItem,
  placeholder,
  ariaLabel,
  emptyLabel,
  loadingLabel,
  errorLabel,
  clearLabel,
  loading = false,
  required = false,
  onSearchChange,
  onClearSelection,
  onChange,
  itemText,
  itemSearchText,
  renderItem,
}: {
  items: T[];
  value: string;
  selectedItem?: T | null;
  placeholder: string;
  ariaLabel?: string;
  emptyLabel: string;
  loadingLabel?: string;
  errorLabel?: string | null;
  clearLabel?: string;
  loading?: boolean;
  required?: boolean;
  onSearchChange?: (query: string) => void;
  onClearSelection?: () => void;
  onChange: (id: string, item?: T) => void;
  itemText: (item: T) => string;
  itemSearchText: (item: T) => string;
  renderItem: (item: T) => ReactNode;
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
  const needle = query.trim().toLocaleLowerCase();
  const matches = onSearchChange
    ? items
    : needle
      ? items.filter((item) => itemSearchText(item).toLocaleLowerCase().includes(needle))
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
    if (immediate) onSearchChange(nextQuery);
    else searchTimerRef.current = window.setTimeout(() => onSearchChange(nextQuery), 300);
  }

  function choose(item: T) {
    if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
    onChange(item.id, item);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }

  function clearSearch() {
    if (!query && selected && onClearSelection) onClearSelection();
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
    <div className={`asset-autocomplete${open && (query || (selected && onClearSelection)) ? " has-clear" : ""}`}>
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
        value={open ? query : selected ? itemText(selected) : ""}
        onFocus={() => {
          if (blurTimerRef.current !== null) window.clearTimeout(blurTimerRef.current);
          setQuery("");
          setOpen(true);
          setActiveIndex(-1);
          search("", true);
        }}
        onBlur={() => { blurTimerRef.current = window.setTimeout(() => setOpen(false), 150); }}
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
      {open && (query || (selected && onClearSelection)) && clearLabel && (
        <button type="button" className="asset-autocomplete-clear" aria-label={clearLabel} title={clearLabel} onMouseDown={(event) => event.preventDefault()} onClick={clearSearch}>×</button>
      )}
      {open && (
        <div id={listboxId} className="asset-autocomplete-options item-picker-options" role="listbox">
          {loading ? (
            <div className="asset-autocomplete-empty" role="status"><span className="spinner" /> {loadingLabel}</div>
          ) : errorLabel ? (
            <div className="asset-autocomplete-empty" role="alert">{errorLabel}</div>
          ) : visibleMatches.length === 0 ? (
            <div className="asset-autocomplete-empty">{emptyLabel}</div>
          ) : visibleMatches.map((item, index) => (
            <button
              id={`${listboxId}-${item.id}`}
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === value}
              className={index === activeIndex ? "is-active" : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(item)}
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
