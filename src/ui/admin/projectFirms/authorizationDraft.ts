import type { ProjectFirmAuthorizationPayload } from '../../../api/projectFirmForm'

/**
 * Yetkilendirmenin hedefi: bölge lisansına sahip bir GAZ DAĞITIM FİRMASI
 * ("AKSA-GEMLİK"). Coğrafi bölge DEĞİL — belge madde 14 ayrımı açıkça koyuyor:
 * "Gaz Dağıtım Firması" bölge lisanslı firmayı, "Grup Firması" ("AKSA") onun bir
 * üst seviyesini anlatıyor.
 *
 * Kod bir tur boyunca bunlara `region` demişti; coğrafi bölge kavramı sunucudan
 * tümüyle kalktığı için adlandırma artık gerçeği söylüyor. Arayüz etiketi
 * ("G.D Firması Bölgeleri") belgeden geldiği için AYNI kalıyor — bu ekran
 * kaldırılan bölge ucunu DEĞİL, grup süzgeçli `/api/gasdistributionfirms`'i
 * kullanıyor.
 */
export interface AuthorizationGasFirm {
  id: number
  /** Sunucunun ünvanı, OLDUĞU GİBİ ("Çedaş Tekirdağ Doğal Gaz Dağıtım A.Ş."). */
  name: string
}

export interface AuthorizationGroup {
  id: number
  name: string
}

/**
 * Etiket TÜRETİLMİYOR: kutularda ve çiplerde sunucunun ünvanı olduğu gibi
 * duruyor.
 *
 * Bir süre "GRUP-BÖLGE" biçimine indirgeniyordu (belge madde 17: "AKSA-ADANA").
 * Kural ünvanın ilk sözcüğünü alıyordu ve ünvan zaten grup adıyla başlayan
 * firmalarda ayırt eden parçayı YİYORDU: "Çedaş Tekirdağ Doğal Gaz Dağıtım
 * A.Ş." + grup "ÇEDAŞ" → yalnız "ÇEDAŞ". Aynı grubun iki firması kutuda
 * birbirinden ayırt edilemiyordu.
 */

/**
 * Eklenmiş bir yetkilendirme satırı.
 *
 * ASSUMPTION: Belge madde 20 "bir yetkilendirme kaydı" diyor ama gaz dağıtım
 * firması çoklu seçilebiliyor. Firma başına AYRI satır üretiliyor: belge "aynı
 * bölge ikinci kez eklenemez" ve "kayıtlar tek tek kaldırılabilir" diyor —
 * ikisi de firma bazlı kimlik istiyor. Tek satırda liste tutulsaydı "şunu
 * çıkar" satırı bölmek zorunda kalırdı.
 *
 * "Yeterlilik No" KALKTI (K102): kayıt iki ayrı numara taşıyordu (yeterlilik +
 * sertifika), sözleşmede karşılığı olan tek numara `certificateNumber` —
 * ikisini birden sormak kullanıcıya var olmayan bir ayrım yaptırıyordu.
 */
export interface ProjectFirmAuthorization {
  groupId: number
  groupName: string
  gasDistributionFirmId: number
  gasDistributionFirmName: string
  /** ZORUNLU: uç boş sertifika numarasını reddediyor (NotEmpty). */
  certificateNumber: string
  /** yyyy-aa-gg. Yetkinin geçerlilik başlangıcı; uçta zorunlu. */
  validFrom: string
  /** yyyy-aa-gg ya da null (süresiz). Doluysa başlangıçtan SONRA olmalı. */
  validTo: string | null
}

/** Yetkilendirme alt formunun hata metinleri (belgede yazmıyordu). */
export const AUTHORIZATION_ERRORS = {
  group: 'Grup firması seçiniz.',
  gasFirms: 'Gaz dağıtım firması seçiniz.',
  certificateNumber: 'Sertifika numarası zorunludur.',
  certificateNumberTaken:
    'Bu sertifika numarası başka bir gaz dağıtım firmasında kullanıldı.',
  validFrom: 'Geçerlilik başlangıcı zorunludur.',
  validToBeforeFrom: 'Geçerlilik bitişi başlangıçtan sonra olmalıdır.',
} as const

export interface AuthorizationDraft {
  group: AuthorizationGroup
  gasFirms: AuthorizationGasFirm[]
  certificateNumber: string
  validFrom: string
  validTo: string
}

/**
 * Sertifika numarası EKLENEN kayıtlar arasında benzersiz olmalı: numara bir
 * firma çiftinin yeterlilik belgesine ait, aynı numarayı iki bölgeye yazmak
 * belgeyi kopyalamak olurdu. Karşılaştırma kırpılmış ve harf büyüklüğünden
 * bağımsız — "st-1" ile "ST-1 " aynı belgedir.
 */
export function isCertificateNumberTaken(
  authorizations: readonly ProjectFirmAuthorization[],
  certificateNumber: string,
): boolean {
  const candidate = certificateNumber.trim().toLocaleUpperCase('tr')
  if (candidate === '') return false

  return authorizations.some(
    (authorization) =>
      authorization.certificateNumber.trim().toLocaleUpperCase('tr') === candidate,
  )
}

/** Aynı gaz dağıtım firması için ikinci yetkilendirme engellenir (belge madde 20). */
export function findDuplicateGasFirms(
  authorizations: readonly ProjectFirmAuthorization[],
  gasFirms: readonly AuthorizationGasFirm[],
): AuthorizationGasFirm[] {
  return gasFirms.filter((gasFirm) =>
    authorizations.some(
      (authorization) => authorization.gasDistributionFirmId === gasFirm.id,
    ),
  )
}

/**
 * Engelin SEBEBİNİ söyler: hangi kaydın zaten ekli olduğunu yazmasaydı, yirmi
 * kutu işaretleyen kullanıcı hangisini kaldıracağını bilemezdi.
 */
export function buildDuplicateGasFirmMessage(
  gasFirms: readonly AuthorizationGasFirm[],
): string {
  const names = gasFirms.map((gasFirm) => gasFirm.name).join(', ')
  return `Bu firmalar için yetkilendirme zaten eklendi: ${names}`
}

export function buildProjectFirmAuthorizations(
  draft: AuthorizationDraft,
): ProjectFirmAuthorization[] {
  const certificateNumber = draft.certificateNumber.trim()
  const validTo = draft.validTo.trim()

  return draft.gasFirms.map((gasFirm) => ({
    groupId: draft.group.id,
    groupName: draft.group.name,
    gasDistributionFirmId: gasFirm.id,
    gasDistributionFirmName: gasFirm.name,
    certificateNumber,
    validFrom: draft.validFrom,
    validTo: validTo === '' ? null : validTo,
  }))
}

/**
 * Taslağın kendi alanlarının doğrulaması. Grup/firma seçimi çağıranda kalıyor:
 * onlar listeye (`authorizations`) de bakmak zorunda, bunlar bakmıyor.
 */
export function validateAuthorizationFields(draft: {
  certificateNumber: string
  validFrom: string
  validTo: string
}): Partial<Record<'certificateNumber' | 'validFrom' | 'validTo', string>> {
  const errors: Partial<Record<'certificateNumber' | 'validFrom' | 'validTo', string>> = {}

  if (draft.certificateNumber.trim() === '') {
    errors.certificateNumber = AUTHORIZATION_ERRORS.certificateNumber
  }

  if (draft.validFrom === '') {
    errors.validFrom = AUTHORIZATION_ERRORS.validFrom
  } else if (draft.validTo !== '' && draft.validTo <= draft.validFrom) {
    // ISO tarihler dize olarak karşılaştırılabiliyor; Date nesnesi kurmak
    // saat dilimi kaymasını da işin içine sokardı.
    errors.validTo = AUTHORIZATION_ERRORS.validToBeforeFrom
  }

  return errors
}

export function removeAuthorization(
  authorizations: readonly ProjectFirmAuthorization[],
  gasDistributionFirmId: number,
): ProjectFirmAuthorization[] {
  return authorizations.filter(
    (authorization) => authorization.gasDistributionFirmId !== gasDistributionFirmId,
  )
}

/** Arayüz kaydı → istek gövdesi. Uç henüz yok; eşleme yine de tek yerde durur. */
export function toAuthorizationPayloads(
  authorizations: readonly ProjectFirmAuthorization[],
): ProjectFirmAuthorizationPayload[] {
  return authorizations.map((authorization) => ({
    gasDistributionFirmId: authorization.gasDistributionFirmId,
    gasDistributionFirmName: authorization.gasDistributionFirmName,
    certificateNumber: authorization.certificateNumber,
    validFrom: authorization.validFrom,
    validTo: authorization.validTo,
  }))
}
