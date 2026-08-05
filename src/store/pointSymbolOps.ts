import type { DraftSetter } from './architecturePropertyOps'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { markDirty, takeNextId } from './projectMeta'
import type { PlanPoint } from '../core/coords'
import type { Id, PointSymbolType } from '../core/model'
import { getNextSymbolLabel, isSymbolLabelTaken, isSymbolLabelValid } from '../core/pointSymbol'
import { snapAngleDeg } from '../core/transform'

export type AddPointSymbolInput = {
  type: PointSymbolType
  position: PlanPoint
  /** Verilmezse 0. Yerleştirme aracı açıyı sonradan panelden değiştirtir. */
  rotationDeg?: number
}

const DEFAULT_SYMBOL_ROTATION_DEG = 0

/**
 * Sembol ekler ve id'sini döndürür. Etiket burada ÜRETİLİR (kat + tip başına
 * sıradaki numara): araç tarafı ad üretme kuralını bilmek zorunda kalmasın.
 *
 * Kat aktif kattan alınır, çağırandan değil — elemanın katı iki yerde tutulup
 * ayrışmasın (plumbingSlice.addElement ile aynı gerekçe).
 */
export function addPointSymbolToDraft(draft: CadState, input: AddPointSymbolInput): Id {
  const id = takeNextId(draft)
  draft.symbols.push({
    id,
    floorId: draft.activeFloorId,
    type: input.type,
    x: input.position.x,
    y: input.position.y,
    rotationDeg: input.rotationDeg ?? DEFAULT_SYMBOL_ROTATION_DEG,
    label: getNextSymbolLabel(draft.symbols, input.type, draft.activeFloorId),
    note: '',
  })
  return id
}

/**
 * Action imzaları BURADA: slice yalnız bunu araya alıyor. Beş imza orada
 * yazılsaydı architectureSlice 200 satır sınırını aşardı (aynı gerekçeyle
 * createPropertyActions/createTransformActions da gövdelerini dışarıda tutuyor).
 */
export type PointSymbolActions = {
  /** Nokta sembolü yerleştirir; etiket otomatik üretilir (Desen A). */
  addPointSymbol: (input: AddPointSymbolInput) => Id | undefined
  movePointSymbol: (symbolId: Id, position: PlanPoint) => boolean
  /** Açı KK-3'ün 15° adımına yakalanır. */
  rotatePointSymbol: (symbolId: Id, angleDeg: number) => boolean
  /** Çakışan etiket REDDEDİLİR (KK-10). */
  setPointSymbolLabel: (symbolId: Id, label: string) => boolean
  setPointSymbolNote: (symbolId: Id, note: string) => boolean
}

export function createPointSymbolActions(set: DraftSetter): PointSymbolActions {
  return {
    addPointSymbol: (input: AddPointSymbolInput): Id | undefined => {
      let createdId: Id | undefined
      set((draft) => {
        createdId = addPointSymbolToDraft(draft, input)
        markDirty(draft)
      })
      return createdId
    },

    movePointSymbol: (symbolId: Id, position: PlanPoint): boolean => {
      let isMoved = false
      set((draft) => {
        const symbol = draft.symbols.find((candidate) => candidate.id === symbolId)
        if (!symbol || (symbol.x === position.x && symbol.y === position.y)) return

        symbol.x = position.x
        symbol.y = position.y
        isMoved = true
        markDirty(draft)
      })
      return isMoved
    },

    /** Açı KK-3'ün 15° adımına yakalanır; serbest açı çağıranın işi değil, henüz yok. */
    rotatePointSymbol: (symbolId: Id, angleDeg: number): boolean => {
      let isRotated = false
      set((draft) => {
        const symbol = draft.symbols.find((candidate) => candidate.id === symbolId)
        if (!symbol) return

        const next = snapAngleDeg(angleDeg)
        if (symbol.rotationDeg === next) return

        symbol.rotationDeg = next
        isRotated = true
        markDirty(draft)
      })
      return isRotated
    },

    /**
     * Etiket çakışıyorsa REDDEDİLİR (KK-10), sessizce numaralandırılmaz: kullanıcı
     * yazdığı adın kabul edilip edilmediğini görmeli.
     */
    setPointSymbolLabel: (symbolId: Id, label: string): boolean => {
      let isApplied = false
      set((draft) => {
        const symbol = draft.symbols.find((candidate) => candidate.id === symbolId)
        if (!symbol) return

        const trimmed = label.trim()
        if (!isSymbolLabelValid(trimmed)) return
        if (isSymbolLabelTaken(draft.symbols, trimmed, symbol.floorId, symbol.id)) return
        if (symbol.label === trimmed) return

        symbol.label = trimmed
        isApplied = true
        markDirty(draft)
      })
      return isApplied
    },

    setPointSymbolNote: (symbolId: Id, note: string): boolean => {
      let isApplied = false
      set((draft) => {
        const symbol = draft.symbols.find((candidate) => candidate.id === symbolId)
        if (!symbol || symbol.note === note) return

        symbol.note = note
        isApplied = true
        markDirty(draft)
      })
      return isApplied
    },
  }
}
