/**
 * Strip PostgREST filter-syntax metacharacters from user-typed search input
 * before interpolating it into a `.or("col.ilike.%value%,...")` string.
 * Without this, a value containing `,`, `(`, `)`, or `%` can inject extra
 * filter clauses or break out of the intended ilike pattern.
 */
export function sanitizeIlikeTerm(input: string): string {
  return input.replace(/[%,()]/g, "");
}

/**
 * Validate a user-typed URL, blocking dangerous protocols (javascript:/data:/vbscript:)
 * and auto-prefixing "https://" when no scheme is given. Returns the sanitized URL
 * (empty string if the input was blank) or an error message for the given field.
 */
export function validateAndSanitizeUrl(
  url: string,
  fieldName: string,
): { url: string; error?: string } {
  const trimmed = url.trim();
  if (!trimmed) return { url: "" };

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return { url: "", error: `${fieldName} contains an invalid protocol.` };
  }

  let formatted = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    formatted = "https://" + trimmed;
  }

  try {
    new URL(formatted);
    return { url: formatted };
  } catch {
    return { url: "", error: `${fieldName} must be a valid URL.` };
  }
}

/**
 * Normalize a WhatsApp field that may be a plain phone number (e.g. "+880 171-234-5678")
 * or an already-formed wa.me/whatsapp.com link, into a working "https://wa.me/<digits>"
 * chat link. Returns an error if the input is neither a recognizable phone number nor URL.
 */
export function normalizeWhatsAppLink(input: string): { url: string; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) return { url: "" };

  const lower = trimmed.toLowerCase();
  if (lower.includes("wa.me") || lower.includes("whatsapp.com")) {
    return validateAndSanitizeUrl(trimmed, "WhatsApp");
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return { url: "", error: "WhatsApp must be a phone number or a wa.me link." };
  }

  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 8) {
    return { url: "", error: "WhatsApp must be a valid phone number (with country code) or a wa.me link." };
  }
  return { url: `https://wa.me/${digits}` };
}
