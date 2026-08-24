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

  /** TODO(esra): GET /api/insurancecompanies/{id}/agencies — şirkete bağlı acenteler. */
  policyAgencies: 'GET /api/insurancecompanies/{id}/agencies',
  /** TODO(esra): POST /api/projects/{id}/policies — `Policy` entity'si VAR, controller yok;
      poliçe numarası benzersizliği 409 dönmeli (bugün kontrol istemcide). */
  policyCreate: 'POST /api/projects/{id}/policies',
  /** TODO(esra): GET /api/policies?page&pageSize&q&insuranceCompanyId&sort&dir —
      bütün projelerin poliçeleri; satır proje künyesini de taşımalı. */
  policyList: 'GET /api/policies',
  /** TODO(esra): GET /api/projects/{id}/zpd — ZetaCAD kaynak dosyası. */
  projectZpdFile: 'GET /api/projects/{id}/zpd',
  /** TODO(esra): GET /api/projects/{id}/report.pdf — PDF rapor üretimi yok. */
  projectPdfReport: 'GET /api/projects/{id}/report.pdf',
} as const

/**
 * KK-20 daraltması (yetki satırındaki proje firması listesi) burada DEĞİL ve
 * hiç olmadı: seçenekler mock değildi, artık daraltma da gerçek uçtan geliyor
 * (`GET /api/project-firm-authorizations?GasDistributionFirmId=`, K87).
 */

export type UnimplementedEndpoint = keyof typeof UNIMPLEMENTED_ENDPOINTS

/**
 * Bugün her çağrıda `false` döner; anahtar listeden kalkınca çağıran taraf
 * derlenmez. Sabit `false` yazılsaydı uç geldiğinde kimse fark etmezdi.
 */
export function isEndpointImplemented(endpoint: UnimplementedEndpoint): boolean {
  return !(endpoint in UNIMPLEMENTED_ENDPOINTS)
}
