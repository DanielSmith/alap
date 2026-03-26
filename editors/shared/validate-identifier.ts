/**
 * Validates identifiers used in Alap expressions (item IDs, macro names, tags).
 *
 * Hyphens are not allowed because `-` is the WITHOUT operator in the expression
 * grammar. `@nyc-bridges` parses as `@nyc` minus `bridges`, not as a macro
 * named `nyc-bridges`. Use underscores instead.
 *
 * This only applies to expression-facing identifiers. Hyphens are fine in
 * URLs, labels, descriptions, CSS classes, and other non-expression fields.
 */

const VALID_IDENTIFIER = /^\w+$/;

export const isValidIdentifier = (id: string): boolean =>
  id.length > 0 && VALID_IDENTIFIER.test(id);

export const identifierError = (id: string): string | null => {
  if (id.length === 0) return 'Identifier cannot be empty';
  if (id.includes('-')) return 'Hyphens are not allowed — use underscores. The "-" is the WITHOUT operator in expressions.';
  if (!VALID_IDENTIFIER.test(id)) return 'Only letters, numbers, and underscores are allowed';
  return null;
};
