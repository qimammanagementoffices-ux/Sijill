import { ApiError } from "@/lib/apiClient";
import type { Dictionary } from "@/i18n/getDictionary";

// The request workflow returns a stable code per refusal (backend:
// error/RequestWorkflowErrors.java); the wording lives in the dictionary so it
// follows the interface language. Anything without a code — or a code with no
// translation row yet — falls back to the server's own message, then to the
// generic error.
export function requestErrorMessage(
  error: unknown,
  errorsDict: Dictionary["requestErrors"],
  genericMessage: string
) {
  if (!(error instanceof ApiError)) return genericMessage;
  const translated = error.code ? errorsDict[error.code] : undefined;
  return translated || error.message || genericMessage;
}
