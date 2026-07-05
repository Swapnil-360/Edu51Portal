/**
 * Strip PostgREST filter-syntax metacharacters from user-typed search input
 * before interpolating it into a `.or("col.ilike.%value%,...")` string.
 * Without this, a value containing `,`, `(`, `)`, or `%` can inject extra
 * filter clauses or break out of the intended ilike pattern.
 */
export function sanitizeIlikeTerm(input: string): string {
  return input.replace(/[%,()]/g, "");
}
