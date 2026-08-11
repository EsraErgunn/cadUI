import type { FloorContentCounts } from '../../core/floorContent'

/** "14 duvar · 4 mahal · 6 kapı" — sıfır olan tür hiç yazılmaz. */
function joinCounts(entries: readonly [number, string][]): string {
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
  ])
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
