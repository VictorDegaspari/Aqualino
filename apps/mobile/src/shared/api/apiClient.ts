import type {ApiEnvelope, ApiErrorBody} from '@aqualino/contracts';
import {API_BASE_URL} from '../config/environment';
import {AppError} from '../errors/AppError';
import {secureTokenStore} from '../security/secureTokenStore';

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  authenticated?: boolean;
  timeoutMs?: number;
  unwrapData?: boolean;
};

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = secureTokenStore.getCached();
  const headers = new Headers(options.headers);
  const {authenticated, body, signal, timeoutMs, unwrapData = true, ...requestOptions} = options;
  const timeoutController = timeoutMs ? new AbortController() : undefined;
  let didTimeout = false;
  const abortFromCaller = () => timeoutController?.abort();
  if (timeoutController && signal) {
    if (signal.aborted) abortFromCaller();
    else signal.addEventListener('abort', abortFromCaller);
  }
  const timeout = timeoutController
    ? setTimeout(() => {
      didTimeout = true;
      timeoutController.abort();
    }, timeoutMs)
    : undefined;
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');

  if (authenticated !== false && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: timeoutController?.signal ?? signal,
    });
  } catch {
    if (didTimeout) {
      throw new AppError('A conexão demorou demais. Tente novamente.', 'REQUEST_TIMEOUT');
    }
    throw new AppError('Não foi possível conectar. Seu registro ficará na fila.', 'NETWORK_UNAVAILABLE');
  } finally {
    if (timeout) clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | ApiErrorBody | null;

  if (!response.ok) {
    const apiError = payload && 'error' in payload ? payload.error : null;
    throw new AppError(
      apiError?.message ?? 'Algo deu errado. Tente novamente.',
      apiError?.code ?? 'HTTP_ERROR',
      response.status,
      apiError?.fields,
      apiError?.request_id,
    );
  }

  if (!payload || !('data' in payload)) {
    throw new AppError('A resposta do servidor é inválida.', 'INVALID_RESPONSE');
  }

  return unwrapData ? payload.data : payload as T;
}
