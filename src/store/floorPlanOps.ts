import type { DraftSetter } from './architecturePropertyOps'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { cloneFloorContentInDraft } from './floorCloneOps'
import { removeFloorContentInDraft } from './floorOps'
import { markDirty, takeNextId } from './projectMeta'
import { isDraftFloorId, type DraftFloor } from '../core/floorPlan'
import {
  MAX_BASEMENT_COUNT,
  MAX_FLOOR_COUNT,
  MIN_FLOOR_COUNT,
  getBasementCount,
  isFloorHeightValid,
  isFloorNameTaken,
  isFloorNameValid,
} from '../core/floors'
import type { Floor, Id } from '../core/model'

export type ApplyFloorPlanInput = {
  floors: readonly DraftFloor[]
  activeFloorId: Id
}

export type FloorPlanActions = {
  /**
   * "Katlar" penceresinin TEK yazımı (madde 13): ekleme, silme, yeniden
   * adlandırma, yükseklik ve sıra değişikliği bir arada uygulanır. Tek `set`
   * çağrısı olduğu için geçmişe de tek adım yazılır — KK-20'nin "tek adımda
   * geri alınır" şartı buradan geliyor, ayrı bir gruplama mekanizmasından değil.
   *
   * Reddedilirse false döner ve HİÇBİR ŞEY değişmez; id bile harcanmaz.
   */
  applyFloorPlan: (input: ApplyFloorPlanInput) => boolean
}

/**
 * Taslak pencereden geliyor ama yine de doğrulanır: pencere tek çağıran olsa da
 * store'un değişmezleri (en az bir kat, benzersiz ad, sınır içi yükseklik,
 * bodrum/normal ayrımı) pencerenin doğru davranmasına bırakılamaz.
 */
function isPlanValid(floors: readonly DraftFloor[]): boolean {
  if (floors.length < MIN_FLOOR_COUNT || floors.length > MAX_FLOOR_COUNT) return false
  if (getBasementCount(floors) > MAX_BASEMENT_COUNT) return false

  let hasSeenNonBasement = false
  for (const floor of floors) {
    if (!isFloorNameValid(floor.name) || isFloorNameTaken(floors, floor.name, floor.id)) {
      return false
    }
    if (!isFloorHeightValid(floor.heightCm)) return false
    if (floor.isBasement && hasSeenNonBasement) return false
    if (!floor.isBasement) hasSeenNonBasement = true
  }
  return true
}

function applyFloorPlanInDraft(draft: CadState, input: ApplyFloorPlanInput): boolean {
  const { floors: planned } = input
  if (!isPlanValid(planned)) return false

  // Silinen katların ÇİZİMİ önce temizlenir: kat listesi aşağıda baştan
  // kurulduğu için, sonraya bırakılsaydı hangi katın gittiği anlaşılamazdı.
  const plannedIds = new Set(planned.map((floor) => floor.id))
  for (const floor of draft.floors) {
    if (!plannedIds.has(floor.id)) removeFloorContentInDraft(draft, floor.id)
  }

  // Geçici (negatif) id'ler ancak BURADA gerçek id'ye dönüşür — pencere iptal
  // edilseydi sayaç hiç ilerlemeyecekti (knowledge/id-scheme.md).
  const realIdOf = new Map<Id, Id>()
  const floors: Floor[] = planned.map((floor) => {
    const id = isDraftFloorId(floor.id) ? takeNextId(draft) : floor.id
    realIdOf.set(floor.id, id)
    return { id, name: floor.name, heightCm: floor.heightCm, isBasement: floor.isBasement }
  })

  draft.floors = floors

  // Kopyalama kat listesi YAZILDIKTAN sonra: klonlama hedef katın var olduğunu
  // varsayıyor ve kaynağı da bu listeden okuyor.
  for (const floor of planned) {
    if (floor.copyFromFloorId === null) continue

    const sourceId = realIdOf.get(floor.copyFromFloorId) ?? floor.copyFromFloorId
    // Kaynak aynı pencerede silinmiş olabilir; o zaman kat boş açılır.
    if (!draft.floors.some((candidate) => candidate.id === sourceId)) continue

    const targetId = realIdOf.get(floor.id)
    if (targetId === undefined) continue

    cloneFloorContentInDraft(draft, {
      sourceFloorId: sourceId,
      targetFloorId: targetId,
      isArchitectureIncluded: true,
      isInstallationIncluded: true,
    })
  }

  const activeFloorId = realIdOf.get(input.activeFloorId)
  draft.activeFloorId =
    activeFloorId !== undefined && draft.floors.some((floor) => floor.id === activeFloorId)
      ? activeFloorId
      : draft.floors[0].id

  return true
}

export function createFloorPlanActions(set: DraftSetter): FloorPlanActions {
  return {
    applyFloorPlan: (input) => {
      let isApplied = false
      set((draft) => {
        isApplied = applyFloorPlanInDraft(draft, input)
        if (isApplied) markDirty(draft)
      })
      return isApplied
    },
  }
}
