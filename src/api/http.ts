import type { z } from 'zod'

import { getAuthSession, setAuthSession } from './authToken'

/**
 * API kökü. VITE_ önekli her şey tarayıcıda görünür (CLAUDE.md güvenlik) —
 * burada yalnız public bir adres var, sır yok.
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

const UNAUTHORIZED = 401

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

function readText(source: Record<string, unknown>, key: string): string | null {
  const value = source[key]
  return typeof value === 'string' && value.trim() !== '' ? value : null
}

/**
 * ASP.NET model doğrulaması ProblemDetails'in `errors` alanını alan→mesajlar
 * sözlüğü olarak doldurur; `detail` boş kalır. İlk mesaj alınır: alan başına tek
 * satır göstermek, hata kutusuna sözlük dökmekten okunur.
 */
function readValidationMessage(body: Record<string, unknown>): string | null {
  const errors = body.errors
  if (!errors || typeof errors !== 'object') return null

  for (const messages of Object.values(errors)) {
    if (!Array.isArray(messages)) continue
    const first = messages.find((item) => typeof item === 'string' && item.trim() !== '')
    if (typeof first === 'string') return first
  }

  return null
}

/**
 * Hata gövdesi iki biçimde gelebiliyor:
 *
 * - Uygulamanın kendi hataları düz `{ message }` (BaseApiController.FromResult) —
 *   `POST /api/auth/login` geçersiz girişte bunu döndürüyor, doğrulandı.
 * - Çerçevenin ürettiği hatalar (model doğrulama, yetki, işlenmeyen istisna)
 *   ProblemDetails: `{ type, title, status, detail, errors }`.
 *
 * Sıra bilinçli: `message` en özel olan, `detail` ondan sonra, `title` genellikle
 * "One or more validation errors occurred." gibi İNGİLİZCE ve genel — o yüzden
 * alan bazlı mesajın arkasına düşüyor. 500 veya vekil hatalarında HTML de
 * gelebilir; hiçbiri tutmazsa genel Türkçe mesaja inilir.
 */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object') return `Sunucu ${response.status} döndü.`

    const record = body as Record<string, unknown>
    return (
      readText(record, 'message') ??
      readText(record, 'detail') ??
      readValidationMessage(record) ??
      readText(record, 'title') ??
      `Sunucu ${response.status} döndü.`
    )
  } catch {
    // gövde JSON değil
    return `Sunucu ${response.status} döndü.`
  }
}

/**
 * API fail-closed: [AllowAnonymous] olmayan HER uç token ister. Başlık burada,
 * tek yerde ekleniyor — her çağıranın hatırlaması gereken bir şey olsaydı biri
 * unutur ve o uç sessizce 401 dönerdi.
 */
function buildHeaders(request: JsonRequest): HeadersInit | undefined {
  const headers: Record<string, string> = {}

  if (request.rawJsonBody !== undefined) headers['Content-Type'] = 'application/json'

  const session = getAuthSession()
  if (session) headers.Authorization = `Bearer ${session.token}`

  return Object.keys(headers).length > 0 ? headers : undefined
}

async function send(request: JsonRequest): Promise<Response> {
  let response: Response
  try {
    response = await fetch(buildUrl(request.path), {
      method: request.method,
      signal: request.signal,
      headers: buildHeaders(request),
      body: request.rawJsonBody,
    })
  } catch (cause) {
    // AbortError çağıranın kendi iptali — sarılmaz, olduğu gibi geçer.
    if (isAbort(cause)) throw cause
    throw new NetworkError('Sunucuya ulaşılamadı.', { cause })
  }

  if (response.status === UNAUTHORIZED) {
    // Token süresi dolmuş ya da iptal edilmiş: elde tutmanın anlamı yok, atılır.
    // RequireAuth oturumun gidişini görüp girişe yönlendirir.
    setAuthSession(undefined)
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
