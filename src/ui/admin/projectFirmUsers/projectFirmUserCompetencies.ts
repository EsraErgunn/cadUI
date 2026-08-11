import type {
  AuthorityType,
  ProjectFirmUserCompetency,
  ProjectFirmUserCompetencyPayload,
} from '../../../api/projectFirmUserDto'

/**
 * Formdaki bir yetki satırı — henüz tamamlanmamış olabilir, bu yüzden alanlar
 * `null` başlar.
 *
 * `key` satırın YEREL anahtarı (React key + hedefleme): yeni satırın kalıcı
 * kimliği sunucudan gelecek, o gelene kadar diziyi indeksle anahtarlamak
 * satır silinince yanlış satırı yeniden kullandırırdı (knowledge/id-scheme.md).
 * Kaydedilmiş satırın kimliği ayrıca `competencyId`'de duruyor.
 */
export interface CompetencyDraft {
  key: number
  competencyId: number | null
  gasFirmId: number | null
  projectFirmId: number | null
  authorityType: AuthorityType | null
  gdfRegistrationNumber: string
  isActive: boolean
}

export const COMPETENCY_ERRORS = {
  /** Belge madde 15 / KK-19'daki bilgilendirme kutusunun metni, birebir. */
  required: 'Kullanıcının en az 1 (bir) yetkisi tanımlı olmalıdır.',
  incompleteRow: 'Yeni satır eklemeden önce açık satırdaki zorunlu seçimleri tamamlayın.',
  duplicate:
    'Bu gaz dağıtım firması ve proje firması ikilisi için zaten bir yetki satırı var.',
} as const

/**
 * Zorunlu seçimler: gaz dağıtım firması, proje firması ve yetki (KK-19).
 * "GDF Kayıt No" zorunlu DEĞİL — listede değeri olmayan kayıtlar "—" ile
 * gösteriliyor (KK-9), yani boş kalabildiği belgeden okunuyor.
 */
export function isCompetencyComplete(row: CompetencyDraft): boolean {
  return row.gasFirmId !== null && row.projectFirmId !== null && row.authorityType !== null
}

/** Açık satırdaki zorunlu seçimler tamamlanmadan yeni satır eklenmez (KK-19). */
export function canAddCompetency(rows: readonly CompetencyDraft[]): boolean {
  return rows.every(isCompetencyComplete)
}

/**
 * Aynı (gaz dağıtım firması, proje firması) ikilisini taşıyan BAŞKA satır var mı
 * (KK-22). Satırın kendisi hariç tutuluyor: kullanıcı kendi satırını
 * "yinelenen" diye görmemeli.
 */
export function findDuplicateCompetencyKey(
  rows: readonly CompetencyDraft[],
  row: CompetencyDraft,
): number | null {
  if (row.gasFirmId === null || row.projectFirmId === null) return null

  const duplicate = rows.find(
    (candidate) =>
      candidate.key !== row.key &&
      candidate.gasFirmId === row.gasFirmId &&
      candidate.projectFirmId === row.projectFirmId,
  )

  return duplicate?.key ?? null
}

/** Yinelenen ikili taşıyan satırların anahtarları; kaydetmeyi engeller (KK-22). */
export function findDuplicateCompetencyKeys(rows: readonly CompetencyDraft[]): number[] {
  return rows.filter((row) => findDuplicateCompetencyKey(rows, row) !== null).map((row) => row.key)
}

/**
 * Gaz dağıtım firması değişince proje firması seçimi TEMİZLENİR (KK-20): eski
 * seçim yeni firmanın yetkili listesinde olmayabilir ve ekranda geçerliymiş
 * gibi durup sessizce yanlış kayıt üretirdi.
 */
export function withGasFirm(row: CompetencyDraft, gasFirmId: number | null): CompetencyDraft {
  if (row.gasFirmId === gasFirmId) return row
  return { ...row, gasFirmId, projectFirmId: null }
}

export function buildEmptyCompetency(key: number): CompetencyDraft {
  return {
    key,
    competencyId: null,
    gasFirmId: null,
    projectFirmId: null,
    authorityType: null,
    gdfRegistrationNumber: '',
    // Belge madde 16: satırdaki anahtar varsayılan olarak açık gelir.
    isActive: true,
  }
}

/** Güncelleme ekranı: kayıtlı yetkiler forma taslak olarak açılır (KK-25). */
export function toCompetencyDrafts(
  competencies: readonly ProjectFirmUserCompetency[],
): CompetencyDraft[] {
  return competencies.map((competency) => ({
    key: competency.id,
    competencyId: competency.id,
    gasFirmId: competency.gasFirm.id,
    projectFirmId: competency.projectFirm.id,
    authorityType: competency.authorityType,
    gdfRegistrationNumber: competency.gdfRegistrationNumber ?? '',
    isActive: competency.isActive,
  }))
}

/**
 * Taslak satırlar → istek gövdesi. Yalnız TAMAMLANMIŞ satırlar çevrilir;
 * çağıran zaten eksik satırla kaydetmeye izin vermiyor, bu ikinci savunma
 * hattı `null` alanların gövdeye sızmasını tip düzeyinde engelliyor.
 */
export function toCompetencyPayloads(
  rows: readonly CompetencyDraft[],
): ProjectFirmUserCompetencyPayload[] {
  return rows.flatMap((row) => {
    if (row.gasFirmId === null || row.projectFirmId === null || row.authorityType === null) {
      return []
    }

    const registrationNumber = row.gdfRegistrationNumber.trim()

    return [
      {
        gasDistributionFirmId: row.gasFirmId,
        projectFirmId: row.projectFirmId,
        authorityType: row.authorityType,
        gdfRegistrationNumber: registrationNumber === '' ? null : registrationNumber,
        isActive: row.isActive,
      },
    ]
  })
}
