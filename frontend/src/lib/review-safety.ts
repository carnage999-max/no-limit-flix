const GENERIC_IA_COLLECTION_PAGES = new Set([
  'https://archive.org/details/publicmovies212',
]);

type ReviewSafetyVideoLike = {
  sourceProvider?: string | null;
  sourceType?: string | null;
  sourcePageUrl?: string | null;
  sourceLicenseUrl?: string | null;
  archiveIdentifier?: string | null;
};

export function isReviewSafeVideo(video: ReviewSafetyVideoLike) {
  const sourceProvider = video.sourceProvider || null;
  const sourceType = video.sourceType || null;
  const sourcePageUrl = video.sourcePageUrl || null;
  const sourceLicenseUrl = video.sourceLicenseUrl || null;
  const archiveIdentifier = video.archiveIdentifier || null;

  // Only explicitly-marked internal uploads remain available by default.
  if (sourceType === 'internal') {
    return true;
  }

  // For Internet Archive-sourced content, require title-specific provenance.
  const isInternetArchive = sourceProvider === 'internet_archive' || sourceType === 'external_legal';
  if (!isInternetArchive) {
    return false;
  }

  if (!sourceLicenseUrl || !sourcePageUrl) {
    return false;
  }

  if (GENERIC_IA_COLLECTION_PAGES.has(sourcePageUrl)) {
    return false;
  }

  if (archiveIdentifier && archiveIdentifier.startsWith('publicmovies212:')) {
    return false;
  }

  return true;
}
