import "server-only";
import type { Locale } from "./config";

// One dictionary type shared by every locale file. Add keys here first,
// then fill them in every locale — this is what keeps ar/en (and later
// the third language) from drifting apart. See docs/api-conventions.md
// "Localized fields" for the equivalent rule on the backend/data side.
export type Dictionary = {
  common: {
    appName: string;
    loading: string;
    save: string;
    cancel: string;
  };
  onboarding: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    createAdmin: string;
  };
  login: {
    title: string;
    phoneLabel: string;
    pinLabel: string;
    submit: string;
    genericError: string;
  };
  publicAsset: {
    notFound: string;
  };
};

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
