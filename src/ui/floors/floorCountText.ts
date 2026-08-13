import type { FloorContentCounts } from '../../core/floorContent'

/** "14 duvar · 4 mahal · 6 kapı" — sıfır olan tür hiç yazılmaz. */
function joinCounts(entries: readonly (readonly [number, string])[]): string {
  const written = entries.filter(([count]) => count > 0).map(([count, noun]) => `${count} ${noun}`)
  return written.length > 0 ? written.join(' · ') : 'yok'
}

export function formatArchitectureCounts(counts: FloorContentCounts): string {
  return joinCounts([
    [counts.wallCount, 'duvar'],
    [counts.roomCount, 'mahal'],
    [counts.doorCount, 'kapı'],
    [counts.windowCount, 'pencere'],
    [counts.symbolCount, 'sembol'],
    // Merdiven/kolon/baca şaftı/kolon havalandırması tek kalemde: dört türü ayrı
    // yazmak satırı kullanılamaz hale getiriyordu. Düşey eksen olanlar ayrıca
    // kendi uyarısında adıyla anılıyor (KK-13).
    [counts.areaObjectCount, 'alan nesnesi'],
    // Kiriş alan nesnesi DEĞİL (çizgisel, ayrı model) — kendi kalemi olarak yazılır.
    [counts.beamCount, 'kiriş'],
  ])
}

/**
 * Düşey eksende süren alan nesneleri. İki sunum var çünkü iki yer farklı
 * cümle kuruyor: kopyalama özeti kardeş satırlarla aynı ayracı ister ve
 * boşken "yok" yazar, silme uyarısı ise cümlenin içinde geçer ("Bu katta …
 * bulunuyor") ve yalnız sayı sıfırdan büyükken çağrılır. Kalemler tek yerde
 * dursun diye ayrı değil, aynı listeden türüyorlar.
 */
function verticalAxisEntries(counts: FloorContentCounts): readonly [number, string][] {
  return [
    [counts.flueShaftCount, 'baca şaftı'],
    [counts.columnVentilationCount, 'kolon havalandırması'],
  ]
}

/** Kopyalama özetindeki "Düşey" satırı (madde 15). */
export function formatVerticalAxisCounts(counts: FloorContentCounts): string {
  return joinCounts(verticalAxisEntries(counts))
}

/** "1 baca şaftı ve 1 kolon havalandırması" — silme uyarısının içinde (KK-13). */
export function describeVerticalAxis(counts: FloorContentCounts): string {
  return verticalAxisEntries(counts)
    .filter(([count]) => count > 0)
    .map(([count, noun]) => `${count} ${noun}`)
    .join(' ve ')
}

/**
 * Tesisat ögeleri tür adıyla DEĞİL toplu sayılıyor: sembol etiketleri
 * plumbing/scene/symbolLoader.ts'te ve o modül Three.js'e bağlı — DOM
 * penceresinden çağırmak hem katman kuralını çiğner (scene/ = Canvas içi) hem de
 * bu pencereye three'yi bağlar. Etiketler plumbing/core'a çıkarılınca burası
 * "2 vana · 1 sayaç" yazabilecek.
 */
export function formatInstallationCounts(counts: FloorContentCounts): string {
  return joinCounts([
    [counts.pipeSegmentCount, 'boru bölümü'],
    [counts.installationElementCount, 'tesisat ögesi'],
  ])
}
