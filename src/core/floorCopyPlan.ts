import { getFloorContent, isFloorContentEmpty, type FloorContentSource } from './floorContent'
import type { Floor, Id } from './model'

/** Madde 18: hedefte içerik varsa ne yapılacağı. Varsayılan "üzerine yaz". */
export type FloorCopyMode = 'overwrite' | 'skip'

export type FloorCopySelection = {
  sourceFloorId: Id
  targetFloorIds: readonly Id[]
  isArchitectureIncluded: boolean
  isInstallationIncluded: boolean
  mode: FloorCopyMode
}

export type FloorCopyTarget = {
  floorId: Id
  name: string
  /** Katta HERHANGİ bir çizim var mı — listedeki "İçerik var" rozeti (madde 17). */
  hasContent: boolean
  /** Kopyalanan TÜRLERDEN biri hedefte de var mı — üzerine yazılacak olan bu. */
  hasConflict: boolean
}

export type FloorCopyPlan = {
  /** Gerçekten işlem görecek katlar; "atla" kipinde çakışanlar buraya girmez. */
  targetFloorIds: Id[]
  /** Çizimi silinip yerine kaynağınki yazılacak katlar — uyarıda adlarıyla çıkar. */
  overwrittenFloors: FloorCopyTarget[]
  /** "Atla" kipinde işlem dışı kalanlar. */
  skippedFloors: FloorCopyTarget[]
  /** Kopyalama düğmesi bu bayrağa bakar (madde 16, 17). */
  isRunnable: boolean
}

/**
 * Tesisat mimari olmadan kopyalanamaz (madde 16, KK-18). Kural burada, saf
 * tarafta: iki onay kutusunu birbirine bağlayan mantık bileşende kalsaydı
 * kopyalama başka bir yerden çağrıldığında sessizce atlanırdı.
 */
export function withInstallationDependency(
  selection: Pick<FloorCopySelection, 'isArchitectureIncluded' | 'isInstallationIncluded'>,
  changed: 'architecture' | 'installation',
  isChecked: boolean,
): Pick<FloorCopySelection, 'isArchitectureIncluded' | 'isInstallationIncluded'> {
  if (changed === 'installation') {
    return {
      // Tesisat işaretlenince mimari de işaretlenir.
      isArchitectureIncluded: isChecked || selection.isArchitectureIncluded,
      isInstallationIncluded: isChecked,
    }
  }

  return {
    isArchitectureIncluded: isChecked,
    // Mimarinin işareti kalkınca tesisatınki de kalkar.
    isInstallationIncluded: isChecked && selection.isInstallationIncluded,
  }
}

/**
 * Aralık seçimi (madde 17): iki kat arasında kalan katların tamamı işaretlenir.
 * Sıra dizinin kendisi olduğu için "arada olmak" indeks aralığıdır; kullanıcının
 * başlangıcı bitişten yukarıda seçmesi de kabul edilir, uçlar takas edilir.
 */
export function getFloorRangeIds(
  floors: readonly Floor[],
  fromFloorId: Id,
  toFloorId: Id,
): Id[] {
  const fromIndex = floors.findIndex((floor) => floor.id === fromFloorId)
  const toIndex = floors.findIndex((floor) => floor.id === toFloorId)
  if (fromIndex < 0 || toIndex < 0) return []

  const start = Math.min(fromIndex, toIndex)
  const end = Math.max(fromIndex, toIndex)
  return floors.slice(start, end + 1).map((floor) => floor.id)
}

export function getFloorCopyTargets(
  source: FloorContentSource,
  floors: readonly Floor[],
  selection: FloorCopySelection,
): FloorCopyTarget[] {
  const selected = new Set(selection.targetFloorIds)

  return floors
    // Kaynak kat listede PASİF (madde 17): kendi üstüne kopyalamak anlamsız.
    .filter((floor) => floor.id !== selection.sourceFloorId && selected.has(floor.id))
    .map((floor) => {
      const content = getFloorContent(source, floor.id)
      return {
        floorId: floor.id,
        name: floor.name,
        hasContent: !isFloorContentEmpty(content),
        hasConflict:
          (selection.isArchitectureIncluded && content.hasArchitecture) ||
          (selection.isInstallationIncluded && content.hasInstallation),
      }
    })
}

/**
 * Çakışma, hedefte içerik olması DEĞİL kopyalanan TÜRDEN içerik olmasıdır: yalnız
 * mimari kopyalanırken hedefteki tesisat silinmez, dolayısıyla o kat "üzerine
 * yazılacak" diye uyarılmaz da (madde 18).
 */
export function planFloorCopy(
  source: FloorContentSource,
  floors: readonly Floor[],
  selection: FloorCopySelection,
): FloorCopyPlan {
  const hasType = selection.isArchitectureIncluded || selection.isInstallationIncluded
  const hasSource = floors.some((floor) => floor.id === selection.sourceFloorId)
  const targets = hasSource ? getFloorCopyTargets(source, floors, selection) : []

  const overwrittenFloors = targets.filter((target) => target.hasConflict)
  const skippedFloors = selection.mode === 'skip' ? overwrittenFloors : []
  const processed =
    selection.mode === 'skip' ? targets.filter((target) => !target.hasConflict) : targets

  return {
    targetFloorIds: processed.map((target) => target.floorId),
    // "Atla" kipinde hiçbir şeyin üzerine yazılmaz; uyarı da çıkmamalı.
    overwrittenFloors: selection.mode === 'overwrite' ? overwrittenFloors : [],
    skippedFloors,
    isRunnable: hasType && processed.length > 0,
  }
}
