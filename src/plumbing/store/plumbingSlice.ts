import type { StateCreator } from 'zustand'

import {
  recordPlumbingHistory,
  redoPlumbingHistory,
  undoPlumbingHistory,
  type PlumbingSnapshot,
} from './plumbingHistory'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
// cadStore ↔ plumbingSlice karşılıklı import eder; bu taraf tip-only olduğu için
// derlemede silinir ve çalışma zamanında döngü oluşmaz (K17).
import type { CadState } from '../../store/cadStore'
import { markDirty, takeNextId } from '../../store/projectMeta'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationEndpointTarget,
  InstallationLine,
  InstallationLineKind,
  InstallationLinePoint,
  InstallationLineSegment,
  LineEndAttachment,
} from '../core/installationModel'
import { hasEnoughPoints } from '../core/lineGeometry'
import { splitLineAtSegment } from '../core/lineSplit'
import { DEFAULT_PIPE_TYPE_NAME, type PipeTypeName } from '../core/pipeTypes'
import { DEFAULT_ELEMENT_ANGLE_DEG, DEFAULT_ELEMENT_SCALE } from '../core/placement'
import { isPortOccupied } from '../core/portSnap'
import type { InstallationElementType } from '../core/symbolMetadata'

export type AddElementInput = {
  type: InstallationElementType
  position: PlanPoint
  angleDeg?: number
  scale?: number
}

export type AddLineInput = {
  kind: InstallationLineKind
  points: readonly PlanPoint[]
  /** Verilmezse varsayılan çap (K-W1). */
  pipeTypeName?: PipeTypeName
  /** Uç serbestse verilmez — bağlantı kaydının YOKLUĞU serbest demektir. */
  startTarget?: LineEndAttachment
  endTarget?: LineEndAttachment
}

export type PlumbingSlice = {
  installationElements: InstallationElement[]
  installationLines: InstallationLine[]
  installationConnections: InstallationConnection[]
  /** Kat aktif kattan alınır: eleman iki yerde tutulan bir floorId ile ayrışmasın.
   *  Üretilen id döner — hat aracı ilk elemanı koyup portuna bağlanabilsin. */
  addElement: (input: AddElementInput) => Id
  /** Yapıştırmanın tek adımlık hâli; üretilen id'ler döner (kopya hemen seçilebilsin). */
  addElements: (inputs: readonly AddElementInput[]) => Id[]
  removeElements: (elementIds: readonly Id[]) => void
  /** Eleman + hat aynı jestte siliniyorsa TEK adım: bir silme, bir Ctrl+Z. */
  removeSelection: (elementIds: readonly Id[], lineIds: readonly Id[]) => void
  /** Seçimin TAMAMI aynı kaymayla taşınır — tek geçmiş adımı, tek Ctrl+Z. */
  moveElements: (elementIds: readonly Id[], deltaCm: PlanPoint) => void
  /** Tamamlanmış taslağı kalıcı hâle getirir; 2 noktadan azı KAYDEDİLMEZ. */
  addLine: (input: AddLineInput) => void
  /** Seçili hatların çapını değiştirir — tek adım, tek Ctrl+Z. */
  setLinesPipeType: (lineIds: readonly Id[], pipeTypeName: PipeTypeName) => void
  undoPlumbing: () => void
  redoPlumbing: () => void
}

/** Paylaşılan boş dizi: her çağrıda yeni dizi ayırmamak için. */
const NO_IDS: readonly Id[] = []

export const INITIAL_PLUMBING_DATA: PlumbingSnapshot = {
  installationElements: [],
  installationLines: [],
  installationConnections: [],
}

export const createPlumbingSlice: StateCreator<
  CadState,
  [['zustand/immer', never]],
  [],
  PlumbingSlice
> = (set, get) => {
  /** Değişimden SONRA aynalanır — zundo bir önceki aynayı geçmişe iter. */
  const record = () => {
    const { installationElements, installationLines, installationConnections } = get()
    recordPlumbingHistory({ installationElements, installationLines, installationConnections })
  }

  const restore = (snapshot: PlumbingSnapshot | null) => {
    if (!snapshot) return
    set((draft) => {
      // Geçmişten geri yazma record() ÇAĞIRMAZ: undo yeni bir geçmiş adımı değildir.
      draft.installationElements = snapshot.installationElements
      draft.installationLines = snapshot.installationLines
      draft.installationConnections = snapshot.installationConnections
      markDirty(draft)
    })
  }

  /**
   * Ucun tutunduğu şeyi kalıcı hedefe çevirir; gerekiyorsa hedef boruyu AYIRIR.
   * `null` = bağlantı yazılmaz (dolu port, kayıp hat, geçersiz parça) — hat yine
   * kaydedilir, yalnız o ucu serbest kalır.
   *
   * Bilinen sınır: bir hattın İKİ ucu da aynı borunun aynı parçasına düşerse
   * ikinci bölme, birincinin kaydırdığı parça indeksine bakar ve geçersiz
   * bulunup atlanır. Kayıt bozulmaz, yalnız o uç serbest kalır.
   */
  const resolveAttachment = (
    draft: CadState,
    attachment: LineEndAttachment,
  ): InstallationEndpointTarget | null => {
    if (attachment.kind === 'port') {
      // Son savunma hattı: araç dolu portu zaten aday göstermiyor, ama iki ucu
      // AYNI porta düşen hat buradan geçmemeli (bir port = bir bağlantı).
      if (isPortOccupied(draft.installationConnections, attachment.elementId, attachment.portId)) {
        return null
      }
      return { kind: 'port', elementId: attachment.elementId, portId: attachment.portId }
    }

    if (attachment.kind === 'linePoint') {
      return { kind: 'line', lineId: attachment.lineId, pointId: attachment.pointId }
    }

    const target = draft.installationLines.find((line) => line.id === attachment.lineId)
    if (!target) return null

    const split = splitLineAtSegment(target, attachment.segmentIndex, attachment.position, () =>
      takeNextId(draft),
    )
    if (!split) return null

    target.points = split.points
    target.segments = split.segments
    return { kind: 'line', lineId: target.id, pointId: split.insertedPointId }
  }

  /**
   * Eleman ve hat silme TEK yerde: ikisi de aynı bağlantı temizliğini istiyor ve
   * seçimde ikisi birden varsa TEK geçmiş adımı olmalı (yoksa kullanıcı bir
   * silme için iki kez Ctrl+Z'lerdi).
   *
   * Silinen elemanın/hattın bağlantıları da gider: kalsaydı hedef port sonsuza
   * dek "dolu" görünür, hat ucu da hayalet bir elemana bağlı sayılırdı. Silinen
   * hattın AYIRDIĞI boru bölünmüş kalır — bölme ayrı bir düzenleme, hattın
   * eklentisi değil.
   */
  const applyRemoval = (elementIds: readonly Id[], lineIds: readonly Id[]) => {
    let isRemoved = false

    set((draft) => {
      const remainingElements = draft.installationElements.filter(
        (element) => !elementIds.includes(element.id),
      )
      const remainingLines = draft.installationLines.filter((line) => !lineIds.includes(line.id))
      if (
        remainingElements.length === draft.installationElements.length &&
        remainingLines.length === draft.installationLines.length
      ) {
        return
      }

      draft.installationElements = remainingElements
      draft.installationLines = remainingLines
      draft.installationConnections = draft.installationConnections.filter(
        (connection) =>
          !lineIds.includes(connection.lineId) &&
          (connection.target.kind !== 'port' || !elementIds.includes(connection.target.elementId)),
      )
      // nextUniqueId geri alınmaz: id bir kez üretilir, asla yeniden kullanılmaz.
      markDirty(draft)
      isRemoved = true
    })

    if (isRemoved) record()
  }

  /**
   * Tek yerde: hem tekil ekleme hem yapıştırma aynı varsayılanları kullansın.
   * Parametre yapısal Pick — immer draft'ı `CadState`'in kendisi değil `Draft`'ı.
   */
  const pushElement = (
    draft: Pick<CadState, 'installationElements' | 'activeFloorId' | 'nextUniqueId'>,
    input: AddElementInput,
  ): Id => {
    const id = takeNextId(draft)
    draft.installationElements.push({
      id,
      floorId: draft.activeFloorId,
      type: input.type,
      position: input.position,
      angleDeg: input.angleDeg ?? DEFAULT_ELEMENT_ANGLE_DEG,
      scale: input.scale ?? DEFAULT_ELEMENT_SCALE,
    })
    return id
  }

  return {
    ...INITIAL_PLUMBING_DATA,

    // id üretimi + ekleme + kirli işaret TEK set() içinde: tek geçmiş adımı, tek Ctrl+Z.
    addElement: (input) => {
      let createdId: Id = 0
      set((draft) => {
        createdId = pushElement(draft, input)
        markDirty(draft)
      })
      record()
      return createdId
    },

    addElements: (inputs) => {
      if (inputs.length === 0) return []

      const createdIds: Id[] = []
      set((draft) => {
        for (const input of inputs) {
          createdIds.push(pushElement(draft, input))
        }
        markDirty(draft)
      })
      record()
      return createdIds
    },

    removeElements: (elementIds) => applyRemoval(elementIds, NO_IDS),

    removeSelection: (elementIds, lineIds) => applyRemoval(elementIds, lineIds),

    moveElements: (elementIds, deltaCm) => {
      let isMoved = false

      set((draft) => {
        for (const element of draft.installationElements) {
          if (!elementIds.includes(element.id)) continue

          element.position = {
            x: element.position.x + deltaCm.x,
            y: element.position.y + deltaCm.y,
          }
          isMoved = true
        }

        if (!isMoved) return

        // Bağlı hat ucu elemanla BİRLİKTE gelir. Port dünya konumu yeniden
        // hesaplanmaz, aynı kayma uygulanır: taşımada açı ve ölçek değişmediği
        // için sonuç birebir aynıdır ve store'un sembol metadata'sına ihtiyacı
        // olmaz. Döndürme/ölçekleme eklenirse burası getPortWorldPosition ile
        // yeniden türetmeye çevrilmeli.
        for (const connection of draft.installationConnections) {
          if (connection.target.kind !== 'port') continue
          if (!elementIds.includes(connection.target.elementId)) continue

          const line = draft.installationLines.find(
            (candidate) => candidate.id === connection.lineId,
          )
          const endPoint =
            connection.end === 'start' ? line?.points[0] : line?.points[line.points.length - 1]
          if (!endPoint) continue

          endPoint.position = {
            x: endPoint.position.x + deltaCm.x,
            y: endPoint.position.y + deltaCm.y,
          }
        }

        markDirty(draft)
      })

      if (isMoved) record()
    },

    // Hat + her nokta + her segment + bağlantı kayıtları TEK set() içinde üretilir:
    // tek geçmiş adımı, tek Ctrl+Z (Risk R11).
    addLine: (input) => {
      if (!hasEnoughPoints(input.points)) return

      set((draft) => {
        const points: InstallationLinePoint[] = input.points.map((position) => ({
          id: takeNextId(draft),
          position,
        }))
        const segments: InstallationLineSegment[] = points.slice(1).map((point, index) => ({
          id: takeNextId(draft),
          fromPointId: points[index].id,
          toPointId: point.id,
        }))
        const lineId = takeNextId(draft)

        draft.installationLines.push({
          id: lineId,
          floorId: draft.activeFloorId,
          kind: input.kind,
          pipeTypeName: input.pipeTypeName ?? DEFAULT_PIPE_TYPE_NAME,
          points,
          segments,
        })

        const attachments = [
          { end: 'start', attachment: input.startTarget },
          { end: 'end', attachment: input.endTarget },
        ] as const
        for (const { end, attachment } of attachments) {
          if (!attachment) continue

          const target = resolveAttachment(draft, attachment)
          if (target) draft.installationConnections.push({ lineId, end, target })
        }

        markDirty(draft)
      })
      record()
    },

    setLinesPipeType: (lineIds, pipeTypeName) => {
      let isChanged = false

      set((draft) => {
        for (const line of draft.installationLines) {
          if (!lineIds.includes(line.id) || line.pipeTypeName === pipeTypeName) continue

          line.pipeTypeName = pipeTypeName
          isChanged = true
        }

        if (isChanged) markDirty(draft)
      })

      if (isChanged) record()
    },

    undoPlumbing: () => restore(undoPlumbingHistory()),
    redoPlumbing: () => restore(redoPlumbingHistory()),
  }
}
