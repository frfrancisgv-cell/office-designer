interface PositionedText {
  bounds: {
    y: number;
  };
}

interface GabcScoreLayout {
  annotation?: PositionedText | null;
}

interface GabcContextLayout {
  staffInterval: number;
}

/**
 * Lift Exsurge's mode annotation enough to clear the initial majuscule.
 * This must run after layoutChantLines, which restores Exsurge's default of
 * three staff intervals above the staff.
 */
export function positionGabcAnnotation(
  score: GabcScoreLayout,
  ctxt: GabcContextLayout,
): void {
  const annotation = score.annotation;
  if (!annotation) return;

  // Two intervals above Exsurge's default clears tall initials without the
  // excessive gap caused by comparing its incompatible text-bound systems.
  annotation.bounds.y = Math.min(
    annotation.bounds.y,
    -5 * ctxt.staffInterval,
  );
}
