import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

// BrandingAdmin talks to the Spring Boot backend directly, bypassing this
// Next.js server entirely -- so Next has no way to know branding changed and
// keeps serving getBranding()'s cached response for up to its 60s window
// (longer in practice under low traffic, since stale-while-revalidate can
// serve one more stale response before refreshing). Called right after a
// successful save/upload/remove/reset so the login page and sidebar pick up
// the change on their very next load instead of waiting on that window.
export async function POST() {
  revalidateTag("branding");
  return NextResponse.json({ ok: true });
}
