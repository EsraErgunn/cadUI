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
  /** TODO(esra): GET /api/insurancecompanies — sigorta şirketi listesi; tablo bile yok. */
  insuranceCompanies: 'GET /api/insurancecompanies',
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
