/**
 * Sahte verinin üretilip üretilmeyeceğine karar veren TEK yer.
 *
 * Mock YALNIZ geliştirme derlemesinde çalışır. Proje detayında alanların
 * çoğunun sunucuda karşılığı yok (K50); üretim derlemesinde uydurulmuş bir
 * kayıt gösterilseydi bir demoda gerçek sanılırdı. Üretimde ilgili bölüm veri
 * yerine "kaynağı yok" der — boş bölüm, sahte dolu bölümden iyidir.
 *
 * `isEndpointImplemented` ile karıştırma: o "uç var mı" sorusudur, bu "sahte
 * veri üretmeye iznimiz var mı". İkisi birlikte çalışır — uç yoksa VE
 * geliştirmedeysek mock; uç yoksa ve üretimdeysek boş.
 */
export function isMockDataAllowed(): boolean {
  return import.meta.env.DEV
}

/**
 * Verinin nereden geldiği. Arayüz bunu göstermek ZORUNDA: `mock` değerler
 * ayırt edilebilir bir işaretle çizilir, `unavailable` bölüm hiç veri
 * göstermez. Kaynağı taşımayan düz bir dönüş tipi, sahte veriyi gerçekten
 * ayırt edilemez yapardı.
 */
export type Sourced<T> =
  | { source: 'server'; data: T }
  | { source: 'mock'; data: T }
  | { source: 'unavailable'; data: null }

export function serverData<T>(data: T): Sourced<T> {
  return { source: 'server', data }
}

/**
 * Mock gövde. Üretici bir fonksiyon alır çünkü üretim derlemesinde sahte kayıt
 * HİÇ kurulmamalı — hazır nesne alsaydı değer yine de üretilir, yalnız
 * gösterilmezdi.
 */
export function mockedData<T>(build: () => T): Sourced<T> {
  if (!isMockDataAllowed()) return { source: 'unavailable', data: null }
  return { source: 'mock', data: build() }
}
