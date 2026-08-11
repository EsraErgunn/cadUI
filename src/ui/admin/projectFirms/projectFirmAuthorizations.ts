import type { ProjectFirmAuthorizationPayload } from '../../../api/projectFirmForm'

/**
 * Yetkilendirmenin hedefi: bölge lisansına sahip bir GAZ DAĞITIM FİRMASI
 * ("AKSA-GEMLİK"). Coğrafi bölge DEĞİL — belge madde 14 ayrımı açıkça koyuyor:
 * "Gaz Dağıtım Firması" bölge lisanslı firmayı, "Grup Firması" ("AKSA") onun bir
 * üst seviyesini anlatıyor.
 *
 * Kod bir tur boyunca bunlara `region` demişti; arayüz etiketi ("G.D Firması
 * Bölgeleri") belgeden geldiği için AYNI kalıyor, adlandırma ise gerçeği
 * söylüyor (docs/kararlar.md K31).
 */
export interface AuthorizationGasFirm {
  id: number
  /** Sunucunun ham ünvanı değil, `formatAuthorizationGasFirmName` etiketi. */
  name: string
}

export interface AuthorizationGroup {
  id: number
  name: string
}

/**
 * Adın ayırt eden İLK sözcüğü, Türkçe büyük harfle. Kalanı ("Doğalgaz Dağıtım
 * A.Ş.", "Enerji Grubu") her kayıtta tekrar eden tür eki, etikette bilgi taşımaz.
 *
 * Yerel ayar `tr` şart: `'i'.toUpperCase()` 'I' verir, "İzmir" → "IZMIR" yazardı.
 */
function toLabelWord(value: string): string {
  const [firstWord = ''] = value.trim().split(/\s+/)
  return firstWord.toLocaleUpperCase('tr')
}

/**
 * Onay kutusunun etiketi belgedeki biçimde: "AKSA-ADANA" (grup + bölge,
 * belge madde 17).
 *
 * Sunucu ünvanı bölgeyi tek başına söylemiyor ("Adana Doğalgaz Dağıtım A.Ş.");
 * grup adı ("Aksa Enerji Grubu") ile birleşince belgenin örneklediği ada varıyor.
 * Ünvan ZATEN bu biçimdeyse grup öneki ikinci kez eklenmez — gerçek veride
 * kayıtlar "AKSA-GEMLİK" olarak duruyor, "AKSA-AKSA-GEMLİK" çıkardı.
 */
export function formatAuthorizationGasFirmName(firm: {
  name: string
  groupName: string | null
}): string {
  const region = toLabelWord(firm.name)
  const group = firm.groupName === null ? '' : toLabelWord(firm.groupName)

  if (group === '' || region === '') return region === '' ? group : region
  if (region === group || region.startsWith(`${group}-`)) return region

  return `${group}-${region}`
}

/**
 * Eklenmiş bir yetkilendirme satırı.
 *
 * ASSUMPTION: Belge madde 20 "bir yetkilendirme kaydı" diyor ama gaz dağıtım
 * firması çoklu seçilebiliyor. Firma başına AYRI satır üretiliyor (tek "Ekle"
 * tıklaması N firma seçiliyse N satır doğurur): belge "aynı bölge ikinci kez
 * eklenemez" ve "kayıtlar tek tek kaldırılabilir" diyor — ikisi de firma bazlı
 * kimlik istiyor. Tek satırda liste tutulsaydı "şunu çıkar" satırı bölmek
 * zorunda kalırdı.
 */
export interface ProjectFirmAuthorization {
  groupId: number
  groupName: string
  gasDistributionFirmId: number
  gasDistributionFirmName: string
  qualificationNumber: string
  certificateNumber: string | null
}

/** Yetkilendirme alt formunun hata metinleri (belgede yazmıyordu). */
export const AUTHORIZATION_ERRORS = {
  group: 'Grup firması seçiniz.',
  gasFirms: 'En az bir bölge seçiniz.',
  qualificationNumber: 'Yeterlilik no zorunludur.',
} as const

export interface AuthorizationDraft {
  group: AuthorizationGroup
  gasFirms: AuthorizationGasFirm[]
  qualificationNumber: string
  certificateNumber: string
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
  return `Bu bölgeler için yetkilendirme zaten eklendi: ${names}`
}

export function buildProjectFirmAuthorizations(
  draft: AuthorizationDraft,
): ProjectFirmAuthorization[] {
  const certificateNumber = draft.certificateNumber.trim()

  return draft.gasFirms.map((gasFirm) => ({
    groupId: draft.group.id,
    groupName: draft.group.name,
    gasDistributionFirmId: gasFirm.id,
    gasDistributionFirmName: gasFirm.name,
    qualificationNumber: draft.qualificationNumber.trim(),
    certificateNumber: certificateNumber === '' ? null : certificateNumber,
  }))
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
    qualificationNumber: authorization.qualificationNumber,
    certificateNumber: authorization.certificateNumber,
  }))
}
