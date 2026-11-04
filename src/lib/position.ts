const GAP = 1024

/**
 * Fractional ordering: returns a position strictly between two neighbours so a
 * move only rewrites the moved card. `before`/`after` are the positions of the
 * cards that will sit above and below the moved card (undefined at the edges).
 */
export function positionBetween(before?: number, after?: number): number {
  if (before === undefined && after === undefined) return GAP
  if (before === undefined) return after! - GAP
  if (after === undefined) return before + GAP
  return (before + after) / 2
}
