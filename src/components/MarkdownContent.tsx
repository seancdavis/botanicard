interface MarkdownContentProps {
  /** Pre-sanitized HTML from the _html column. When present, rendered directly. */
  html?: string | null;
  /** Raw markdown fallback for rows saved before the _html column existed. */
  fallbackMarkdown?: string | null;
  className?: string;
}

/**
 * Renders rich content from the database.
 *
 * - When `html` is present (non-empty): renders it via dangerouslySetInnerHTML.
 *   The value must come from the server-side sanitized _html column, never from
 *   request data.
 * - When `html` is absent: falls back to the raw markdown string with
 *   `whitespace-pre-wrap` so newlines from older rows still display correctly.
 */
export function MarkdownContent({
  html,
  fallbackMarkdown,
  className = "",
}: MarkdownContentProps) {
  if (html) {
    return (
      <div
        className={`prose prose-sm max-w-none ${className}`}
        // html is the sanitized _html column value written server-side;
        // it is never taken directly from user request data.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  if (!fallbackMarkdown) return null;

  return (
    <p className={`whitespace-pre-wrap ${className}`}>{fallbackMarkdown}</p>
  );
}
