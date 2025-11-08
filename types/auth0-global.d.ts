import type { Auth0Client, Auth0ClientOptions } from '@auth0/auth0-spa-js';

declare global {
  interface Window {
    createAuth0Client?: (config: Auth0ClientOptions) => Promise<Auth0Client>;
    auth0?: {
      createAuth0Client?: (config: Auth0ClientOptions) => Promise<Auth0Client>;
    };
  }
}

export {};
