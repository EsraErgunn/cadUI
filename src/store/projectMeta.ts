import type { Id } from '../core/model'

export type ProjectMetaSlice = {
  nextUniqueId: Id
  /** Çizim verisi her değiştiğinde artar. Bkz. markDirty. */
  revision: number
  savedRevision: number
  markSaved: () => void
}

/**
 * cadStore.ts'ten AYRI dosya: veri slice'ları bu iki yardımcıyı çalışma zamanında
 * çağırmak zorunda. cadStore'dan alsalardı cadStore → slice → cadStore çalışma
 * zamanı döngüsü oluşur ve create() slice'ı henüz tanımlanmamış bulur
 * ("createArchitectureSlice is not a function"). floorSlice bunu yalnız tip
 * import ettiği için hiç yaşamadı.
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
 */
export function markDirty(draft: Pick<ProjectMetaSlice, 'revision'>): void {
  draft.revision += 1
}
