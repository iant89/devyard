/**
 * Typed client for `/api/v1` (plan §6). Request/response types and schemas come from
 * `@devyard/contracts`; responses are validated at runtime so a contract drift fails loudly.
 *
 * - Cookies carry the session (`credentials: 'same-origin'`).
 * - Unsafe methods send `X-CSRF-Token` (plan §5.5); the token comes from `AuthState.csrfToken`.
 * - Non-2xx responses become `ApiError` with the structured §17 error body.
 */
import {
  API_PREFIX,
  AuthState,
  ErrorResponse,
  SessionInfo,
  dataEnvelope,
  type ErrorCode,
  type LoginRequest,
  type BootstrapRequest,
} from '@devyard/contracts';
import { z } from 'zod';

export type BootstrapInput = z.input<typeof BootstrapRequest>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK' | 'BAD_RESPONSE';
  readonly requestId: string | undefined;
  readonly details: { path: string; message: string }[];

  constructor(
    status: number,
    code: ApiError['code'],
    message: string,
    requestId?: string,
    details: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
const UNSAFE: ReadonlySet<Method> = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export interface ApiClientOptions {
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Called on any 401 so the app can drop to the login screen (session expired/revoked). */
  onUnauthenticated?: () => void;
}

export const BootstrapStatus = dataEnvelope(z.object({ required: z.boolean() }));
const AuthEnvelope = dataEnvelope(AuthState);
const SessionsEnvelope = dataEnvelope(z.array(SessionInfo));

export class ApiClient {
  private csrfToken: string | null = null;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly unauthListeners = new Set<() => void>();

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? '') + API_PREFIX;
    this.fetchImpl = options.fetch ?? ((...args) => globalThis.fetch(...args));
    if (options.onUnauthenticated) this.unauthListeners.add(options.onUnauthenticated);
  }

  /** Subscribe to 401s (session expired/revoked). Returns an unsubscribe function. */
  onUnauthenticated(listener: () => void): () => void {
    this.unauthListeners.add(listener);
    return () => this.unauthListeners.delete(listener);
  }

  setCsrfToken(token: string | null): void {
    this.csrfToken = token;
  }

  async request<S extends z.ZodType>(
    method: Method,
    path: string,
    schema: S | null,
    body?: unknown,
  ): Promise<z.infer<S>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (UNSAFE.has(method) && this.csrfToken) headers['X-CSRF-Token'] = this.csrfToken;

    let res: Response;
    try {
      res = await this.fetchImpl(this.baseUrl + path, {
        method,
        headers,
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Could not reach the Devyard server.');
    }

    if (!res.ok) {
      const parsed = ErrorResponse.safeParse(await res.json().catch(() => null));
      if (res.status === 401) this.unauthListeners.forEach((l) => l());
      if (parsed.success) {
        const e = parsed.data.error;
        throw new ApiError(res.status, e.code, e.message, e.requestId, e.details ?? []);
      }
      throw new ApiError(
        res.status,
        res.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL',
        res.statusText || 'Request failed',
      );
    }

    if (schema === null || res.status === 204) return undefined as z.infer<S>;
    const parsed = schema.safeParse(await res.json().catch(() => null));
    if (!parsed.success)
      throw new ApiError(res.status, 'BAD_RESPONSE', 'Unexpected response from the server.');
    return parsed.data;
  }

  // ---- auth (plan §6.2) ----
  async bootstrapStatus(): Promise<{ required: boolean }> {
    return (await this.request('GET', '/auth/bootstrap', BootstrapStatus)).data;
  }
  async bootstrap(input: BootstrapInput): Promise<AuthState> {
    return this.adopt((await this.request('POST', '/auth/bootstrap', AuthEnvelope, input)).data);
  }
  async login(input: LoginRequest): Promise<AuthState> {
    return this.adopt((await this.request('POST', '/auth/login', AuthEnvelope, input)).data);
  }
  async me(): Promise<AuthState> {
    return this.adopt((await this.request('GET', '/auth/me', AuthEnvelope)).data);
  }
  async logout(): Promise<void> {
    try {
      await this.request('POST', '/auth/logout', null);
    } finally {
      this.csrfToken = null;
    }
  }
  async sessions(): Promise<SessionInfo[]> {
    return (await this.request('GET', '/auth/sessions', SessionsEnvelope)).data;
  }

  private adopt(state: AuthState): AuthState {
    this.csrfToken = state.csrfToken;
    return state;
  }
}
