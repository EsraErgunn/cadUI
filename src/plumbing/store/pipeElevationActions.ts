import { usePlumbingUiStore } from './plumbingUiStore'
import type { PlanPoint } from '../../core/coords'
import { getFloorIdInDirection } from '../../core/floors'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { advanceChain, startChain } from '../core/lineChain'
import {
  capElevationToFloor,
  capElevationToFloorBase,
  clampPipeHeightCm,
  findMergeablePipeLineId,
} from '../core/lineElevation'

/** Proje geneli kat sınırıyla AYNI (`core/floors.ts`) — sonsuz döngüye karşı sağduyu sınırı. */
const MAX_FLOOR_CROSSINGS = 40

/**
 * Zincirin ucundan AYNI plan konumunda, kotu hedefe değişmiş ikinci bir boru
 * yazar (K102) — normal sol-tık commit'iyle (`addLine`) AYNI yoldan geçer, ayrı
 * bir "kolon yaz" fonksiyonu yok. `DraftKeyboardInput`'un `+`/`-` kipi bu
 * fonksiyonu çağırır.
 *
 * Zincirin ucu ZATEN aynı konumdaki bir dikey segmentin bitişindeyse yeni bir
 * boru YAZILMAZ: var olanın `endHeightCm`'i güncellenir
 * (`findMergeablePipeLineId`) — yoksa üst üste binen ayrı bir boru bırakırdı
 * (kullanıcı isteği, 2026-08: "toplansın ve yazsın").
 *
 * Hedef kot AKTİF KATIN TAVANINI (`Floor.heightCm`) aşarsa (kullanıcı isteği,
 * 2026-08, bkz. knowledge/pipe-floor-crossing.md): bu katta yazılan kot
 * tavanla sınırlanır (`capElevationToFloor`) ve kalan miktar otomatik olarak
 * bir üst kata `crossFloorsWithOverflow` ile taşınır — K102'nin "otomatik
 * kolon YOK" kararı bilinçli olarak geride bırakıldı.
 *
 * TABANIN altına inerse aynısı aşağı yönde olur (K135,
 * `capElevationToFloorBase` + `crossFloorsDownWithUnderflow`) — K104'ün
 * "yalnız yukarı" sınırı kullanıcı isteğiyle kalktı. İki taşma aynı anda
 * OLAMAZ: tek bir hedef kot ya tavanı aşar ya tabanı deler.
 *
 * Hook DEĞİL: `clipboardActions.ts` ile aynı gerekçe, cadStore (çizim) ile
 * plumbingUiStore (taslak) arasında köprü, React'e ihtiyaç yok.
 */
function commitDraftElevation(targetCm: number): boolean {
  const draft = usePlumbingUiStore.getState().draftLine
  if (!draft || draft.kind !== 'pipe') return false

  const nextElevationCm = clampPipeHeightCm(targetCm)
  if (nextElevationCm === draft.elevationCm) return false

  const cad = useCadStore.getState()
  const floor = cad.floors.find((candidate) => candidate.id === cad.activeFloorId)
  if (!floor) return false
  const ceilingCap = capElevationToFloor(nextElevationCm, floor.heightCm)
  const cap = capElevationToFloorBase(ceilingCap.endHeightCm)

  const mergeableLineId = findMergeablePipeLineId(draft.anchor, draft.startTarget, cad.installationLines)
  // Yön-nötr ad: yukarı geçişte alttaki, aşağı geçişte ÜSTTEKİ kattaki uç.
  let chainEndPointId: Id
  if (mergeableLineId !== null) {
    useCadStore.getState().patchLines([mergeableLineId], (line) => ({
      pipe: { description: '', startHeightCm: 0, ...line.pipe, endHeightCm: cap.endHeightCm },
    }))
    const mergedLine = useCadStore
      .getState()
      .installationLines.find((candidate) => candidate.id === mergeableLineId)
    if (!mergedLine) return false
    chainEndPointId = mergedLine.points[1].id
    usePlumbingUiStore.getState().setDraftLine({ ...draft, elevationCm: cap.endHeightCm })
  } else {
    const written = useCadStore.getState().addLine({
      kind: draft.kind,
      points: [draft.anchor, draft.anchor],
      pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
      startTarget: draft.startTarget ?? undefined,
      pipe: { startHeightCm: draft.elevationCm, endHeightCm: cap.endHeightCm, description: '' },
    })
    if (!written) return false
    chainEndPointId = written.endPointId
    usePlumbingUiStore
      .getState()
      .setDraftLine({ kind: draft.kind, ...advanceChain(draft, draft.anchor, written, cap.endHeightCm) })
  }

  if (ceilingCap.overflowCm > 0) {
    crossFloorsWithOverflow(draft.anchor, cad.activeFloorId, chainEndPointId, ceilingCap.overflowCm)
  } else if (cap.underflowCm > 0) {
    crossFloorsDownWithUnderflow(draft.anchor, cad.activeFloorId, chainEndPointId, cap.underflowCm)
  }
  return true
}

/**
 * Kat tavanını aşan kot: sırayla üstteki kat(lar)a `FloorPipeLink` ile
 * otomatik geçilir (kullanıcı isteği, 2026-08). Kat bağlantısını kuran TEK
 * akış artık bu: ok-tuşuyla MANUEL kat bağlama (`floorLinkActions.ts`)
 * klavyeden kat değiştirmeyle birlikte KALDIRILDI, `FloorPipeLink` yalnız
 * buradan doğuyor. Üç primitive'i (`addLine`, `addFloorPipeLink`, gerekirse
 * `addFloor`) doğrudan, döngülü çağırır. Her
 * primitive kendi `set()`+`record()`'unu yaptığı için (K-W) çok katlı bir
 * geçişte birden çok Ctrl+Z adımı oluşması KABUL EDİLEBİLİR — manuel akış da
 * zaten `addLine`/`addFloorPipeLink`'i ayrı adımlar olarak çağırıyordu
 * (`useLineTool.ts` → `commitStep`), burada yeni bir emsal kurulmuyor.
 *
 * Kalan tek katın tavanını da aşarsa (nadir: çok büyük bir kot sıçraması)
 * döngü bir üstteki kata devam eder; proje 40 kat sınırına ulaşılırsa
 * (`addFloor` `undefined` döner) sessizce durur — kalan kısım yazılmadan
 * kalır, hata gösterilmez (dosyadaki diğer sınırların stiliyle aynı, bkz.
 * `clampPipeHeightCm`).
 */
function crossFloorsWithOverflow(
  position: PlanPoint,
  startFloorId: Id,
  startPointId: Id,
  overflowCm: number,
): void {
  let belowFloorId = startFloorId
  let belowPointId = startPointId
  let remainingCm = overflowCm

  for (let step = 0; step < MAX_FLOOR_CROSSINGS && remainingCm > 0; step += 1) {
    let aboveFloorId = getFloorIdInDirection(useCadStore.getState().floors, belowFloorId, 'up')
    if (aboveFloorId === undefined) {
      aboveFloorId = useCadStore.getState().addFloor({})
      if (aboveFloorId === undefined) break
    }
    useCadStore.getState().setActiveFloor(aboveFloorId)

    const aboveFloor = useCadStore.getState().floors.find((candidate) => candidate.id === aboveFloorId)
    if (!aboveFloor) break
    const cap = capElevationToFloor(remainingCm, aboveFloor.heightCm)

    const written = useCadStore.getState().addLine({
      kind: 'pipe',
      points: [position, position],
      pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
      pipe: { startHeightCm: 0, endHeightCm: cap.endHeightCm, description: '' },
    })
    if (!written) break

    useCadStore.getState().addFloorPipeLink({
      belowFloorId,
      aboveFloorId,
      belowPointId,
      abovePointId: written.startPointId,
      position,
    })

    belowFloorId = aboveFloorId
    belowPointId = written.endPointId
    remainingCm = cap.overflowCm

    if (remainingCm <= 0) {
      usePlumbingUiStore.getState().setDraftLine({
        kind: 'pipe',
        ...startChain(
          position,
          { kind: 'linePoint', lineId: written.lineId, pointId: written.endPointId },
          cap.endHeightCm,
        ),
      })
    }
  }
}

/**
 * Kat TABANINI delen kot: sırayla alttaki kat(lar)a `FloorPipeLink` ile
 * otomatik inilir — `crossFloorsWithOverflow`un aynası (K135, kullanıcı
 * isteği 2026-08: "boruya `-` yükseklik girince kat yüksekliğinden fazlaysa
 * alt kata insin").
 *
 * Aynanın TEK asimetrisi alt kata hangi kottan girildiği: yukarı çıkarken yeni
 * kata TABANINDAN (0) girilir, aşağı inerken TAVANINDAN (`Floor.heightCm`) —
 * üst katın tabanı alttakinin tavanıdır. Bu yüzden yeni borunun
 * `startHeightCm`i sıfır değil alt katın yüksekliğidir ve kot aşağı doğru
 * tüketilir.
 *
 * Sınırda kat yoksa `addFloor({ isBasement: true })` çağrılır — `addFloor({})`
 * katı HER ZAMAN dizinin en ÜSTÜNE koyar, bodrum bloğu ise BAŞINDA durur
 * (K106'nın tuzağı, bkz. knowledge/pipe-floor-crossing.md).
 */
function crossFloorsDownWithUnderflow(
  position: PlanPoint,
  startFloorId: Id,
  startPointId: Id,
  underflowCm: number,
): void {
  let aboveFloorId = startFloorId
  let abovePointId = startPointId
  let remainingCm = underflowCm

  for (let step = 0; step < MAX_FLOOR_CROSSINGS && remainingCm > 0; step += 1) {
    let belowFloorId = getFloorIdInDirection(useCadStore.getState().floors, aboveFloorId, 'down')
    if (belowFloorId === undefined) {
      belowFloorId = useCadStore.getState().addFloor({ isBasement: true })
      if (belowFloorId === undefined) break
    }
    useCadStore.getState().setActiveFloor(belowFloorId)

    const belowFloor = useCadStore.getState().floors.find((candidate) => candidate.id === belowFloorId)
    if (!belowFloor) break
    const cap = capElevationToFloorBase(belowFloor.heightCm - remainingCm)

    const written = useCadStore.getState().addLine({
      kind: 'pipe',
      points: [position, position],
      pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
      pipe: { startHeightCm: belowFloor.heightCm, endHeightCm: cap.endHeightCm, description: '' },
    })
    if (!written) break

    useCadStore.getState().addFloorPipeLink({
      belowFloorId,
      aboveFloorId,
      belowPointId: written.startPointId,
      abovePointId,
      position,
    })

    aboveFloorId = belowFloorId
    abovePointId = written.endPointId
    remainingCm = cap.underflowCm

    if (remainingCm <= 0) {
      usePlumbingUiStore.getState().setDraftLine({
        kind: 'pipe',
        ...startChain(
          position,
          { kind: 'linePoint', lineId: written.lineId, pointId: written.endPointId },
          cap.endHeightCm,
        ),
      })
    }
  }
}

/**
 * `+`/`-` kutusu: zincirin kotunu yazılan MİKTAR kadar yükseltir/alçaltır
 * (kullanıcı isteği, 2026-08). Girdi mutlak hedef DEĞİL fark: yön zaten
 * basılan tuşta (`+` yukarı, `-` aşağı), kullanıcı yalnız kaç cm çıkacağını
 * yazar — mutlak hedef istenseydi tuşun işareti anlamsız kalırdı.
 */
export function commitDraftElevationBy(deltaCm: number): boolean {
  const draft = usePlumbingUiStore.getState().draftLine
  if (!draft || draft.kind !== 'pipe') return false

  return commitDraftElevation(draft.elevationCm + deltaCm)
}
