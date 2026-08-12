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
  /** TODO(esra): GET /api/projectfirmusers?page&pageSize&q&authorityType&onlyActive */
  firmUserList: 'GET /api/projectfirmusers',
  /** TODO(esra): GET /api/projectfirmusers/{id} — güncelleme ekranını besleyecek. */
  firmUserDetail: 'GET /api/projectfirmusers/{id}',
  /** TODO(esra): POST /api/projectfirmusers — `auth/register` bu gövdeyi taşımıyor. */
  firmUserCreate: 'POST /api/projectfirmusers',
  /** TODO(esra): PUT /api/projectfirmusers/{id} — şifre boşsa değişmez (KK-25). */
  firmUserUpdate: 'PUT /api/projectfirmusers/{id}',
  /** TODO(esra): GET /api/projectfirmusers/availability?email&username&excludeUserId */
  firmUserAvailability: 'GET /api/projectfirmusers/availability',

  /**
   * Proje detayı — `GET /api/projects/{id}` VAR ama yalnız ad/kod/adres/tarih
   * döndürüyor. Durum, tesisat no, proje/ısınma tipi, müstakil, ruhsat, firma
   * mühendisi, onay bilgileri ve teknik değerler ayrı bir uç ister.
   * TODO(esra): GET /api/projects/{id}/detail
   */
  projectDetailExtras: 'GET /api/projects/{id}/detail',
  /** TODO(esra): GET /api/projects/{id}/units — ProjectUnit + Device entity'leri VAR, controller yok. */
  projectUnits: 'GET /api/projects/{id}/units',
  /** TODO(esra): GET /api/projects/{id}/operation-history — OperationHistory entity'si VAR. */
  projectHistory: 'GET /api/projects/{id}/operation-history',
  /** TODO(esra): GET /api/projects/{id}/docs — Doc + ProjectDoc entity'leri VAR. */
  projectDocuments: 'GET /api/projects/{id}/docs',
  /** TODO(esra): GET /api/projects/{id}/policies — Policy entity'si ProjectUnit'e bağlı. */
  projectPolicies: 'GET /api/projects/{id}/policies',
  /** TODO(esra): POST /api/projects/{id}/decision — onay/ret/revizyon; onay kodu üretir. */
  projectDecision: 'POST /api/projects/{id}/decision',
  /** TODO(esra): GET /api/projects/{id}/zpd — ZetaCAD kaynak dosyası. */
  projectZpdFile: 'GET /api/projects/{id}/zpd',
  /** TODO(esra): GET /api/projects/{id}/plan.dwg — sunucuda DWG üretimi yok. */
  projectPlanDwg: 'GET /api/projects/{id}/plan.dwg',
  /** TODO(esra): GET /api/projects/{id}/report.pdf — PDF rapor üretimi yok. */
  projectPdfReport: 'GET /api/projects/{id}/report.pdf',
} as const

/**
 * Burada OLMAYAN bir eksik: yetki satırındaki proje firması listesini seçilen
 * G.D. firmasına göre daraltan uç (KK-20). Bayrak tutulmuyor çünkü seçenekler
 * MOCK DEĞİL — `GET /api/projectfirms` gerçek listesi gösteriliyor, yalnız
 * daraltılamıyor. Daraltmayı veren uç açıldığında `getAuthorizedProjectFirms`
 * imzası değişmeden süzme sunucuya geçer.
 */

export type UnimplementedEndpoint = keyof typeof UNIMPLEMENTED_ENDPOINTS

/**
 * Bugün her çağrıda `false` döner; anahtar listeden kalkınca çağıran taraf
 * derlenmez. Sabit `false` yazılsaydı uç geldiğinde kimse fark etmezdi.
 */
export function isEndpointImplemented(endpoint: UnimplementedEndpoint): boolean {
  return !(endpoint in UNIMPLEMENTED_ENDPOINTS)
}
