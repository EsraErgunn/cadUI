import { ApiError } from '../api/http'

/** Ağ/sunucu hatasında toplam deneme sayısı: ilk istek + bu kadar tekrar. */
export const MAX_QUERY_RETRIES = 2

const CLIENT_ERROR_MIN = 400
const CLIENT_ERROR_MAX = 499

/**
 * TanStack Query'nin tekrar deneme kuralı.
 *
 * 4xx TEKRARLANMAZ. Kütüphanenin varsayılanı her hatayı üç kez deniyor; 400
 * "doğrulama hatası", 403 "yetkin yok" ve 404 "kayıt yok" aynı istekle aynı
 * yanıtı vereceği için iki istek boşa gidiyor — kullanıcı hatayı üç kat
 * gecikmeyle görüyor, sunucu gereksiz yük alıyordu. 401 de burada: oturum zaten
 * `http.ts` tarafından düşürülüyor, tekrar denemek girişe yönlendirmeyi
 * geciktirmekten başka işe yaramaz.
 *
 * 5xx ve ağ hatası (`NetworkError`, `ApiError` DEĞİL) geçici olabilir; onlar
 * tekrar deneniyor.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (
    error instanceof ApiError &&
    error.status >= CLIENT_ERROR_MIN &&
    error.status <= CLIENT_ERROR_MAX
  ) {
    return false
  }

  return failureCount < MAX_QUERY_RETRIES
}
