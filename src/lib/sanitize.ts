/**
 * Security Input Sanitizer & Anti-Bot Protection for LogHorizon
 * Prevents Stored XSS, HTML injection, malicious script payloads, and automated spam bot submissions.
 */

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    // Strip <script> and </script> tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Strip <iframe> and </iframe>
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    // Strip <object>, <embed>, <applet>, <style>, <link>, <meta>
    .replace(/<(object|embed|applet|style|link|meta|base)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, "")
    // Strip javascript: and vbscript: pseudoprotocols
    .replace(/(javascript|vbscript|data):/gi, "")
    // Strip inline event handlers (onload, onerror, onclick, onmouseover, etc.)
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    // Strip invisible/zero-width control characters except standard \n, \r, \t
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

export function sanitizePlainText(input: unknown): string {
  if (typeof input !== "string") return "";
  const cleaned = sanitizeText(input);
  // Neutralize raw angle brackets
  return cleaned.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Universal text sanitizer with configurable constraints.
 * Cleans dangerous HTML tags, inline event attributes, invisible control characters, and excess whitespace.
 */
export function sanitizeTextInput(
  input: unknown,
  options: {
    maxLength?: number;
    allowNewlines?: boolean;
    trim?: boolean;
  } = {}
): string {
  if (typeof input !== "string") {
    if (input === null || input === undefined) return "";
    return String(input);
  }

  const { maxLength, allowNewlines = true, trim = true } = options;

  let cleaned = sanitizeText(input);

  // If newlines are not allowed, replace newlines and multiple spaces with a single space
  if (!allowNewlines) {
    cleaned = cleaned.replace(/\s+/g, " ");
  }

  if (trim) {
    cleaned = cleaned.trim();
  }

  if (typeof maxLength === "number" && maxLength > 0) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * Invisible Honeypot Anti-Bot Checker
 * Returns true if submission is VALID (honeypot is empty/absent).
 * Returns false if bot trapped (honeypot was filled out by an automated script).
 */
export function validateHoneypot(body: any, fieldName = "website_url_hp"): boolean {
  if (!body || typeof body !== "object") return true;
  const value = body[fieldName];
  if (value && typeof value === "string" && value.trim().length > 0) {
    return false; // Trapped bot!
  }
  return true;
}

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Validates image strings (base64 data URI or web URL) to prevent SSRF and malicious payload injection.
 * Rejects non-image mime types, oversized payloads (> 5MB), or embedded scripts.
 */
export function isValidSafeImage(input: unknown, maxBytes = 5 * 1024 * 1024): boolean {
  if (typeof input !== "string") return false;
  const str = input.trim();
  if (!str) return false;

  // 1. Data URI validation
  if (str.startsWith("data:")) {
    const match = str.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return false;

    const mime = match[1]?.toLowerCase();
    const base64Data = match[2];

    if (!mime || !ALLOWED_IMAGE_MIMES.includes(mime)) return false;

    // Disallow SVG via data URI to prevent embedded script execution
    if (mime.includes("svg") || mime.includes("xml") || mime.includes("html")) return false;

    // Check base64 character validity
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) return false;

    // Calculate approx byte size: 4 base64 chars = 3 bytes
    const estimatedBytes = Math.floor(base64Data.length * 0.75);
    if (estimatedBytes > maxBytes) return false;

    return true;
  }

  // 2. Relative path validation (internal static assets)
  if (str.startsWith("/")) {
    if (str.includes("..") || str.includes("\\") || str.includes("<") || str.includes(">")) return false;
    return true;
  }

  // 3. Absolute HTTP(S) URL validation
  try {
    const url = new URL(str);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;

    // Prevent localhost/internal private IP SSRF
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host === "169.254.169.254" // AWS/Cloud metadata service
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
