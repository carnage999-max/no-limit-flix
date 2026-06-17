export const getInternalAppOrigin = (env = process.env) => {
  const configuredOrigin = env.INTERNAL_APP_ORIGIN?.trim();
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '');
  }

  const port = env.PORT?.trim() || '3000';
  return `http://127.0.0.1:${port}`;
};

export const buildSessionVerificationUrl = (requestUrl, env = process.env) => {
  return new URL('/api/auth/session', getInternalAppOrigin(env)).toString();
};

export const getRequestSessionToken = ({ cookieToken, authorizationHeader }) => {
  if (cookieToken) return cookieToken;
  if (!authorizationHeader) return null;

  const [scheme, value] = authorizationHeader.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
  return value || null;
};

export const buildSessionVerificationHeaders = ({ cookieHeader, authorizationHeader }) => {
  const headers = {};

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  if (authorizationHeader) {
    headers.authorization = authorizationHeader;
  }

  return headers;
};
