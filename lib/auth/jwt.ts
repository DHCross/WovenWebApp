import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Development Bypass: If AUTH0_DOMAIN is missing, OR if it's set to a dummy value in dev, mock the auth flow.
// This allows the app to start (with dummy values) but still bypasses actual verification logic which would fail.
const IS_DEV = process.env.NODE_ENV === 'development';
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const IS_DUMMY_CONFIG = AUTH0_DOMAIN === 'dummy.auth0.com';

// Check for explicit disable flag
const AUTH_DISABLED_FLAG = process.env.NEXT_PUBLIC_ENABLE_AUTH === 'false';

const SKIP_AUTH = AUTH_DISABLED_FLAG || (IS_DEV && (!AUTH0_DOMAIN || IS_DUMMY_CONFIG));

if (SKIP_AUTH) {
  if (AUTH_DISABLED_FLAG) {
    console.log('[INFO] Auth globally disabled via NEXT_PUBLIC_ENABLE_AUTH=false');
  } else {
    console.warn('[WARN] Auth0 configuration missing or dummy in development. Authentication will be bypassed.');
  }
}

const client = SKIP_AUTH
  ? null
  : jwksClient({
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  });

function getKey(header: any, callback: any) {
  if (SKIP_AUTH || !client) {
    return callback(new Error('Auth skipped or client not initialized'));
  }
  client.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    const signingKey = (key as any).publicKey || (key as any).rsaPublicKey;
    callback(null, signingKey);
  });
}

const jwtVerifyOptions: jwt.VerifyOptions = {
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
};

function getMockUser() {
  // Use the first allowed email if configured, to ensure we pass the allowlist check
  const allowedEmails = process.env.ALLOWED_EMAILS;
  const mockEmail = allowedEmails ? allowedEmails.split(',')[0].trim() : 'dev@local.test';

  return {
    sub: 'dev-user',
    email: mockEmail,
    scope: 'openid profile email'
  };
}

export async function verifyToken(token: string) {
  if (SKIP_AUTH) {
    // Return a mock decoded token for development
    return Promise.resolve(getMockUser());
  }

  return new Promise<any>((resolve, reject) => {
    jwt.verify(token, getKey as any, jwtVerifyOptions, (err, decoded) => {
      if (err) {
        // Fallback in Dev if verification fails (e.g. expired token, bad config)
        if (IS_DEV) {
          console.warn(`[Auth] Token verification failed in development: ${err.message}. Falling back to mock user.`);
          return resolve(getMockUser());
        }
        return reject(err);
      }
      resolve(decoded as any);
    });
  });
}

export default verifyToken;
