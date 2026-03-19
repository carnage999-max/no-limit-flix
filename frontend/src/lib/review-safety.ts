type ReviewSafetyVideoLike = {
  sourceProvider?: string | null;
  sourceType?: string | null;
  sourceLicenseUrl?: string | null;
};

export function isReviewSafeVideo(video: ReviewSafetyVideoLike) {
  const sourceProvider = video.sourceProvider || null;
  const sourceType = video.sourceType || null;
  const sourceLicenseUrl = video.sourceLicenseUrl || null;

  // Explicitly-marked internal uploads remain available by default.
  if (sourceType === 'internal') {
    return true;
  }

  // Internet Archive-sourced titles remain available when we retain license metadata.
  const isInternetArchive = sourceProvider === 'internet_archive' || sourceType === 'external_legal';
  if (!isInternetArchive) {
    return false;
  }

  return Boolean(sourceLicenseUrl);
}
