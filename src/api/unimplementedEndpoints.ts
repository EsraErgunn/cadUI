/**
 * Sunucuda HENÜZ BULUNMAYAN uçlar — mock gövdeye düşme kararının TEK kaynağı.
 *
 * Doğru soru "`VITE_API_URL` tanımlı mı" (`hasApiBaseUrl`) DEĞİL, "bu uç var mı".
 * API kökü tanımlıyken de bu yollar 404 döner; `hasApiBaseUrl`'e bağlanan bir
 * ekran, backend ayaktayken sessizce boşalırdı.
 *
 * Uç açıldığında yapılacak iş mekanik: buradaki satırı SİL. Anahtar kalkınca
 * `isEndpointImplemented` çağrısı derleme hatası verir ve seni değiştirilecek
 * gövdeye götürür — bayrağı kaldırmayı unutmak mümkün değil.
 *
 * Beklenen sözleşme taslağı: docs/api-eksikleri-kullanicilar.md
 */
export const UNIMPLEMENTED_ENDPOINTS = {

  /** TODO(esra): GET /api/projects/{id}/zpd — ZetaCAD kaynak dosyası. */
  projectZpdFile: 'GET /api/projects/{id}/zpd',
  /** TODO(esra): GET /api/projects/{id}/report.pdf — PDF rapor üretimi yok. */
  projectPdfReport: 'GET /api/projects/{id}/report.pdf',
} as const

/**
 * KK-20 daraltması (yetki satırındaki proje firması listesi) burada DEĞİL ve
 * hiç olmadı: seçenekler mock değildi, artık daraltma da gerçek uçtan geliyor
 * (`GET /api/project-firm-authorizations?GasDistributionFirmId=`, K87).
 *
 * Poliçe uçlarının ÜÇÜ DE listeden kalktı (backend a6ea695):
 * - `policyList` — `GET /api/policies` artık `ProjectId` olmadan da çağrılıyor.
 * - `policyCreate` — `POST /api/policies` bağlandı.
 * - `policyAgencies` — sebebi farklı: uç açıldığı için değil, ACENTE KAVRAMI
 *   OLMADIĞI için. Poliçenin tek firma alanı `InsuranceCompanyId`; bu adla yeni
 *   tip, sorgu ya da uç ekleme.
 */

export type UnimplementedEndpoint = keyof typeof UNIMPLEMENTED_ENDPOINTS

/**
 * Bugün her çağrıda `false` döner; anahtar listeden kalkınca çağıran taraf
 * derlenmez. Sabit `false` yazılsaydı uç geldiğinde kimse fark etmezdi.
 */
export function isEndpointImplemented(endpoint: UnimplementedEndpoint): boolean {
  return !(endpoint in UNIMPLEMENTED_ENDPOINTS)
}
