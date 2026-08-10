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
  FreeEndAttachment,
  NearestLineAttachment,
  OnLineAttachment,
} from '../core/elementAttach'
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
import { extendLineEnd, splitLineAtSegment } from '../core/lineSplit'
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

/** Cihazı boruya bağlayan kısa kol da normal bir borudur; ayrı bir hat türü yok. */
const STUB_LINE_KIND: InstallationLineKind = 'applianceStub'

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
  /**
   * Boruya oturan (`onLine`) elemanı KAYDIRIR: düğüm + eleman konumu MUTLAK
   * yazılır (kayma değil) — bkz. `core/elementAttach.ts` → `resolveOnLineSlide`.
   * `moveElements`'ten AYRI: o serbest kaymayla taşır ve boruyu büker, bu ise
   * borunun şeklini SABİT tutup elemanı üzerinde gezdirir.
   */
  slideOnLineElement: (
    lineId: Id,
    pointId: Id,
    elementId: Id,
    nodePosition: PlanPoint,
    elementPosition: PlanPoint,
  ) => void
  /** Tamamlanmış taslağı kalıcı hâle getirir; 2 noktadan azı KAYDEDİLMEZ. */
  addLine: (input: AddLineInput) => void
  /** Boruya oturan armatür(ler): hedef parça sırayla ayrılır, her düğüme bir eleman biner. */
  placeOnLineElements: (attachment: OnLineAttachment) => void
  /** Boş boru ucuna eleman: araya vana girer, hat elemanın girişine uzar. Eleman id'si döner. */
  placeElementAtLineEnd: (attachment: FreeEndAttachment) => Id | null
  /** Cihaz + en yakın boruya kısa kol + kolun dibindeki vana — hepsi tek adım. */
  placeElementWithStub: (
    attachment: NearestLineAttachment,
    pipeTypeName: PipeTypeName,
  ) => void
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
   *
   * Silinen hattın ÜSTÜNDEKİ armatürler (vana, regülatör, izolasyon…) hatla
   * birlikte gider: armatür bir düğümdür, düğümü kalmayınca çizimde tutunacak
   * yeri kalmaz ve sahipsiz bir sembol olarak asılı kalırdı.
   */
  const applyRemoval = (elementIds: readonly Id[], lineIds: readonly Id[]) => {
    let isRemoved = false

    set((draft) => {
      const removedLines = draft.installationLines.filter((line) => lineIds.includes(line.id))
      const removedElementIds = [
        ...elementIds,
        ...removedLines.flatMap((line) =>
          line.points
            .map((point) => point.inlineElementId)
            .filter((id): id is Id => id !== undefined),
        ),
      ]

      const remainingElements = draft.installationElements.filter(
        (element) => !removedElementIds.includes(element.id),
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
          (connection.target.kind !== 'port' ||
            !removedElementIds.includes(connection.target.elementId)) &&
          (connection.target.kind !== 'line' || !lineIds.includes(connection.target.lineId)),
      )

      // Kalan hatlarda silinen armatüre işaret eden düğüm boşa çıkar; boru
      // bölünmüş kalır ama düğüm artık serbest bir köşedir.
      for (const line of draft.installationLines) {
        for (const point of line.points) {
          if (point.inlineElementId === undefined) continue
          if (!removedElementIds.includes(point.inlineElementId)) continue
          delete point.inlineElementId
        }
      }

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

  /** Hat + noktaları + parçaları; hat id'si döner. Çizim ve cihaz kolu aynı yoldan geçer. */
  const pushLine = (
    draft: Pick<CadState, 'installationLines' | 'activeFloorId' | 'nextUniqueId'>,
    input: { kind: InstallationLineKind; pipeTypeName: PipeTypeName; points: readonly PlanPoint[] },
  ): Id => {
    const points: InstallationLinePoint[] = input.points.map((position) => ({
      id: takeNextId(draft),
      position,
    }))
    const segments: InstallationLineSegment[] = points.slice(1).map((point, index) => ({
      id: takeNextId(draft),
      fromPointId: points[index].id,
      toPointId: point.id,
    }))
    const id = takeNextId(draft)

    draft.installationLines.push({
      id,
      floorId: draft.activeFloorId,
      kind: input.kind,
      pipeTypeName: input.pipeTypeName,
      points,
      segments,
    })
    return id
  }

  /** Boruyu verilen yerde ayırır ve doğan düğüme elemanı oturtur; eleman id'si döner. */
  const attachInlineElement = (
    draft: CadState,
    line: InstallationLine,
    segmentIndex: number,
    position: PlanPoint,
    placement: AddElementInput,
  ): { elementId: Id; pointId: Id } | null => {
    const split = splitLineAtSegment(line, segmentIndex, position, () => takeNextId(draft))
    if (!split) return null

    line.points = split.points
    line.segments = split.segments

    const elementId = pushElement(draft, placement)
    const point = line.points.find((candidate) => candidate.id === split.insertedPointId)
    if (point) point.inlineElementId = elementId

    return { elementId, pointId: split.insertedPointId }
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

        // Boruya oturan armatür taşınınca oturduğu DÜĞÜM de aynı kaymayla gelir:
        // armatür bir düğümdür (K-W3); ikisi ayrılsaydı vana borunun dışında
        // asılı kalır ve boru o noktada boşuna bölünmüş görünürdü.
        const movedInlinePointIds = new Set<Id>()
        for (const line of draft.installationLines) {
          for (const point of line.points) {
            if (point.inlineElementId === undefined) continue
            if (!elementIds.includes(point.inlineElementId)) continue

            point.position = {
              x: point.position.x + deltaCm.x,
              y: point.position.y + deltaCm.y,
            }
            movedInlinePointIds.add(point.id)
          }
        }

        // Cihaz kolu (applianceStub) ana borudaki düğüme AYRI bir nokta nesnesiyle
        // değil `line` bağlantı kaydıyla değiyor (K-W). O düğüm taşınınca kolun
        // ucu kendiliğinden gelmez — burada elle taşınmazsa kol görsel olarak
        // vanadan KOPUK kalır.
        for (const connection of draft.installationConnections) {
          if (connection.target.kind !== 'line') continue
          if (!movedInlinePointIds.has(connection.target.pointId)) continue

          const stubLine = draft.installationLines.find(
            (candidate) => candidate.id === connection.lineId,
          )
          const stubPoint =
            connection.end === 'start' ? stubLine?.points[0] : stubLine?.points.at(-1)
          if (!stubPoint) continue

          stubPoint.position = {
            x: stubPoint.position.x + deltaCm.x,
            y: stubPoint.position.y + deltaCm.y,
          }
        }

        markDirty(draft)
      })

      if (isMoved) record()
    },

    slideOnLineElement: (lineId, pointId, elementId, nodePosition, elementPosition) => {
      let isChanged = false

      set((draft) => {
        const line = draft.installationLines.find((candidate) => candidate.id === lineId)
        const point = line?.points.find((candidate) => candidate.id === pointId)
        const element = draft.installationElements.find((candidate) => candidate.id === elementId)
        if (!point || !element) return

        // Yer değişmediyse (yalnız seçmek için tıklama) hiç yazılmaz — yoksa her
        // tıklama geçmişe boş bir adım bırakırdı (moveElements'teki kuralla aynı).
        if (point.position.x === nodePosition.x && point.position.y === nodePosition.y) return

        point.position = nodePosition
        element.position = elementPosition
        isChanged = true
        markDirty(draft)
      })

      if (isChanged) record()
    },

    // Hat + her nokta + her segment + bağlantı kayıtları TEK set() içinde üretilir:
    // tek geçmiş adımı, tek Ctrl+Z (Risk R11).
    addLine: (input) => {
      if (!hasEnoughPoints(input.points)) return

      set((draft) => {
        const lineId = pushLine(draft, {
          kind: input.kind,
          pipeTypeName: input.pipeTypeName ?? DEFAULT_PIPE_TYPE_NAME,
          points: input.points,
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

    // Ana eleman + refakatçileri + boru ayırmaları TEK set() içinde: kullanıcı
    // bir sembol bıraktı, bir Ctrl+Z hepsini geri almalı.
    placeOnLineElements: (attachment) => {
      let isPlaced = false

      set((draft) => {
        const line = draft.installationLines.find(
          (candidate) => candidate.id === attachment.lineId,
        )
        if (!line) return

        // Düğümler boru yönünde ARTAN sırada geliyor. i. bölme, kendinden önceki
        // bölmelerin ikiye ayırdığı parçaya düşer; bu yüzden indeks i kadar ilerler.
        attachment.nodes.forEach((node, index) => {
          const attached = attachInlineElement(
            draft,
            line,
            attachment.segmentIndex + index,
            node.nodePosition,
            node.placement,
          )
          if (attached) isPlaced = true
        })

        if (isPlaced) markDirty(draft)
      })

      if (isPlaced) record()
    },

    placeElementAtLineEnd: (attachment) => {
      let createdId: Id | null = null

      set((draft) => {
        const line = draft.installationLines.find(
          (candidate) => candidate.id === attachment.lineId,
        )
        if (!line) return

        const extended = extendLineEnd(line, attachment.end, attachment.extendTo, () =>
          takeNextId(draft),
        )
        if (!extended) return

        line.points = extended.points
        line.segments = extended.segments

        // Vana hattın ESKİ ucundaki düğüme oturur; hat uzadığı için o düğüm artık
        // boru ile eleman ARASINDA kalır ("aralarına vana konur").
        const [elementPlacement, valvePlacement] = attachment.placements
        const valveId = pushElement(draft, valvePlacement)
        const endPoint = line.points.find((candidate) => candidate.id === attachment.endPointId)
        if (endPoint) endPoint.inlineElementId = valveId

        const elementId = pushElement(draft, elementPlacement)
        draft.installationConnections.push({
          lineId: line.id,
          end: attachment.end,
          target: { kind: 'port', elementId, portId: attachment.inputPortId },
        })

        markDirty(draft)
        createdId = elementId
      })

      if (createdId === null) return null
      record()
      return createdId
    },

    placeElementWithStub: (attachment, pipeTypeName) => {
      let isPlaced = false

      set((draft) => {
        const line = draft.installationLines.find(
          (candidate) => candidate.id === attachment.lineId,
        )
        if (!line) return

        // Vana borunun BOŞ ucuna oturur (boru ayrılmaz, uç zaten oradaydı) —
        // onLine'daki gibi bir bölme yok, nodePosition zaten mevcut bir düğüm.
        const [elementPlacement, valvePlacement] = attachment.placements
        const valveId = pushElement(draft, valvePlacement)
        const endPoint = line.points.find((candidate) => candidate.id === attachment.endPointId)
        if (!endPoint) return
        endPoint.inlineElementId = valveId

        const elementId = pushElement(draft, elementPlacement)
        const stubId = pushLine(draft, {
          kind: STUB_LINE_KIND,
          pipeTypeName,
          // Gaz yönü boru → cihaz: kol düğümden başlar, cihazın girişinde biter.
          points: [attachment.nodePosition, attachment.inputPortPosition],
        })

        draft.installationConnections.push(
          {
            lineId: stubId,
            end: 'start',
            target: { kind: 'line', lineId: line.id, pointId: attachment.endPointId },
          },
          {
            lineId: stubId,
            end: 'end',
            target: { kind: 'port', elementId, portId: attachment.inputPortId },
          },
        )

        markDirty(draft)
        isPlaced = true
      })

      if (isPlaced) record()
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
