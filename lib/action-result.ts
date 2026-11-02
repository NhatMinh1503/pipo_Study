/**
 * Result of a Server Action called from a form. Errors are i18n message keys
 * (e.g. "auth.errors.invalidCredentials") so the client renders them in the user's language.
 */
export type ActionResult<TField extends string = string> =
  { ok: true } | { ok: false; error?: string; fieldErrors?: Partial<Record<TField, string>> };

export const actionOk = (): ActionResult => ({ ok: true });

export const actionError = (error: string): ActionResult => ({ ok: false, error });
