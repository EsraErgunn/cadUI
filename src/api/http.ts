import type { z } from 'zod'

/**
 * API kökü. VITE_ önekli her şey tarayıcıda görünür (CLAUDE.md güvenlik) —
 * burada yalnız public bir adres var, sır yok.
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Ağa hiç çıkılamadı (API kapalı, CORS, DNS). Status yok — 500 ile karışmasın. */
export class NetworkError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'NetworkError'
  }
}

export type RequestOptions = {
  signal?: AbortSignal
}

export type JsonRequest = RequestOptions & {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  /**
   * Hazır JSON METNİ — nesne DEĞİL. Kaydedilen çizim serialize.ts'in ürettiği
   * metnin aynısı olmalı; ikinci bir JSON.stringify alan sırasını değiştirip
   * "bit bit aynı" kabul testini anlamsızlaştırırdı.
   */
  rawJsonBody?: string
}

function buildUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new NetworkError('VITE_API_URL tanımlı değil — .env.local dosyasını oluşturun.')
  }
  return `${API_BASE_URL}${path}`
}

function isAbort(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError'
}

async function readErrorMessage(response: Response): Promise<string> {
  // Hata gövdesi { message } geliyor (BaseApiController.FromResult). 500 veya
  // vekil hatalarında HTML de gelebilir; o zaman genel mesaja düşülür.
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'message' in body) {
      const { message } = body as { message: unknown }
      if (typeof message === 'string' && message.length > 0) return message
    }
  } catch {
    // gövde JSON değil
  }

  return `Sunucu ${response.status} döndü.`
}

async function send(request: JsonRequest): Promise<Response> {
  let response: Response
  try {
    response = await fetch(buildUrl(request.path), {
      method: request.method,
      signal: request.signal,
      headers:
        request.rawJsonBody === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: request.rawJsonBody,
    })
  } catch (cause) {
    // AbortError çağıranın kendi iptali — sarılmaz, olduğu gibi geçer.
    if (isAbort(cause)) throw cause
    throw new NetworkError('Sunucuya ulaşılamadı.', { cause })
  }

  if (!response.ok) throw new ApiError(response.status, await readErrorMessage(response))
  return response
}

/**
 * Yanıt gövdesi şemadan GEÇMEDEN dönmez (CLAUDE.md güvenlik). Şema tutmazsa
 * sınırda patlar; sözleşme kayması bileşenin içinde "undefined is not an
 * object" olarak görünmesin.
 */
export async function requestJson<Schema extends z.ZodType>(
  request: JsonRequest,
  schema: Schema,
): Promise<z.infer<Schema>> {
  const response = await send(request)
  const parsed = schema.safeParse(await response.json())

  if (!parsed.success) {
    throw new ApiError(response.status, 'Sunucu beklenmeyen bir yanıt gövdesi döndürdü.')
  }

  return parsed.data
}

/** Presigned URL gibi API DIŞI bir adresten ham metin çeker. */
export async function fetchText(url: string, options?: RequestOptions): Promise<string> {
  let response: Response
  try {
    response = await fetch(url, { signal: options?.signal })
  } catch (cause) {
    if (isAbort(cause)) throw cause
    throw new NetworkError('Çizim dosyasına ulaşılamadı.', { cause })
  }

  if (!response.ok) {
    throw new ApiError(response.status, `Çizim dosyası indirilemedi (${response.status}).`)
  }

  return response.text()
}
