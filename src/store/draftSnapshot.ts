import { isDraft } from 'immer'

/**
 * Draft diziyi düz veriye indirger; dizi zaten düzse olduğu gibi geçer.
 *
 * Neden gerekli: karesel çalışan graf aramaları (`findWallSplits`,
 * `findRoomFaces`) duvar ÇİFTİ başına özellik okuyor. Draft üzerinde koşarsa
 * her okuma immer proxy'sinden geçiyor. Ölçüm (40 duvarlık plan, 200 çağrı):
 * draft 372 ms, düz dizi 61 ms — 6.2 kat. Görüntü O(N) okumayla bir kez
 * alınınca karesel iş düz nesnelerde bitiyor.
 *
 * `isDraft` kontrolü ŞART, koşulsuz kopyalanmıyor: aynı üretici içinde
 * `draft.walls = draft.walls.filter(...)` gibi bir atama diziyi düz hâle
 * getiriyor (`deleteSelection`/`deleteWall` tam bunu yapıyor) ve o durumda
 * kopyalamak boşa iş olurdu.
 *
 * Sığ kopya YETERLİ: bu yolda geçen `Wall` ve `Point` düz kayıtlar, iç içe
 * nesne taşımıyorlar. immer'ın `current`'ı kullanılmadı çünkü imzası
 * (`Draft<T>` bekliyor) readonly dizilerle tip savaşına sokuyor ve düz değer
 * görünce hata fırlatıyor.
 */
export function toPlainSnapshot<T extends object>(items: readonly T[]): readonly T[] {
  return isDraft(items) ? items.map((item) => ({ ...item })) : items
}
