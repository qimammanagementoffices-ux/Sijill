import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

// Mirrors revalidate-branding/route.ts -- TranslationTable and LanguagesAdmin
// edit translation values by calling the Spring Boot backend directly, so
// Next's cached getDictionary() response (used on every page) doesn't know a
// value changed and would keep serving the old text for up to its 60s window
// (longer under low traffic thanks to stale-while-revalidate). Called after a
// successful translation save so every page picks up the change immediately.
export async function POST() {
  revalidateTag("dictionary");
  return NextResponse.json({ ok: true });
}
