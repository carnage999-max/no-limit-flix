import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSessionVerificationHeaders,
  buildSessionVerificationUrl,
  getInternalAppOrigin,
  getRequestSessionToken,
} from '../src/lib/middleware-auth.js';

test('getInternalAppOrigin defaults to loopback origin for in-process middleware checks', () => {
  assert.equal(getInternalAppOrigin({}), 'http://127.0.0.1:3000');
});

test('getInternalAppOrigin respects PORT when provided', () => {
  assert.equal(getInternalAppOrigin({ PORT: '4010' }), 'http://127.0.0.1:4010');
});

test('getInternalAppOrigin prefers INTERNAL_APP_ORIGIN over public hostnames', () => {
  assert.equal(
    getInternalAppOrigin({ INTERNAL_APP_ORIGIN: 'http://nolimitflix:3000/' }),
    'http://nolimitflix:3000'
  );
});

test('buildSessionVerificationUrl targets loopback instead of the public request host', () => {
  assert.equal(
    buildSessionVerificationUrl('https://www.nolimitflix.com/auth?redirect=%2F', {}),
    'http://127.0.0.1:3000/api/auth/session'
  );
});

test('getRequestSessionToken falls back to bearer auth when cookie is absent', () => {
  assert.equal(
    getRequestSessionToken({
      cookieToken: null,
      authorizationHeader: 'Bearer mobile-token',
    }),
    'mobile-token'
  );
});

test('buildSessionVerificationHeaders forwards authorization when present', () => {
  const headers = buildSessionVerificationHeaders({
    cookieHeader: '',
    authorizationHeader: 'Bearer mobile-token',
  });

  assert.deepEqual(headers, {
    authorization: 'Bearer mobile-token',
  });
});

test('buildSessionVerificationHeaders falls back to bearer auth from the session token', () => {
  const headers = buildSessionVerificationHeaders({
    cookieHeader: '',
    authorizationHeader: '',
    sessionToken: 'cookie-token',
  });

  assert.deepEqual(headers, {
    authorization: 'Bearer cookie-token',
  });
});
