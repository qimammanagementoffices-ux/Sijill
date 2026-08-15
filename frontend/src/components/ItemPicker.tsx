"use client";

import { useState } from "react";
import type { InventoryItemListItem } from "@/lib/types";

// Type-to-search over the item catalogue, replacing a <select> that had to be
// scrolled through. Follows the same shape as the asset autocomplete on the
// asset request form, with the item's photo alongside each row: a storekeeper
// recognises "the blue 5L bottle" faster than "WH-0142".
export default function ItemPicker({
  items,
  value,
  placeholder,
  emptyLabel,
  onChange,
}: {
  // Already filtered by the caller — by category, and to drop items taken by
  // another row.
  items: InventoryItemListItem[];
  value: string;
  placeholder: string;
  emptyLabel: string;
  onChange: (itemId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const selected = items.find((item) => item.id === value) ?? null;
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? items.filter(
        (item) =>
          item.code.toLowerCase().includes(needle) ||
          item.nameAr.toLowerCase().includes(needle) ||
          item.nameEn.toLowerCase().includes(needle)
      )
    : items;

  function choose(item: InventoryItemListItem) {
    onChange(item.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="asset-autocomplete">
      <input
        // Shows the chosen item while idle, and whatever is being typed while
        // searching — so the field never looks empty after a selection.
        value={open ? query : selected ? `${selected.code} — ${selected.nameAr}` : ""}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div className="asset-autocomplete-options item-picker-options" role="listbox">
          {matches.length === 0 ? (
            <div className="asset-autocomplete-empty">{emptyLabel}</div>
          ) : (
            matches.slice(0, 20).map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === value}
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
