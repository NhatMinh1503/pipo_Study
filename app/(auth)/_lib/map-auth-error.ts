/**
 * Maps a Supabase Auth error code to an i18n key. Unknown codes fall back to a
 * generic message so internal details never reach the UI.
 * Codes: https://supabase.com/docs/guides/auth/debugging/error-codes
 */
export function mapAuthError(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "auth.errors.invalidCredentials";
    case "email_not_confirmed":
      return "auth.errors.emailNotConfirmed";
    case "weak_password":
      return "auth.errors.weakPassword";
    case "same_password":
      return "auth.errors.samePassword";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "auth.errors.rateLimited";
    case "session_not_found":
    case "session_expired":
      return "auth.errors.sessionMissing";
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
      return "auth.errors.linkInvalid";
    default:
      return "errors.unexpected";
  }
}
