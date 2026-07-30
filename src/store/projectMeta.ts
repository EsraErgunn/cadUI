import { type Id } from '../core/model'

export type ProjectMetaSlice = {
  nextUniqueId: Id
  /** Çizim verisi her değiştiğinde artar. Bkz. markDirty. */
  revision: number
  savedRevision: number
  markSaved: () => void
}

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
 * Zoom/pan/araç/görünüm bu store'da olmadığı için buraya hiç uğramaz.
 */
export function markDirty(draft: Pick<ProjectMetaSlice, 'revision'>): void {
  draft.revision += 1
}
