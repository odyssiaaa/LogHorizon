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
