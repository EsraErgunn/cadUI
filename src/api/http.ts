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

  /**
   * Hata yanıtının AYRIŞTIRILMIŞ gövdesi (JSON değilse `undefined`).
   *
   * Çoğu uçta hata gövdesi `{ message }` ve `message` alanı zaten yeterli. Ama
   * bazı uçlarda hatanın KENDİSİ istemcinin işleyeceği veriyi taşıyor — örneğin
   * `POST /api/projects/{id}/submit` eksik evrak listesini 400 ile döndürüyor.
   * Gövde burada tutulmasaydı çağıranın onu okumak için isteği ikinci kez
   * atmaktan başka yolu olmazdı.
   */
  readonly body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
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

/**
 * API kökü tanımlı mı? Gerçek uca bağlanmış modüller bunu sorup mock gövdeye
 * düşebilir: backend ayakta değilken (veya `.env.local` yokken) ekranın komple
 * ölmesi yerine mock veriyle çalışmaya devam eder.
 */
export function hasApiBaseUrl(): boolean {
  return API_BASE_URL !== ''
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
/**
 * Hata yanıtından hem KULLANICIYA gösterilecek metni hem de ham gövdeyi çıkarır.
 * Gövde tek seferde okunuyor: `Response` gövdesi bir kez tüketilebiliyor, mesaj
 * ve gövde için ayrı ayrı okunamazdı.
 */
async function readErrorPayload(response: Response): Promise<{ message: string; body: unknown }> {
  const fallback = `Sunucu ${response.status} döndü.`

  try {
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object') return { message: fallback, body }

    const record = body as Record<string, unknown>
    const message =
      readText(record, 'message') ??
      readText(record, 'detail') ??
      readValidationMessage(record) ??
      readText(record, 'title') ??
      fallback

    return { message, body }
  } catch {
    // gövde JSON değil
    return { message: fallback, body: undefined }
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

  if (!response.ok) {
    const { message, body } = await readErrorPayload(response)
    throw new ApiError(response.status, message, body)
  }
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

/**
 * Gövdesi OLMAYAN başarı yanıtları için (`PUT`/`DELETE` → 200, boş gövde).
 *
 * `requestJson` burada KULLANILAMAZ: boş gövdede `response.json()` bir
 * `SyntaxError` fırlatır, o da `ApiError` olmadığı için çağıran tarafta genel
 * hataya düşer — yani işlem sunucuda BAŞARILIYKEN kullanıcı "kaydedilemedi"
 * görürdü. Durum kodu denetimi ve 401'de oturumun düşmesi `send`'de olduğu gibi
 * çalışmaya devam eder.
 */
export async function requestVoid(request: JsonRequest): Promise<void> {
  await send(request)
}

export type FormRequest = RequestOptions & {
  path: string
  form: FormData
}

/**
 * Multipart yükleme (`POST`). `requestJson`'dan ayrı çünkü `Content-Type`
 * ELLE YAZILAMAZ: `multipart/form-data` başlığı sınır (boundary) belirteci
 * taşıyor ve onu yalnız tarayıcı üretebiliyor. Başlığı kendimiz koysaydık
 * sunucu gövdeyi ayrıştıramazdı.
 *
 * Yetki başlığı ve hata/oturum kuralları JSON isteğiyle AYNI: gövde
 * oluşturmayı `send` üstleniyor.
 */
export async function uploadForm<TSchema extends z.ZodType>(
  request: FormRequest,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  const session = getAuthSession()

  let response: Response
  try {
    response = await fetch(buildUrl(request.path), {
      method: 'POST',
      signal: request.signal,
      headers: session ? { Authorization: `Bearer ${session.token}` } : undefined,
      body: request.form,
    })
  } catch (cause) {
    if (isAbort(cause)) throw cause
    throw new NetworkError('Sunucuya ulaşılamadı.', { cause })
  }

  if (response.status === UNAUTHORIZED) setAuthSession(undefined)

  if (!response.ok) {
    const { message, body } = await readErrorPayload(response)
    throw new ApiError(response.status, message, body)
  }

  return schema.parse(await response.json())
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
