type JulesRequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type QueryValue = string | number | boolean | null | undefined;

type QueryRecord = Record<string, QueryValue>;

export interface JulesClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
  authHeaderName?: string;
  authScheme?: string | null;
  defaultHeaders?: Record<string, string>;
}

export interface JulesRequestOptions {
  method?: JulesRequestMethod;
  headers?: Record<string, string>;
  query?: QueryRecord;
  body?: unknown;
  signal?: AbortSignal;
}

interface ResolvedJulesClientConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  authHeaderName: string;
  authScheme: string | null;
  defaultHeaders: Record<string, string>;
}

export class JulesAPIError extends Error {
  constructor(message: string, public status: number, public payload?: unknown) {
    super(message);
    this.name = 'JulesAPIError';
  }
}

export class JulesClient {
  private readonly config: ResolvedJulesClientConfig;

  constructor(config: JulesClientConfig) {
    const timeout = typeof config.timeout === 'number' && Number.isFinite(config.timeout) ? config.timeout : 30000;
    const authHeaderName = config.authHeaderName?.trim() || 'X-Goog-Api-Key';
    const normalizedAuthScheme = config.authScheme === undefined ? null : config.authScheme;

    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeout,
      authHeaderName,
      authScheme: normalizedAuthScheme === null ? null : normalizedAuthScheme,
      defaultHeaders: {
        Accept: 'application/json',
        ...(config.defaultHeaders ?? {}),
      },
    };
  }

  async request<T>(path: string, options: JulesRequestOptions = {}): Promise<T> {
    const base = this.config.baseUrl.endsWith('/') ? this.config.baseUrl : `${this.config.baseUrl}/`;
    const url = new URL(path, base);

    if (options.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      ...this.config.defaultHeaders,
      ...(options.headers ?? {}),
    };

    if (this.config.authHeaderName && !headers[this.config.authHeaderName]) {
      const authValue = this.config.authScheme ? `${this.config.authScheme} ${this.config.apiKey}`.trim() : this.config.apiKey;
      headers[this.config.authHeaderName] = authValue;
    }

    const method = options.method ?? (options.body !== undefined ? 'POST' : 'GET');

    const requestInit: RequestInit = {
      method,
      headers,
      signal: options.signal ?? AbortSignal.timeout(this.config.timeout),
    };

    if (options.body !== undefined) {
      if (typeof options.body === 'string') {
        requestInit.body = options.body;
      } else {
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
        requestInit.body = JSON.stringify(options.body);
      }
    }

    const response = await fetch(url, requestInit);

    const raw = await response.text();
    let payload: unknown = raw.length === 0 ? null : raw;

    if (raw.length > 0) {
      try {
        payload = JSON.parse(raw);
      } catch (error) {
        payload = raw;
      }
    }

    if (!response.ok) {
      throw new JulesAPIError(
        `Jules API request failed: ${response.status} ${response.statusText}`,
        response.status,
        payload
      );
    }

    return payload as T;
  }

  async get<T>(path: string, options: Omit<JulesRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, body?: unknown, options: Omit<JulesRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  async put<T>(path: string, body?: unknown, options: Omit<JulesRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  async patch<T>(path: string, body?: unknown, options: Omit<JulesRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  async delete<T>(path: string, options: Omit<JulesRequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export function createJulesClientFromEnv(): JulesClient {
  const apiKey = process.env.JULES_API_KEY;
  if (!apiKey) {
    throw new Error('JULES_API_KEY environment variable is required');
  }

  const baseUrl = process.env.JULES_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('JULES_API_BASE_URL environment variable is required');
  }

  const timeoutValue = process.env.JULES_API_TIMEOUT;
  const timeout = timeoutValue ? Number(timeoutValue) : undefined;
  if (timeoutValue && Number.isNaN(timeout)) {
    throw new Error('JULES_API_TIMEOUT must be a number');
  }

  const authHeader = process.env.JULES_AUTH_HEADER?.trim();
  const authSchemeValue = process.env.JULES_AUTH_SCHEME?.trim();
  const authScheme = authSchemeValue
    ? authSchemeValue.toLowerCase() === 'none'
      ? null
      : authSchemeValue
    : undefined;

  return new JulesClient({
    apiKey,
    baseUrl,
    timeout,
    authHeaderName: authHeader || undefined,
    authScheme,
  });
}

export interface JulesSessionSourceContext {
  source: string;
  githubRepoContext?: {
    startingBranch?: string;
  };
}

export interface JulesCreateSessionRequest {
  prompt: string;
  sourceContext: JulesSessionSourceContext;
  automationMode?: string;
  title?: string;
}

export interface JulesSessionResponse {
  name: string;
  state?: string;
  createTime?: string;
  updateTime?: string;
  [key: string]: unknown;
}

export async function createJulesSession(
  client: JulesClient,
  payload: JulesCreateSessionRequest,
  options: Omit<JulesRequestOptions, 'method' | 'body'> = {}
): Promise<JulesSessionResponse> {
  return client.post<JulesSessionResponse>('v1alpha/sessions', payload, options);
}
