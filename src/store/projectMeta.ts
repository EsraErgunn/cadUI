import type { PersistedContent } from './persistedContent'
import type { Id } from '../core/model'

export type ProjectMetaSlice = {
  nextUniqueId: Id
  /** Çizim verisi her değiştiğinde artar. Bkz. markDirty. */
  revision: number
  /**
   * Son kaydetme/yükleme anındaki içerik. Kirli işareti buna karşı bakılır
   * (`selectIsProjectDirty`), sayaca değil — bkz. persistedContent.ts.
   */
  savedContent: PersistedContent
  markSaved: () => void
}

/**
 * cadStore.ts'ten AYRI dosya: veri slice'ları bu iki yardımcıyı çalışma zamanında
 * çağırmak zorunda. cadStore'dan alsalardı cadStore → slice → cadStore çalışma
 * zamanı döngüsü oluşur ve create() slice'ı henüz tanımlanmamış bulur
 * ("createArchitectureSlice is not a function"). floorSlice bunu yalnız tip
 * import ettiği için hiç yaşamadı. Kural: slice cadStore'dan SADECE `import type`.
 */

/**
 * Kalıcı id üretimi: immer draft'ı üzerinde çağrılır, id BİR KEZ üretilir.
 * crypto.randomUUID()/nanoid kullanılmaz — bkz. knowledge/id-scheme.md.
 */
export function takeNextId(draft: Pick<ProjectMetaSlice, 'nextUniqueId'>): Id {
  const id = draft.nextUniqueId
  draft.nextUniqueId += 1
  return id
}

/**
 * Çizim verisini değiştiren HER action bunu çağırır (issue 2.9: nesne ekleme,
 * silme, taşıma, özellik düzenleme, kat işlemleri).
 * Zoom/pan/araç/görünüm cadStore'da olmadığı için buraya hiç uğramaz.
 *
 * Sayaç artık kirli işaretini BELİRLEMEZ (bkz. persistedContent.ts): anlamı
 * "bir action gerçekten yazdı" — reddedilen işlemler (K13 geçersiz taşıma,
 * sığmayan yerleştirme) onu artırmaz ve testler bunu bu şekilde sınar.
 */
export function markDirty(draft: Pick<ProjectMetaSlice, 'revision'>): void {
  draft.revision += 1
}
