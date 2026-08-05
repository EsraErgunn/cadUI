import type { Id } from '../../core/model'

/**
 * Tesisat seçimi düz `Id[]`; mimarideki `SelectionItem[]` gibi tür alanı YOK —
 * tesisatta seçilebilen tek şey eleman. Tür çeşitlenirse (hat, ölçü) o zaman
 * mimarideki ayrık birleşime geçilir, şimdiden taşınmaz.
 */

/** Seçiliyse çıkarır, değilse ekler (Shift+tık). */
export function toggleElementId(ids: readonly Id[], id: Id): Id[] {
  if (ids.includes(id)) return ids.filter((current) => current !== id)
  return [...ids, id]
}

/** Shift ile çizilen çerçeve mevcut seçime EKLER; aynı id iki kez girmez. */
export function mergeElementIds(base: readonly Id[], addition: readonly Id[]): Id[] {
  const merged = [...base]
  for (const id of addition) {
    if (!merged.includes(id)) merged.push(id)
  }
  return merged
}

/** Silinen eleman seçimde asılı kalmasın: sahipsiz id sürüklemede var olmayanı taşır. */
export function pruneElementIds(ids: readonly Id[], existingIds: readonly Id[]): Id[] {
  return ids.filter((id) => existingIds.includes(id))
}
