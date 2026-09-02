"use client";

import type { InventoryRequestOption } from "@/lib/types";
import SearchablePicker from "@/components/SearchablePicker";

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
  return (
    <SearchablePicker
      items={items}
      value={value}
      selectedItem={selectedItem}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      emptyLabel={emptyLabel}
      loadingLabel={loadingLabel}
      errorLabel={errorLabel}
      clearLabel={clearLabel}
      loading={loading}
      required={required}
      onSearchChange={onSearchChange}
      onChange={onChange}
      itemText={(item) => `${item.code} — ${item.nameAr}`}
      itemSearchText={(item) => `${item.code} ${item.nameAr} ${item.nameEn}`}
      renderItem={(item) => (
        <>
                <span className="item-picker-thumb">
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <em aria-hidden="true">▣</em>}
                </span>
                <span className="item-picker-text">
                  <b>{item.nameAr}</b>
                  <span>
                    {item.code} · {item.quantity} {item.unit ?? ""}
                  </span>
                </span>
        </>
      )}
    />
  );
}
