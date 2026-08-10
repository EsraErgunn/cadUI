import type { DraftSetter } from './architecturePropertyOps'
// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { markDirty, takeNextId } from './projectMeta'
import type { Id, PointSymbolType, SymbolAttachment } from '../core/model'
import { getNextSymbolLabel, isSymbolLabelTaken, isSymbolLabelValid } from '../core/pointSymbol'
import { getSymbolFloorId } from '../core/symbolPlacement'
import { snapAngleDeg } from '../core/transform'

export type AddPointSymbolInput = {
  type: PointSymbolType
  /** Duvara mı bağlı serbest mi — kararı araç verir (resolveSymbolAttachment). */
  attachment: SymbolAttachment
}

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
    type: input.type,
    label: getNextSymbolLabel(draft.symbols, input.type, draft.activeFloorId, draft.walls),
    note: '',
    ...input.attachment,
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
  movePointSymbol: (symbolId: Id, attachment: SymbolAttachment) => boolean
  /** Açı KK-3'ün 15° adımına yakalanır. */
  rotatePointSymbol: (symbolId: Id, angleDeg: number) => boolean
  /** Çakışan etiket REDDEDİLİR (KK-10). */
  setPointSymbolLabel: (symbolId: Id, label: string) => boolean
  setPointSymbolNote: (symbolId: Id, note: string) => boolean
}

/**
 * Duvarı silinen sembolü düşürür — açıklıktaki K16 temizliğinin sembol karşılığı.
 * Duvarsız bağlı sembol temsil edilemez: konumu duvarından türüyor, duvar gidince
 * çizilemez hâle gelir ama kaydedilen JSON'da kalmaya devam ederdi.
 *
 * Çağıranın set()'i İÇİNDE çalışır: silme + temizlik TEK geri alma adımı.
 * Serbest semboller etkilenmez, onların duvarı yok.
 */
export function pruneSymbolsInDraft(draft: CadState): boolean {
  const wallIds = new Set(draft.walls.map((wall) => wall.id))
  const kept = draft.symbols.filter(
    (symbol) => symbol.attachment === 'free' || wallIds.has(symbol.wallId),
  )
  if (kept.length === draft.symbols.length) return false

  draft.symbols = kept
  return true
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

    /**
     * Sembolü yeni bağlanmaya taşır. Konum değil BAĞLANMA veriliyor: sembol
     * sürüklenirken duvara girip çıkabiliyor, "konum yaz" imzası duvardan
     * kopmayı ifade edemezdi (moveOpening'in wallId taşımasıyla aynı gerekçe).
     */
    movePointSymbol: (symbolId: Id, attachment: SymbolAttachment): boolean => {
      let isMoved = false
      set((draft) => {
        const index = draft.symbols.findIndex((candidate) => candidate.id === symbolId)
        if (index < 0) return

        const symbol = draft.symbols[index]
        draft.symbols[index] = {
          id: symbol.id,
          type: symbol.type,
          label: symbol.label,
          note: symbol.note,
          ...attachment,
        }
        isMoved = true
        markDirty(draft)
      })
      return isMoved
    },

    /**
     * Açı KK-3'ün 15° adımına yakalanır. YALNIZ serbest sembolde: duvara bağlı
     * sembolün açısı duvarından türüyor, ikinci bir kaynak tutulmuyor.
     */
    rotatePointSymbol: (symbolId: Id, angleDeg: number): boolean => {
      let isRotated = false
      set((draft) => {
        const symbol = draft.symbols.find((candidate) => candidate.id === symbolId)
        if (!symbol || symbol.attachment !== 'free') return

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
        const floorId = getSymbolFloorId(symbol, draft.walls)
        if (floorId === undefined) return
        if (isSymbolLabelTaken(draft.symbols, trimmed, floorId, draft.walls, symbol.id)) return
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
