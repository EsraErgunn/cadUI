import type { Id } from './model'

/**
 * Eski id → yeni id haritası. Çoğaltma (KK-11) ve kat kopyalama (KK-15) AYNI
 * yardımcıyı kullanır: iki ayrı yerde yazılsaydı biri bir referans alanını
 * unutur ve kopya sessizce kaynağa bağlı kalırdı (knowledge/floor-clone.md).
 */
export type IdRemap = ReadonlyMap<Id, Id>

export function createIdRemap(oldIds: Iterable<Id>, takeId: () => Id): IdRemap {
  const remap = new Map<Id, Id>()
  for (const oldId of oldIds) {
    // Aynı id iki kez gelirse (bir noktayı iki duvar paylaşıyor) TEK yeni id
    // üretilir; yoksa kopyada köşe ikiye ayrılır ve duvarlar kopuk görünür.
    if (!remap.has(oldId)) remap.set(oldId, takeId())
  }
  return remap
}

/**
 * Haritada olmayan referans HATA FIRLATIR, sessizce eski id'yi geçirmez.
 *
 * Naif kopyalama (JSON.parse(JSON.stringify)) referansları kaynağın id'lerinde
 * bırakır ve hata VERMEZ: alt kattaki duvar taşınınca üst kattaki kapı da
 * oynar. Assertion, o hatayı kopyalama anında görünür kılmak için var.
 */
export function remapId(remap: IdRemap, oldId: Id): Id {
  const newId = remap.get(oldId)
  if (newId === undefined) {
    throw new Error(`id remap eksik: ${oldId} için yeni id üretilmemiş`)
  }
  return newId
}
