import type { Id, ProjectData } from './model'
import type { SelectionItem } from './selection'
import type { PlanBounds } from './viewport'

/**
 * Kural kimlikleri. Numaralandırma dokümanın (hata-kontrol.docx) sırasını
 * izler; Hata3 (uygun olmayan mahal) ve Hata8 (kolon projesinde topraklanma)
 * BİLEREK YOK — ikisinin de veri karşılığı modelde yok (mahal TİPİ ve proje
 * TİPİ), varsayarak yazmak "çalışmış gibi görünen ama hiçbir şeyi denetlemeyen"
 * bir kural üretirdi (K79 dürüstlüğü). bkz. docs/api-eksikleri-hata-kontrol.md
 */
export const VALIDATION_RULE_IDS = [
  'architecturePlan',
  'installationPlan',
  'roomDoorAccess',
  'applianceBrandModel',
  'applianceInsideRoom',
  'lineTermination',
  'meterSubscriberInfo',
  'flueOutsideRoom',
  'roomVent',
] as const

export type ValidationRuleId = (typeof VALIDATION_RULE_IDS)[number]

/** Kullanıcıya görünen kural metinleri — doküman ne yazıyorsa birebir. */
export const VALIDATION_MESSAGES: Record<ValidationRuleId, string> = {
  architecturePlan: 'Mimari kat planı çizilmelidir.',
  installationPlan: 'Tesisat kat planı çizilmelidir.',
  roomDoorAccess: 'Tüm mahallere kapı açılmalıdır.',
  applianceBrandModel: 'Cihazlara marka ve model bilgisi eklenmelidir.',
  applianceInsideRoom: 'Cihazlar mahal dışında yer alamaz.',
  lineTermination: 'Hat bir tüketim elemanı ile sonlandırılmalıdır.',
  meterSubscriberInfo: 'Sayaçlara birim ve abone no bilgileri eklenmelidir.',
  flueOutsideRoom: 'Cihazın bacası mahal dışında olmalıdır.',
  roomVent: 'Cihazların bulunduğu mahallerde menfez nesnesi zorunludur.',
}

/**
 * "göster" düğmesinin hedefi. Görünüm de taşınıyor çünkü mimari hata tesisat
 * görünümündeyken, tesisat hatası mimari görünümündeyken bulunabilir — seçim
 * store'ları ayrı (`architectureUiStore` / `plumbingUiStore`) ve yanlış
 * görünümde yapılan seçim ekranda hiç görünmez.
 */
export type ValidationFocus =
  | { view: 'architecture'; selection: SelectionItem[]; bounds: PlanBounds }
  | { view: 'installation'; elementIds: Id[]; lineIds: Id[]; bounds: PlanBounds }

/**
 * Satırın kat/mahal/cihaz künyesi. Dokümandaki "Kat: 1. Kat  Mahal: X" ve
 * "Cihaz: Ocak" satırlarının karşılığı; hangisinin anlamlı olduğu kurala göre
 * değişir, bu yüzden hepsi opsiyonel.
 */
export type ValidationIssueLocation = {
  floorId: Id
  roomName?: string
  elementLabel?: string
}

export type ValidationIssue = {
  /**
   * Liste anahtarı. Kural + hedef nesne id'sinden üretilir, yani aynı hata
   * yeniden çalıştırmada AYNI anahtarı alır: React listeyi yeniden kurmaz ve
   * kullanıcının baktığı satır yerinden oynamaz.
   */
  key: string
  ruleId: ValidationRuleId
  message: string
  location: ValidationIssueLocation
  /** Gösterilecek bir nesne yoksa (kat planı hiç çizilmemişse) YOKTUR. */
  focus?: ValidationFocus
}

/**
 * Doğrulamanın girdisi. `ProjectData`'nın tamamı değil, yalnız kuralların
 * okuduğu alanlar: store'un tamamı geçilseydi alakasız bir alan değiştiğinde
 * de yeniden doğrulama tetiklenirdi.
 */
export type ValidationSource = Pick<
  ProjectData,
  | 'floors'
  | 'points'
  | 'walls'
  | 'openings'
  | 'rooms'
  | 'symbols'
  | 'installationElements'
  | 'installationLines'
  | 'installationConnections'
  | 'floorPipeLinks'
>
