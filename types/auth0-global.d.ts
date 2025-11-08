export {};

declare global {
  interface Auth0Client {
    isAuthenticated: () => Promise<boolean>;
    handleRedirectCallback: () => Promise<void>;
    loginWithRedirect: (options?: {
      authorizationParams?: Record<string, any>;
      [key: string]: any;
    }) => Promise<void>;
    getUser: () => Promise<any>;
    logout?: (options?: {
      logoutParams?: Record<string, any>;
      [key: string]: any;
    }) => Promise<void>;
  }

  interface Auth0ClientOptions {
    domain: string;
    clientId: string;
    cacheLocation?: 'memory' | 'localstorage';
    useRefreshTokens?: boolean;
    useRefreshTokensFallback?: boolean;
    authorizationParams?: Record<string, any>;
    [key: string]: any;
  }

  interface Window {
    createAuth0Client?: (config: Auth0ClientOptions) => Promise<Auth0Client>;
    auth0?: {
      createAuth0Client?: (config: Auth0ClientOptions) => Promise<Auth0Client>;
    };
  }
}
