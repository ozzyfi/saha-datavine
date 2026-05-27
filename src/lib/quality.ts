/**
 * Compute a quality score 0-100 for a field record.
 * -25 if root_cause missing
 * -25 if evidence_urls empty
 * -25 if asset_id missing
 * -25 if resolution missing
 */
export function computeQualityScore(r: {
  root_cause?: string | null;
  evidence_urls?: string[] | null;
  asset_id?: string | null;
  resolution?: string | null;
}): number {
  let score = 100;
  if (!r.root_cause) score -= 25;
  if (!r.evidence_urls || r.evidence_urls.length === 0) score -= 25;
  if (!r.asset_id) score -= 25;
  if (!r.resolution) score -= 25;
  return Math.max(0, score);
}
