/**
 * Security Input Sanitizer for LogHorizon
 * Prevents Stored XSS, HTML injection, and malicious scripts in user submissions.
 */

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    // Strip <script> and </script> tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Strip <iframe> and </iframe>
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    // Strip <object>, <embed>, <applet>
    .replace(/<(object|embed|applet)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, "")
    // Strip javascript: pseudoprotocol
    .replace(/javascript:\s*/gi, "")
    // Strip inline event handlers (onload, onerror, onclick, etc.)
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .trim();
}

export function sanitizePlainText(input: unknown): string {
  if (typeof input !== "string") return "";
  const cleaned = sanitizeText(input);
  // Also encode raw angle brackets to neutralize any leftover tags
  return cleaned
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Validates image strings (base64 data URI or web URL) to prevent SSRF and malicious payload injection.
 * Rejects non-image mime types, oversized payloads (> 2MB), or embedded scripts.
 */
export function isValidSafeImage(input: unknown, maxBytes = 2 * 1024 * 1024): boolean {
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

