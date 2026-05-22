import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

/**
 * Parse markdown to sanitized HTML.
 *
 * Returns null when the input is null, undefined, or an empty string so that
 * the corresponding _html column stays null for records with no content.
 * This preserves the existing "empty string → null" convention in the services.
 */
export function renderMarkdown(md: string | null | undefined): string | null {
  if (!md?.trim()) return null;

  const raw = marked.parse(md) as string;
  return DOMPurify.sanitize(raw);
}
