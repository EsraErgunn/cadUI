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

  /** TODO(esra): POST /api/policies — uç VAR (`PolicyAddDto`), ekran henüz bağlanmadı. */
  policyCreate: 'POST /api/policies',
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
 * `policyList` KALKTI: `GET /api/policies` artık `ProjectId` OLMADAN da
 * çağrılabiliyor (backend a6ea695) ve ekran gerçek uca bağlandı.
 *
 * `policyAgencies` de KALKTI ama sebebi farklı — uç açıldığı için değil, ACENTE
 * KAVRAMI OLMADIĞI için: sunucuda poliçenin tek firma alanı
 * `InsuranceCompanyId`. Sihirbazdaki iki kutu tek kutuya indirildi; bu adla
 * yeni kod yazma.
 */

export type UnimplementedEndpoint = keyof typeof UNIMPLEMENTED_ENDPOINTS

/**
 * Bugün her çağrıda `false` döner; anahtar listeden kalkınca çağıran taraf
 * derlenmez. Sabit `false` yazılsaydı uç geldiğinde kimse fark etmezdi.
 */
export function isEndpointImplemented(endpoint: UnimplementedEndpoint): boolean {
  return !(endpoint in UNIMPLEMENTED_ENDPOINTS)
}
