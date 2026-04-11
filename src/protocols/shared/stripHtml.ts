/**
 * Copyright 2026 Daniel Smith — Apache 2.0
 */

/**
 * Strip HTML tags and decode common entities.
 * Presentational cleanup for API responses that return HTML in text fields.
 */
export const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
};
