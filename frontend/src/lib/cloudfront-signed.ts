import crypto from 'crypto';

interface SignedCookieResult {
  cookieName: string;
  cookieValue: string;
  expiresAt: Date;
}

/**
 * Generate CloudFront signed cookies for time-limited access
 * Used for HLS streams where segments need authorization
 *
 * @param resourcePath - CloudFront URL path (e.g., /videos/title-123/*)
 * @param expiresInMinutes - Cookie expiration time (5-10 minutes recommended)
 * @returns Signed cookie object with name, value, and expiry
 */
export function generateCloudFrontSignedCookie(
  resourcePath: string,
  expiresInMinutes: number = 10
): SignedCookieResult {
  const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY;
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;

  if (!privateKey || !keyPairId) {
    throw new Error(
      'CloudFront signing requires CLOUDFRONT_PRIVATE_KEY and CLOUDFRONT_KEY_PAIR_ID env vars'
    );
  }

  // Calculate expiry (Unix timestamp in seconds)
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + expiresInMinutes * 60;

  // Build policy document
  const policy = {
    Statement: [
      {
        Resource: resourcePath,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': expiresAt,
          },
        },
      },
    ],
  };

  const policyStr = JSON.stringify(policy);
  const encodedPolicy = Buffer.from(policyStr).toString('base64');

  // Sign the policy
  const signature = crypto
    .createSign('RSA-SHA1')
    .update(encodedPolicy)
    .sign(privateKey, 'base64');

  // Build cookie string
  const cookieValue = [
    `CloudFront-Policy=${encodedPolicy}`,
    `CloudFront-Signature=${signature}`,
    `CloudFront-Key-Pair-Id=${keyPairId}`,
  ].join('; ');

  return {
    cookieName: 'CloudFront-Cookie',
    cookieValue,
    expiresAt: new Date(expiresAt * 1000),
  };
}

/**
 * Build CloudFront signed URL (alternative to cookies)
 * Useful if signed cookies aren't supported
 */
export function generateCloudFrontSignedURL(
  cloudfrontDomain: string,
  resourcePath: string,
  expiresInMinutes: number = 10
): { url: string; expiresAt: Date } {
  const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY;
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;

  if (!privateKey || !keyPairId) {
    throw new Error(
      'CloudFront signing requires CLOUDFRONT_PRIVATE_KEY and CLOUDFRONT_KEY_PAIR_ID env vars'
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + expiresInMinutes * 60;

  const policy = {
    Statement: [
      {
        Resource: `https://${cloudfrontDomain}${resourcePath}`,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': expiresAt,
          },
        },
      },
    ],
  };

  const policyStr = JSON.stringify(policy);
  const encodedPolicy = Buffer.from(policyStr).toString('base64');

  const signature = crypto
    .createSign('RSA-SHA1')
    .update(encodedPolicy)
    .sign(privateKey, 'base64');

  // Convert to URL-safe base64
  const urlSafePolicy = encodedPolicy
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const urlSafeSignature = signature
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const url = `https://${cloudfrontDomain}${resourcePath}?Policy=${urlSafePolicy}&Signature=${urlSafeSignature}&Key-Pair-Id=${keyPairId}`;

  return {
    url,
    expiresAt: new Date(expiresAt * 1000),
  };
}
