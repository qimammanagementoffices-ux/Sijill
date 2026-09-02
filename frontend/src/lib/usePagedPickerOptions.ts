"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { PagedResponse } from "@/lib/types";

export default function usePagedPickerOptions<T extends { id: string }>(
  path: string,
  errorMessage: string,
  initialOptions: T[] = [],
  enabled = true,
) {
  const [options, setOptions] = useState<T[] | null>(enabled ? null : []);
  const [knownOptions, setKnownOptions] = useState<Record<string, T>>(() =>
    Object.fromEntries(initialOptions.map((option) => [option.id, option]))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);

  const search = useCallback((query: string) => {
    if (!enabled) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    const sequence = ++sequenceRef.current;
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const separator = path.includes("?") ? "&" : "?";
    const q = query.trim();
    const url = `${path}${separator}page=0&size=20${q ? `&q=${encodeURIComponent(q)}` : ""}`;
    void apiFetch<PagedResponse<T>>(url, { signal: controller.signal })
      .then((page) => {
        if (sequence !== sequenceRef.current) return;
        setOptions(page.content);
        setKnownOptions((current) => ({
          ...current,
          ...Object.fromEntries(page.content.map((option) => [option.id, option])),
        }));
      })
      .catch(() => {
        if (controller.signal.aborted || sequence !== sequenceRef.current) return;
        setOptions((current) => current ?? []);
        setError(errorMessage);
      })
      .finally(() => {
        if (sequence === sequenceRef.current) setLoading(false);
      });
  }, [enabled, errorMessage, path]);

  useEffect(() => {
    if (!enabled) {
      setOptions([]);
      return;
    }
    setOptions(null);
    search("");
    return () => abortRef.current?.abort();
  }, [enabled, search]);

  const remember = useCallback((option: T) => {
    setKnownOptions((current) => ({ ...current, [option.id]: option }));
  }, []);

  return { options, knownOptions, loading, error, search, remember };
}
