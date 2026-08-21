import type { StateCreator } from 'zustand'

import {
  recordPlumbingHistory,
  redoPlumbingHistory,
  undoPlumbingHistory,
  type PlumbingSnapshot,
} from './plumbingHistory'
import type { PlanPoint } from '../../core/coords'
import type { FloorPipeLink, Id } from '../../core/model'
// cadStore ↔ plumbingSlice karşılıklı import eder; bu taraf tip-only olduğu için
// derlemede silinir ve çalışma zamanında döngü oluşmaz (K17).
import { applyIsometricDrag, clearIsometricOffsets } from '../../isometric/core/isometricOffset'
import type { CadState } from '../../store/cadStore'
import { markDirty, takeNextId } from '../../store/projectMeta'
import {
  collectAttachmentLineIdsForElements,
  collectCompanionValveIdsForLines,
} from '../core/attachmentLinks'
import type { ClipboardConnection, LineClipboardEntry } from '../core/clipboard'
import {
  type FreeEndAttachment,
  type NearestLineAttachment,
  type OnLineAttachment,
} from '../core/elementAttach'
import { getTargetElementId } from '../core/installationModel'
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
import {
  getFloorLinkAnchoredPointIds,
  getLinkedLinePoints,
  getPortAnchoredPointIds,
} from '../core/lineCornerLink'
import { GAS_METER_DEFAULT_HEIGHT_CM } from '../core/lineElevation'
import { hasEnoughPoints } from '../core/lineGeometry'
import { isGasCarryingKind } from '../core/lineKinds'
import type { BranchLineProperties, PipeLineProperties } from '../core/lineProperties'
import { findCollapsiblePassThroughIndex } from '../core/lineSimplify'
import { extendLineEnd, splitLineAtSegment } from '../core/lineSplit'
import { resolveMoveTargets } from '../core/moveTargets'
import { DEFAULT_PIPE_TYPE_NAME, type PipeTypeName } from '../core/pipeTypes'
import { DEFAULT_ELEMENT_ANGLE_DEG, DEFAULT_ELEMENT_SCALE } from '../core/placement'
import { isPortOccupied } from '../core/portSnap'
import { resolvePipeResizeShift } from '../core/resizeTargets'
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
  /** Boru kotu (K102) — hat ile AYNI geçmiş adımında yazılır. */
  pipe?: PipeLineProperties
  /** Branşman kotu — hat ile AYNI geçmiş adımında yazılır. */
  branch?: BranchLineProperties
}

/**
 * Yazılan borunun kimliği. Hat aracı bunu zincirlemek için kullanır: bir
 * sonraki adımın başı `endPointId`'ye bağlanır (K-W: her adım ayrı boru).
 */
export type AddLineResult = { lineId: Id; startPointId: Id; endPointId: Id }

/** `addFloorPipeLink` girdisi — id `takeNextId`'den üretilir, çağıran vermez. */
export type AddFloorPipeLinkInput = Omit<FloorPipeLink, 'id'>

/** Cihazı boruya bağlayan kısa kol da normal bir borudur; ayrı bir hat türü yok. */
const STUB_LINE_KIND: InstallationLineKind = 'applianceStub'

export type PlumbingSlice = {
  installationElements: InstallationElement[]
  installationLines: InstallationLine[]
  installationConnections: InstallationConnection[]
  floorPipeLinks: FloorPipeLink[]
  /** Kat aktif kattan alınır: eleman iki yerde tutulan bir floorId ile ayrışmasın.
   *  Üretilen id döner — hat aracı ilk elemanı koyup portuna bağlanabilsin. */
  addElement: (input: AddElementInput) => Id
  /** Yapıştırmanın tek adımlık hâli; üretilen id'ler döner (kopya hemen seçilebilsin). */
  addElements: (inputs: readonly AddElementInput[]) => Id[]
  /**
   * Pano yapıştırması: eleman + hat + aralarındaki BAĞLAR tek adımda yaratılır
   * (bir Ctrl+V = bir Ctrl+Z). Bağlar dizinle gelir, id'ye burada çevrilir —
   * kopya kaynağıyla aynı davranır (bkz. `core/clipboard.ts`).
   */
  pasteEntries: (
    elementInputs: readonly AddElementInput[],
    lineInputs: readonly LineClipboardEntry[],
    connections: readonly ClipboardConnection[],
  ) => { elementIds: Id[]; lineIds: Id[] }
  removeElements: (elementIds: readonly Id[]) => void
  /** Eleman + hat aynı jestte siliniyorsa TEK adım: bir silme, bir Ctrl+Z. */
  removeSelection: (elementIds: readonly Id[], lineIds: readonly Id[]) => void
  /**
   * Seçimin TAMAMI aynı kaymayla taşınır — tek geçmiş adımı, tek Ctrl+Z. Hat
   * seçiliyse TÜM köşeleri kaymayla gelir; üstündeki armatürler ve bağlı uçtaki
   * elemanlar (sayaç, cihaz) hat seçili olmasa bile GERİDE KALMASIN diye
   * otomatik eklenir (K-W3/K-W).
   */
  moveElements: (elementIds: readonly Id[], lineIds: readonly Id[], deltaCm: PlanPoint) => void
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
  /**
   * Bir hat köşesini (uç ya da ara nokta) MUTLAK konuma taşır — boru artık
   * yalnız uçlarından/köşelerinden tutulup taşınabiliyor, gövdesi rijit
   * kaymaz. Köşeye sonradan `line` bağlantısıyla eklenmiş bir branşman/cihaz
   * kolu varsa (`getLinkedLinePoints`) o da AYNI konuma gelir — yoksa yeni
   * eklenen boru köşe taşınınca eski yerinde asılı kalıp KOPARDI. Köşede
   * oturan bir armatür (`inlineElementId`) varsa o da birlikte gelir.
   */
  moveLinePoint: (lineId: Id, pointId: Id, position: PlanPoint) => void
  /**
   * Özellik panelindeki "Boy (cm)" alanına yazılan hedefe göre boru ucunu
   * TAŞIR ve bitiş kotunu (K102) TEK adımda günceller — `moveLinePoint` +
   * `patchLines`'ı ayrı çağırmak iki Ctrl+Z adımı açardı, oysa kullanıcı tek
   * bir sayı yazdı. Konum hesabı `core/lineElevation.ts` →
   * `resolvePipeResizeTarget`'ta (saf fonksiyon, testli).
   */
  resizePipeEnd: (lineId: Id, endPointId: Id, position: PlanPoint, endHeightCm: number) => void
  /** Bir boru adımını kalıcı hâle getirir; 2 noktadan azı KAYDEDİLMEZ (null döner). */
  addLine: (input: AddLineInput) => AddLineResult | null
  /** Bir borunun ucunu üst/alt kattaki bir boru ucuyla eşleştirir. Üretilen id döner. */
  addFloorPipeLink: (input: AddFloorPipeLinkInput) => Id
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
  /** Ad etiketinin kaymasını yazar — bir etiket sürüklemesi = bir Ctrl+Z. */
  setElementLabelOffset: (elementId: Id, offsetCm: PlanPoint) => void
  /**
   * Etiketin İZOMETRİKTEKİ kayması. `setElementLabelOffset`'ten AYRI action:
   * iki görünümün etiket yerleşimi bağımsız (bkz. installationModel.ts) —
   * izometride kalabalığı açmak plandaki yerleşimi bozmamalı.
   */
  setElementIsometricLabelOffset: (elementId: Id, offsetCm: PlanPoint) => void
  /** Hat etiketinin izometrikteki kayması; planda hat etiketi taşınmıyor. */
  setLineIsometricLabelOffset: (lineId: Id, offsetCm: PlanPoint) => void
  /**
   * İzometrikte bir hat köşesini sürüklemenin sonucunu yazar: sürüklenen nokta
   * kendi kaymasını, ONDAN SONRAKİLER mirası alır (dal bütün olarak kayar,
   * bkz. isometric/core/isometricOffset.ts). PLAN konumlarına DOKUNMAZ —
   * izometrikte çizimi ayıklamak plan çizimini bozmamalı.
   *
   * Bir sürükleme = bir Ctrl+Z: canlı önizleme UI store'da tutulur, buraya
   * yalnız bırakılan son kayma gelir.
   */
  applyIsometricLineDrag: (lineId: Id, pointId: Id, deltaCm: PlanPoint) => void
  /**
   * "İzometrik konumları sıfırla": izometriğe ÖZEL tüm elle yerleştirmeleri
   * (dal kaydırmaları + etiket konumları) siler. PLAN çizimine dokunmaz —
   * zaten hiçbiri plan verisi değil. Tek adım, tek Ctrl+Z: kullanıcı onlarca
   * etiketi tek tek geri almak zorunda kalmasın.
   */
  resetIsometricPositions: () => void
  /**
   * Seçili elemanların alanlarını kısmi yazar — özellik paneli formlarının
   * GENEL kapısı (K-tesisat-panel). Her eleman türü kendi opsiyonel alt-alanını
   * (`regulator`, `gasMeter`, ...) bununla yazar; tür başına ayrı bir action
   * gerekmez. Çoklu seçimde TÜMÜNE tek adımda yazılır — `setWallsThickness`
   * ile aynı gerekçe (K16): teker teker yazsaydık her biri kendi Ctrl+Z
   * adımını açardı.
   *
   * Patch DEĞER değil FONKSİYON: her elemanın nested alt-alanı (`regulator`
   * gibi) KENDİ mevcut değerinden türer. Sabit bir patch objesi tüm seçime
   * aynen uygulansaydı (Object.assign sığ birleştirir) bir alanı düzenlemek
   * seçimdeki her elemanın DİĞER alt-alanlarını da ortak bir değere ezerdi —
   * beş regülatörün markasını toplu yazmak modellerini de eşitlerdi.
   */
  patchElements: (
    elementIds: readonly Id[],
    updater: (element: InstallationElement) => Partial<InstallationElement>,
  ) => void
  /** `patchElements` ile aynı gerekçe — hat türü başına özellik alanları için. */
  patchLines: (
    lineIds: readonly Id[],
    updater: (line: InstallationLine) => Partial<InstallationLine>,
  ) => void
  /**
   * Bir elemanın açısını VE konumunu birlikte yazar — döndürme tutamacıyla bir
   * sürükleme = bir Ctrl+Z. Boruya/porta bağlı elemanlarda `position` de
   * değişir: döndürme tutunduğu noktayı (`core/elementRotateHandle.ts` →
   * `getElementRotateAnchorLocal`) DÜNYADA sabit tutacak şekilde yeniden
   * hesaplanır, yoksa gövde borudan kopardı. Çağıran (`useElementRotateTool.ts`)
   * ikisini BİRLİKTE hesaplayıp geçirir; kapsam denetimi (döndürülebilir mi)
   * de orada.
   *
   * `followers`: pivotun DIŞINDA ikinci bir porttan bağlı elemanlarda (ör.
   * branşmandaki sayaç) o ucun bağlı olduğu hat noktasının YENİ konumu — AYNI
   * yazımda (tek `set`/`record`) uygulanır, yoksa döndürme + hat güncellemesi
   * iki ayrı Ctrl+Z adımına bölünürdü. Çoğu elemanda boş dizi.
   */
  rotateElement: (
    elementId: Id,
    angleDeg: number,
    position: PlanPoint,
    followers?: readonly { lineId: Id; pointId: Id; position: PlanPoint }[],
  ) => void
  undoPlumbing: () => void
  redoPlumbing: () => void
}

/** Paylaşılan boş dizi: her çağrıda yeni dizi ayırmamak için. */
const NO_IDS: readonly Id[] = []

export const INITIAL_PLUMBING_DATA: PlumbingSnapshot = {
  installationElements: [],
  installationLines: [],
  installationConnections: [],
  floorPipeLinks: [],
}

export const createPlumbingSlice: StateCreator<
  CadState,
  [['zustand/immer', never]],
  [],
  PlumbingSlice
> = (set, get) => {
  /** Değişimden SONRA aynalanır — zundo bir önceki aynayı geçmişe iter. */
  const record = () => {
    const { installationElements, installationLines, installationConnections, floorPipeLinks } =
      get()
    recordPlumbingHistory({
      installationElements,
      installationLines,
      installationConnections,
      floorPipeLinks,
    })
  }

  const restore = (snapshot: PlumbingSnapshot | null) => {
    if (!snapshot) return
    set((draft) => {
      // Geçmişten geri yazma record() ÇAĞIRMAZ: undo yeni bir geçmiş adımı değildir.
      draft.installationElements = snapshot.installationElements
      draft.installationLines = snapshot.installationLines
      draft.installationConnections = snapshot.installationConnections
      draft.floorPipeLinks = snapshot.floorPipeLinks
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

    if (attachment.kind === 'outlet') {
      // Ağız serbest bir noktadır, "dolu port" diye bir durumu yok; kotayı tür
      // bazında araç denetliyor (canAttachDischarge). Burada yalnız cihazın hâlâ
      // durduğuna bakılır — araya giren bir Ctrl+Z onu silmiş olabilir.
      const element = draft.installationElements.find(
        (candidate) => candidate.id === attachment.elementId,
      )
      if (!element) return null
      return {
        kind: 'outlet',
        elementId: attachment.elementId,
        position: attachment.position,
        direction: attachment.direction,
      }
    }

    if (attachment.kind === 'linePoint') {
      // Hedef gerçekten duruyor mu: zincir çizilirken araya giren bir Ctrl+Z
      // bir önceki adımı silmiş olabilir; körlemesine yazılsaydı kayıt artık
      // olmayan bir hatta işaret ederdi.
      const target = draft.installationLines.find((line) => line.id === attachment.lineId)
      if (!target?.points.some((point) => point.id === attachment.pointId)) return null

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
      // Cihaz silinince EKLENTİLERİ de gider: bacası/havalandırması ve cihaz
      // kolu. İkisi de sahipsiz kalırsa yeniden bağlanamaz — kolu kullanıcı
      // hiç çizemez bile (bkz. core/attachmentLinks.ts).
      const allLineIds = [
        ...lineIds,
        ...collectAttachmentLineIdsForElements(
          draft.installationLines,
          draft.installationConnections,
          elementIds,
        ).filter((id) => !lineIds.includes(id)),
      ]

      // Kolun refakatçi vanası ANA BORUNUN düğümünde oturuyor, kolun üstünde
      // değil: aşağıdaki "silinen hattın armatürleri" taraması onu görmez.
      const companionValveIds = collectCompanionValveIdsForLines(
        draft.installationLines,
        draft.installationConnections,
        draft.installationElements,
        allLineIds,
      )

      const removedLines = draft.installationLines.filter((line) => allLineIds.includes(line.id))
      const removedElementIds = [
        ...elementIds,
        ...companionValveIds,
        ...removedLines.flatMap((line) =>
          line.points
            .map((point) => point.inlineElementId)
            .filter((id): id is Id => id !== undefined),
        ),
      ]

      const remainingElements = draft.installationElements.filter(
        (element) => !removedElementIds.includes(element.id),
      )
      const remainingLines = draft.installationLines.filter(
        (line) => !allLineIds.includes(line.id),
      )
      if (
        remainingElements.length === draft.installationElements.length &&
        remainingLines.length === draft.installationLines.length
      ) {
        return
      }

      // Silinen hattın noktalarından biri bir kat bağlantısının ucuysa o
      // bağlantı da gider — karşı taraf dursa bile artık eşleşecek bir uç kalmaz.
      const removedPointIds = new Set(
        removedLines.flatMap((line) => line.points.map((point) => point.id)),
      )
      draft.floorPipeLinks = draft.floorPipeLinks.filter(
        (link) => !removedPointIds.has(link.belowPointId) && !removedPointIds.has(link.abovePointId),
      )

      draft.installationElements = remainingElements
      draft.installationLines = remainingLines
      draft.installationConnections = draft.installationConnections.filter((connection) => {
        if (allLineIds.includes(connection.lineId)) return false

        const targetElementId = getTargetElementId(connection.target)
        if (targetElementId !== null && removedElementIds.includes(targetElementId)) return false

        return connection.target.kind !== 'line' || !allLineIds.includes(connection.target.lineId)
      })

      // Kalan hatlarda silinen armatüre işaret eden düğüm boşa çıkar. Komşu iki
      // segmentle aynı doğru üzerindeyse (armatür zaten DÜZ bir boruyu ayırarak
      // oraya oturmuştu) köşenin artık geometrik anlamı kalmaz — birleştirilir,
      // yoksa silinen filtre kiti/vana gibi elemanların yerinde anlamsız bir
      // köşe asılı kalırdı. Kullanıcı köşeyi sonradan sürükleyip açı verdiyse
      // (artık kolinear değil) dokunulmaz — o zaman gerçek bir geometridir.
      for (const line of draft.installationLines) {
        const freedPointIds: Id[] = []
        for (const point of line.points) {
          if (point.inlineElementId === undefined) continue
          if (!removedElementIds.includes(point.inlineElementId)) continue
          delete point.inlineElementId
          freedPointIds.push(point.id)
        }

        for (const pointId of freedPointIds) {
          const isAnchorForOtherLine = draft.installationConnections.some(
            (connection) =>
              connection.target.kind === 'line' &&
              connection.target.lineId === line.id &&
              connection.target.pointId === pointId,
          )
          if (isAnchorForOtherLine) continue

          const collapsibleIndex = findCollapsiblePassThroughIndex(line.points, pointId)
          if (collapsibleIndex === null) continue

          const point = line.points[collapsibleIndex]
          const beforeSegment = line.segments.find((segment) => segment.toPointId === point.id)
          const afterSegment = line.segments.find((segment) => segment.fromPointId === point.id)
          if (!beforeSegment || !afterSegment) continue

          beforeSegment.toPointId = afterSegment.toPointId
          line.segments = line.segments.filter((segment) => segment.id !== afterSegment.id)
          line.points = line.points.filter((candidate) => candidate.id !== point.id)
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

  /** Hat + noktaları + parçaları; nokta id'leri SIRAYLA döner (yapıştırma bağları
   *  dizinle kuruyor). Çizim ve cihaz kolu aynı yoldan geçer. */
  const pushLine = (
    draft: Pick<CadState, 'installationLines' | 'activeFloorId' | 'nextUniqueId'>,
    input: {
      kind: InstallationLineKind
      pipeTypeName: PipeTypeName
      points: readonly PlanPoint[]
      pipe?: PipeLineProperties
      branch?: BranchLineProperties
    },
  ): { lineId: Id; pointIds: Id[] } => {
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
      ...(input.pipe ? { pipe: input.pipe } : {}),
      ...(input.branch ? { branch: input.branch } : {}),
    })
    return { lineId: id, pointIds: points.map((point) => point.id) }
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

    pasteEntries: (elementInputs, lineInputs, clipboardConnections) => {
      if (elementInputs.length === 0 && lineInputs.length === 0) return { elementIds: [], lineIds: [] }

      const elementIds: Id[] = []
      const lineIds: Id[] = []
      set((draft) => {
        for (const input of elementInputs) {
          elementIds.push(pushElement(draft, input))
        }

        // Nokta id'leri hat SIRASIYLA saklanır: kopyalanan bağlar dizine bakıyor,
        // id'ye çevrimi burada oluyor (kural 6: id yeniden üretilmez, YENİSİ üretilir).
        const pointIdsByLine: Id[][] = []
        for (const input of lineInputs) {
          const created = pushLine(draft, input)
          lineIds.push(created.lineId)
          pointIdsByLine.push(created.pointIds)
        }

        // Kopyanın kaynağıyla AYNI davranması için bağlar da yeniden kurulur:
        // yoksa yapıştırılan boru ile sayaç bitişik GÖRÜNÜR ama bağlı olmaz,
        // taşıyınca birbirinden ayrılırlardı.
        for (const connection of clipboardConnections) {
          const lineId = lineIds[connection.lineIndex]
          if (lineId === undefined) continue

          if (connection.kind === 'inline') {
            const elementId = elementIds[connection.elementIndex]
            const pointId = pointIdsByLine[connection.lineIndex]?.[connection.pointIndex]
            if (elementId === undefined || pointId === undefined) continue

            const line = draft.installationLines.find((candidate) => candidate.id === lineId)
            const point = line?.points.find((candidate) => candidate.id === pointId)
            if (point) point.inlineElementId = elementId
            continue
          }

          if (connection.kind === 'port') {
            const elementId = elementIds[connection.elementIndex]
            if (elementId === undefined) continue

            draft.installationConnections.push({
              lineId,
              end: connection.end,
              target: { kind: 'port', elementId, portId: connection.portId },
            })
            continue
          }

          if (connection.kind === 'outlet') {
            const elementId = elementIds[connection.elementIndex]
            if (elementId === undefined) continue

            draft.installationConnections.push({
              lineId,
              end: connection.end,
              target: {
                kind: 'outlet',
                elementId,
                position: connection.position,
                direction: connection.direction,
              },
            })
            continue
          }

          const targetLineId = lineIds[connection.targetLineIndex]
          const targetPointId =
            pointIdsByLine[connection.targetLineIndex]?.[connection.targetPointIndex]
          if (targetLineId === undefined || targetPointId === undefined) continue

          draft.installationConnections.push({
            lineId,
            end: connection.end,
            target: { kind: 'line', lineId: targetLineId, pointId: targetPointId },
          })
        }

        markDirty(draft)
      })
      record()
      return { elementIds, lineIds }
    },

    removeElements: (elementIds) => applyRemoval(elementIds, NO_IDS),

    removeSelection: (elementIds, lineIds) => applyRemoval(elementIds, lineIds),

    moveElements: (elementIds, lineIds, deltaCm) => {
      let isMoved = false
      const shift = (point: PlanPoint): PlanPoint => ({
        x: point.x + deltaCm.x,
        y: point.y + deltaCm.y,
      })

      set((draft) => {
        // NE kayacağı önce TEK hesapta çözülür (saf, sıraya bağlı değil), kayma
        // sonra bir kez uygulanır: kaynak bağlar korunur, hiçbir nokta iki kez
        // kaymaz. Gerekçesi core/moveTargets.ts'te.
        const targets = resolveMoveTargets(
          draft.installationLines,
          draft.installationConnections,
          draft.floorPipeLinks,
          elementIds,
          lineIds,
        )

        for (const element of draft.installationElements) {
          if (!targets.elementIds.has(element.id)) continue
          element.position = shift(element.position)
          isMoved = true
        }

        for (const line of draft.installationLines) {
          for (const point of line.points) {
            if (!targets.pointIds.has(point.id)) continue
            point.position = shift(point.position)
            isMoved = true
          }
        }

        if (!isMoved) return
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

        // Düğüme tutunan hat uçları (branşman, cihaz kolu, komşu boru adımı) da
        // yeni konuma gelir: armatür kaydırılırken onlar yerinde kalsaydı KOPARDI
        // (`moveLinePoint` ile aynı kural).
        for (const link of getLinkedLinePoints(
          draft.installationLines,
          draft.installationConnections,
          lineId,
          pointId,
        )) {
          const linkedLine = draft.installationLines.find(
            (candidate) => candidate.id === link.lineId,
          )
          const linkedPoint = linkedLine?.points.find((candidate) => candidate.id === link.pointId)
          if (linkedPoint) linkedPoint.position = nodePosition
        }

        element.position = elementPosition
        isChanged = true
        markDirty(draft)
      })

      if (isChanged) record()
    },

    moveLinePoint: (lineId, pointId, position) => {
      let isMoved = false

      set((draft) => {
        const linked = getLinkedLinePoints(
          draft.installationLines,
          draft.installationConnections,
          lineId,
          pointId,
        )

        // Köşede bir ELEMAN PORTUNA oturan uç varsa köşe hiç oynamaz: o uç
        // konumunu porttan alıyor, çekilseydi elemandan KOPARDI. Kısmen taşımak
        // da olmaz — köşe tek düğüm, ya hepsi gider ya hiçbiri. Bir `FloorPipeLink`
        // ucu da AYNI gerekçeyle çapa (kullanıcı isteği, 2026-08): kayarsa link'in
        // sakladığı `position` gerçek uçtan ayrışır.
        const anchored = getPortAnchoredPointIds(
          draft.installationLines,
          draft.installationConnections,
        )
        const floorLinkAnchored = getFloorLinkAnchoredPointIds(draft.floorPipeLinks)
        if (linked.some((link) => anchored.has(link.pointId) || floorLinkAnchored.has(link.pointId))) return

        for (const link of linked) {
          const line = draft.installationLines.find((candidate) => candidate.id === link.lineId)
          const point = line?.points.find((candidate) => candidate.id === link.pointId)
          if (!point) continue
          if (point.position.x === position.x && point.position.y === position.y) continue

          point.position = position
          isMoved = true

          if (point.inlineElementId !== undefined) {
            const element = draft.installationElements.find(
              (candidate) => candidate.id === point.inlineElementId,
            )
            if (element) element.position = position
          }
        }

        if (isMoved) markDirty(draft)
      })

      if (isMoved) record()
    },

    /**
     * "Boy" alanı: borunun BİTİŞ ucu hedefe kayar ve ucuna bağlı ne varsa
     * (dirsek, vana, sayaç, devam boruları ve onların üstündeki elemanlar)
     * AYNI KAYMAYLA ötelenir — hiçbiri gerilmez (kullanıcı isteği, 2026-08).
     * Kimin öteleneceği saf hesapta: `core/resizeTargets.ts`. Eskiden yalnız
     * o köşedeki kaynaklı uçlar hedefe taşınıyordu (devam borusu ESNİYORDU) ve
     * yayılım bir port çapasına değerse işlem TÜMÜYLE reddediliyordu.
     *
     * Kot farkı da aynı mantıkla taşınır: bütünüyle ötelenen borular
     * `startHeightCm`/`endHeightCm`'lerini delta kadar kaydırır, yoksa eğik
     * bir boru kısaldığında ağın geri kalanı 3B'de kopardı.
     */
    resizePipeEnd: (lineId, endPointId, position, endHeightCm) => {
      let isChanged = false

      set((draft) => {
        const line = draft.installationLines.find((candidate) => candidate.id === lineId)
        const endPoint = line?.points.find((candidate) => candidate.id === endPointId)
        if (!line || !endPoint) return

        const deltaX = position.x - endPoint.position.x
        const deltaY = position.y - endPoint.position.y
        const deltaHeightCm = endHeightCm - (line.pipe?.endHeightCm ?? 0)

        // Kayma UYGULANMADAN önce hesaplanır: küme mevcut bağ durumuna bakar.
        const shift = resolvePipeResizeShift(
          draft.installationLines,
          draft.installationConnections,
          draft.floorPipeLinks,
          lineId,
          endPointId,
        )

        if (deltaX !== 0 || deltaY !== 0) {
          endPoint.position = position
          isChanged = true

          for (const candidate of draft.installationLines) {
            for (const point of candidate.points) {
              if (!shift.pointIds.has(point.id)) continue
              point.position = { x: point.position.x + deltaX, y: point.position.y + deltaY }
            }
          }
          for (const element of draft.installationElements) {
            if (!shift.elementIds.has(element.id)) continue
            element.position = { x: element.position.x + deltaX, y: element.position.y + deltaY }
          }
        }

        if (deltaHeightCm !== 0) {
          for (const candidate of draft.installationLines) {
            if (!shift.lineIds.has(candidate.id) || !candidate.pipe) continue
            candidate.pipe.startHeightCm += deltaHeightCm
            candidate.pipe.endHeightCm += deltaHeightCm
          }
        }

        if (!line.pipe || line.pipe.endHeightCm !== endHeightCm) {
          line.pipe = { description: '', startHeightCm: 0, ...line.pipe, endHeightCm }
          isChanged = true
        }

        if (isChanged) markDirty(draft)
      })

      if (isChanged) record()
    },

    // Hat + her nokta + her segment + bağlantı kayıtları TEK set() içinde üretilir:
    // tek geçmiş adımı, tek Ctrl+Z (Risk R11). Bir boru ADIMI = bir adım (K-W).
    addLine: (input) => {
      if (!hasEnoughPoints(input.points)) return null

      let created: AddLineResult | null = null
      set((draft) => {
        const pushed = pushLine(draft, {
          kind: input.kind,
          pipeTypeName: input.pipeTypeName ?? DEFAULT_PIPE_TYPE_NAME,
          points: input.points,
          pipe: input.pipe,
          branch: input.branch,
        })

        const attachments = [
          { end: 'start', attachment: input.startTarget },
          { end: 'end', attachment: input.endTarget },
        ] as const
        for (const { end, attachment } of attachments) {
          if (!attachment) continue

          const target = resolveAttachment(draft, attachment)
          if (target) draft.installationConnections.push({ lineId: pushed.lineId, end, target })
        }

        markDirty(draft)
        created = {
          lineId: pushed.lineId,
          startPointId: pushed.pointIds[0],
          endPointId: pushed.pointIds[pushed.pointIds.length - 1],
        }
      })
      record()
      return created
    },

    addFloorPipeLink: (input) => {
      let createdId: Id = 0
      set((draft) => {
        createdId = takeNextId(draft)
        draft.floorPipeLinks.push({ id: createdId, ...input })
        markDirty(draft)
      })
      record()
      return createdId
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

        // Bu eylem YALNIZ sayaç için kullanılır (`attachModes.ts`: `lineEnd`
        // yalnız gasMeter'da) — saha uygulamasında sayaç duvara ~2 m'de monte
        // edilir, borunun varsayılan zemin kotunda (0) kalması gerçekçi
        // olmazdı (kullanıcı isteği, 2026-08). Düz kot: eğim yok, K102'nin
        // `+`/`- ile kullanıcı sonradan değiştirebilir. `branchStub` de dahil
        // (kullanıcı isteği, 2026-08): branşman aracında sayaç HEP bu koldan
        // takılır, oradan geldiyse de kot atlanmamalı.
        if (line.kind === 'pipe' || line.kind === 'branchStub') {
          line.pipe = {
            description: '',
            ...line.pipe,
            startHeightCm: GAS_METER_DEFAULT_HEIGHT_CM,
            endHeightCm: GAS_METER_DEFAULT_HEIGHT_CM,
          }
        }

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
        const { lineId: stubId } = pushLine(draft, {
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
          // Baca/havalandırma çapsızdır: seçimde boruyla birlikte olsa bile
          // kaydı kirletilmez (alan yazılır ama okunmaz).
          if (!isGasCarryingKind(line.kind)) continue

          line.pipeTypeName = pipeTypeName
          isChanged = true
        }

        if (isChanged) markDirty(draft)
      })

      if (isChanged) record()
    },

    setElementLabelOffset: (elementId, offsetCm) => {
      let isChanged = false

      set((draft) => {
        const element = draft.installationElements.find(
          (candidate) => candidate.id === elementId,
        )
        if (!element) return
        if (
          element.labelOffsetCm?.x === offsetCm.x &&
          element.labelOffsetCm?.y === offsetCm.y
        ) {
          return
        }

        element.labelOffsetCm = offsetCm
        isChanged = true
        markDirty(draft)
      })

      if (isChanged) record()
    },

    setElementIsometricLabelOffset: (elementId, offsetCm) => {
      let isChanged = false

      set((draft) => {
        const element = draft.installationElements.find(
          (candidate) => candidate.id === elementId,
        )
        if (!element) return
        if (
          element.isometricLabelOffsetCm?.x === offsetCm.x &&
          element.isometricLabelOffsetCm?.y === offsetCm.y
        ) {
          return
        }

        element.isometricLabelOffsetCm = offsetCm
        isChanged = true
        markDirty(draft)
      })

      if (isChanged) record()
    },

    setLineIsometricLabelOffset: (lineId, offsetCm) => {
      let isChanged = false

      set((draft) => {
        const line = draft.installationLines.find((candidate) => candidate.id === lineId)
        if (!line) return
        if (
          line.isometricLabelOffsetCm?.x === offsetCm.x &&
          line.isometricLabelOffsetCm?.y === offsetCm.y
        ) {
          return
        }

        line.isometricLabelOffsetCm = offsetCm
        isChanged = true
        markDirty(draft)
      })

      if (isChanged) record()
    },

    applyIsometricLineDrag: (lineId, pointId, deltaCm) => {
      if (deltaCm.x === 0 && deltaCm.y === 0) return

      let isChanged = false

      set((draft) => {
        const line = draft.installationLines.find((candidate) => candidate.id === lineId)
        if (!line) return

        const next = applyIsometricDrag(line.points, pointId, deltaCm)
        // Referans karşılaştırması yetiyor: dokunulmayan nokta AYNI nesneyle
        // geri geliyor (bkz. isometricOffset.ts).
        if (next.every((point, index) => point === line.points[index])) return

        line.points = next
        isChanged = true
        markDirty(draft)
      })

      if (isChanged) record()
    },

    resetIsometricPositions: () => {
      let isChanged = false

      set((draft) => {
        for (const line of draft.installationLines) {
          const cleared = clearIsometricOffsets(line.points)
          // Referans karşılaştırması yetiyor: `clearIsometricOffsets` temiz
          // noktayı AYNI nesneyle geri veriyor (bkz. isometricOffset.ts).
          if (cleared.some((point, index) => point !== line.points[index])) {
            line.points = cleared
            isChanged = true
          }
          if (line.isometricLabelOffsetCm) {
            delete line.isometricLabelOffsetCm
            isChanged = true
          }
        }

        for (const element of draft.installationElements) {
          if (!element.isometricLabelOffsetCm) continue
          delete element.isometricLabelOffsetCm
          isChanged = true
        }

        if (isChanged) markDirty(draft)
      })

      if (isChanged) record()
    },

    patchElements: (elementIds, updater) => {
      let isChanged = false

      set((draft) => {
        for (const element of draft.installationElements) {
          if (!elementIds.includes(element.id)) continue
          Object.assign(element, updater(element))
          isChanged = true
        }
        if (isChanged) markDirty(draft)
      })

      if (isChanged) record()
    },

    patchLines: (lineIds, updater) => {
      let isChanged = false

      set((draft) => {
        for (const line of draft.installationLines) {
          if (!lineIds.includes(line.id)) continue
          Object.assign(line, updater(line))
          isChanged = true
        }
        if (isChanged) markDirty(draft)
      })

      if (isChanged) record()
    },

    rotateElement: (elementId, angleDeg, position, followers = []) => {
      let isChanged = false

      set((draft) => {
        const element = draft.installationElements.find(
          (candidate) => candidate.id === elementId,
        )
        if (!element) return

        const isElementSame =
          element.angleDeg === angleDeg &&
          element.position.x === position.x &&
          element.position.y === position.y
        if (isElementSame && followers.length === 0) return

        element.angleDeg = angleDeg
        element.position = position
        isChanged = true

        for (const follower of followers) {
          const line = draft.installationLines.find((candidate) => candidate.id === follower.lineId)
          const point = line?.points.find((candidate) => candidate.id === follower.pointId)
          if (point) point.position = follower.position
        }

        markDirty(draft)
      })

      if (isChanged) record()
    },

    undoPlumbing: () => restore(undoPlumbingHistory()),
    redoPlumbing: () => restore(redoPlumbingHistory()),
  }
}
