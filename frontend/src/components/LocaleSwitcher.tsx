"use client";

import type { LocaleInfo } from "@/i18n/locales";

// Matches getRequestLocale.ts's LOCALE_COOKIE -- can't import that constant
// here since it's from a "server-only" module.
const LOCALE_COOKIE = "sijill.locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export default function LocaleSwitcher({ locales, current }: { locales: LocaleInfo[]; current: string }) {
  if (locales.length < 2) return null;

  function select(code: string) {
    if (code === current) return;
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
    // The chosen locale drives server-rendered HTML (lang/dir attributes,
    // every page's dictionary) via a cookie RootLayout reads -- a client
    // router navigation wouldn't re-run the server layout, so a full reload
    // is the only way to actually pick up the change.
    window.location.reload();
  }

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {locales.map((l) => (
        <button
          key={l.code}
          type="button"
          className={`lang-btn${l.code === current ? " active" : ""}`}
          onClick={() => select(l.code)}
        >
          {l.name}
        </button>
      ))}
    </div>
  );
}
