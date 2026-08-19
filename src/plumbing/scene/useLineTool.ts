import { useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import { resolvePlacementPosition } from './placementSnap'
import { getSnapRadiusCm, getWallEdgeGapCm } from './snapRadius'
import { getSymbolMetadata } from './symbolLoader'
import type { PlanPoint } from '../../core/coords'
import { isTypingTarget } from '../../core/domEvents'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { resolveFreeEndAttachment } from '../core/elementAttach'
import type { InstallationLineKind, LineEndAttachment } from '../core/installationModel'
import { getGasLineKind, INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'
import { advanceChain, startChain } from '../core/lineChain'
import {
  BRANCH_SEED_HEIGHT_CM,
  resolveSeedElevationCm,
  SERVICE_BOX_SEED_HEIGHT_CM,
} from '../core/lineElevation'
import { isSamePoint } from '../core/lineGeometry'
import { isGasCarryingKind } from '../core/lineKinds'
import { getLineSeedElementType, getSeedPort, hasServiceBox } from '../core/lineSeed'
import { findNearestPointOnLines, type LineSnapCandidate } from '../core/lineSnap'
import { findNearestFreePort, type PortCandidate } from '../core/portSnap'
import { getPortWorldPosition } from '../core/ports'
import { findNearestWallCorner, findNearestWallFace, findNearestWallParallel } from '../core/wallSnap'
import { commitDraftFloorLink } from '../store/floorLinkActions'
import { usePlumbingUiStore, type LineDraft } from '../store/plumbingUiStore'

const LEFT_BUTTON = 0

/**
 * `resolveFreeEndAttachment` bir yarıçap içinde arar; branşmanın ikinci tıkı az
 * önce yazılan `branchStub`'ın ucuyla TAM ÇAKIŞIYOR (mesafe 0) — büyük bir sabit
 * yeterli, zoom'a bağlı gerçek yakalama yarıçapına ihtiyaç yok.
 */
const BRANCH_METER_ATTACH_RADIUS_CM = 100_000

/** İmlecin yakalandığı yer. Sahne bunu vurgular; biçim türe göre değişir. */
export type LineToolSnap =
  | { kind: 'port'; position: PlanPoint; port: PortCandidate }
  | { kind: 'line'; position: PlanPoint; line: LineSnapCandidate }

export type LineToolState = {
  /** Hat aracı kapalıysa null — lastik bant da çizilmez. */
  kind: InstallationLineKind | null
  /** Snap uygulanmış imleç. useFrame okur; her pointermove React render'ı tetiklemesin. */
  cursorRef: RefObject<PlanPoint | null>
  /** İmlecin yakaladığı hedef; boşluktaysa null. */
  snapRef: RefObject<LineToolSnap | null>
}

/** Yakalanan hedefin store'a gidecek hâli. Boruya düşen uç, kaydı yazılırken o
 *  boruyu AYIRIR — köşeye düştüyse ayırmaz, var olan köşeye bağlanır. */
function toAttachment(snap: LineToolSnap): LineEndAttachment {
  if (snap.kind === 'port') {
    return { kind: 'port', elementId: snap.port.elementId, portId: snap.port.portId }
  }
  if (snap.line.pointId !== undefined) {
    return { kind: 'linePoint', lineId: snap.line.lineId, pointId: snap.line.pointId }
  }
  return {
    kind: 'lineSplit',
    lineId: snap.line.lineId,
    segmentIndex: snap.line.segmentIndex,
    position: snap.line.position,
  }
}

/**
 * Zincirleme boru çizimi. `pipe` ve `branch` aynı hook'u paylaşır; fark yalnız
 * `kind` alanıdır. Araç mantığı DrawSurface'e YAZILMAZ (kural 7).
 *
 * **Her sol tık KENDİ borusunu yazar** (K-W): iki tık arası bir adım = bir
 * `InstallationLine`. Bir sonraki adım bir öncekinin ucuna bağlantı kaydıyla
 * tutunur, böylece köşe sürüklenince komşu adım da gelir
 * (`core/lineCornerLink.ts`). Eskiden tüm zincir tek çok noktalı hat olarak
 * bitişte yazılıyordu; adımlar ayrı olunca her boru tek başına seçilebiliyor,
 * silinebiliyor ve kendi çapını alabiliyor.
 *
 * Jestler: sol tık adımı yazar ve köşe bırakır · sağ tık İKİ ADIMLI (duvar
 * aracıyla aynı desen, K84): zincir sürerken tek sağ tık orada DURDURUR
 * (yazılmış adımlar KALIR, geri alınmaz — yalnız taslak temizlenir), araç
 * aktif kalır ki başka bir yerden hemen yeni bir boruya başlanabilsin;
 * taslak boşken sağ tık araçtan çıkar (Seçim aracına döner) · Esc çizimi
 * bırakır (yazılmış adımlar kalır, araç aktif kalır) · porta ya da mevcut bir
 * boruya sol tık zinciri orada bağlayıp BİTİRİR, araç aktif kalır.
 */
export function useLineTool(): LineToolState {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const cursorRef = useRef<PlanPoint | null>(null)
  const snapRef = useRef<LineToolSnap | null>(null)
  const kind = getGasLineKind(activeToolId)

  useEffect(() => {
    if (!kind || !(camera instanceof OrthographicCamera)) return undefined

    const readDraft = () => usePlumbingUiStore.getState().draftLine
    const writeDraft = (draft: LineDraft | null) =>
      usePlumbingUiStore.getState().setDraftLine(draft)

    /**
     * Öncelik: port > mevcut boru > duvar köşesi (keskin) > yön kelepçesi
     * (yalnız bir duvar YAKINDAYKEN) > tamamen serbest imleç. Ctrl ızgarayı
     * kapatır (eleman sürüklemesiyle aynı jest) ama port/boru/köşe/yön
     * yakalamasını kapatmaz: bağlantı kurmak serbest konumlandırmadan daha
     * güçlü bir niyettir.
     *
     * **Borular her zaman serbest hareket eder** (kullanıcı isteği, 2026-08):
     * eskiden duvar yokken bile dünya eksenine (yatay/dikey) zorlanıyordu; bu
     * kısıtlama KALKTI — bir duvar `radiusCm` içinde DEĞİLSE imleç ÇAPRAZ dahil
     * aynen izlenir. Yalnız bir duvar YAKINDAYKEN yön o duvarın AÇISINA
     * paralel ya da dik iki eksenden imlece en yakın olana kelepçelenir
     * (`findNearestWallParallel`) — bu da HER karede yeniden hesaplanır,
     * KİLİTLENMEZ ("hiçbir zaman tek eksene yapışmasın"): imleç iki eksene
     * yakınken kare kare farklı eksen seçilebilir, bu kasıtlı.
     *
     * Duvarın KENDİSİ (gövdesi VE köşeleri) YASAKLI ALAN — boru asla üstüne
     * binmez: gövdeye `getWallEdgeGapCm` kadar (ekran pikseli) yaklaşabilir,
     * köşeye (uç/T/X birleşim) toleranstaysa yapışma bunun ÖNÜNE geçer ve
     * KESKİNdir, ama sonuç yine köşenin kendisi değil oradaki duvarların
     * payını temizleyen bir nokta (`findNearestWallCorner`). Bunların hiçbiri
     * BAĞLANTI KAYDI ÜRETMEZ (`snap: null`) — yalnız konumu/yönü kelepçeler.
     * Zincirin İLK noktasında (henüz anchor yokken, yani `draftLine` boşken)
     * bunların hiçbirinin etkisi yok — yön iki noktalı bir segmentin özelliği,
     * tek bir başlangıç noktasının değil; ilk nokta düz ızgaraya düşer (bir
     * hedefe düşmezse ve ön eleman gerekmiyorsa jest zaten `startDraft`te
     * reddedilir, bkz. aşağı).
     */
    const resolveSnap = (
      event: DrawSurfacePointerEvent,
    ): { point: PlanPoint; snap: LineToolSnap | null } => {
      const { zoom } = readCameraViewport(camera)
      const radiusCm = getSnapRadiusCm(zoom)
      const cad = useCadStore.getState()
      const draftLine = readDraft()

      // Branşman hiçbir porta/boruya BAĞLANMAZ, onlara YAKALANMAZ da (kullanıcı
      // isteği, 2026-08: "diğer borulara ek yapılmasın"): kendi sayacını kendisi
      // getiriyor, var olan bir boruya `lineSplit` ile girseydi o boruyu
      // ORTASINDAN ayırırdı. Yakalama da kapalı — bağ KURMAYAN bir mıknatıs,
      // borunun üstüne oturmuş ama ona bağlı OLMAYAN bir branşman bırakırdı.
      // Duvar kelepçesi (aşağıda) açık kalır: o bir bağ değil, yalnız konum.
      if (kind !== 'branch') {
        const floorElements = cad.installationElements.filter(
          (element) => element.floorId === cad.activeFloorId,
        )

        const port = findNearestFreePort(
          floorElements,
          cad.installationConnections,
          getSymbolMetadata,
          event.planPoint,
          radiusCm,
        )
        if (port) {
          return { point: port.position, snap: { kind: 'port', position: port.position, port } }
        }

        // Zincirin ucunun ÜSTÜNDE oturduğu boru aday değildir: kullanıcı oradan
        // geliyor: kısa bir adım yeni köşeyi kaçınılmaz olarak o borunun yakalama
        // yarıçapına düşürür ve adım, az önce yazdığı boruyu AYIRARAK biterdi.
        const anchorLineId =
          draftLine?.startTarget?.kind === 'linePoint' ? draftLine.startTarget.lineId : null
        // Baca/havalandırma aday DEĞİL: gaz borusu onlara yapışsaydı `lineSplit`
        // kanalı ortasından ayırır ve içine bir gaz düğümü açardı. `branchStub`
        // da aday DEĞİL (kullanıcı isteği, 2026-08): branşmanın mavi ucu başka
        // bir boru için bağlantı noktası değil.
        const floorLines = cad.installationLines.filter(
          (line) =>
            line.floorId === cad.activeFloorId &&
            line.id !== anchorLineId &&
            isGasCarryingKind(line.kind) &&
            line.kind !== 'branchStub',
        )
        const line = findNearestPointOnLines(floorLines, event.planPoint, radiusCm)
        if (line) {
          return { point: line.position, snap: { kind: 'line', position: line.position, line } }
        }
      }

      if (!event.ctrlKey && draftLine) {
        const floorWalls = cad.walls.filter((wall) => wall.floorId === cad.activeFloorId)
        const clearanceCm = getWallEdgeGapCm(zoom)

        // Duvar KÖŞESİ (uç/T/X birleşim) toleranstaysa yapışma KESKİN — yön
        // kelepçesinin önüne geçer (kullanıcı isteği, 2026-08: "duvar
        // köşelerinde yapışma keskin olsun", "duvar üstü yasaklı alan").
        const corner = findNearestWallCorner(floorWalls, cad.points, event.planPoint, radiusCm, clearanceCm)
        if (corner) return { point: corner, snap: null }

        // Duvarın GÖVDESİNE (yüzüne) yakınken yapışma köşedeki gibi KESKİN
        // olsun (kullanıcı isteği: 45° dahil hangi açıyla gelinirse gelinsin
        // aynı payla kenara otursun) — `findNearestWallFace` AKTİF bir mıknatıs,
        // yalnızca yönü kelepçeleyen `findNearestWallParallel`'in aksine imleci
        // doğrudan yüz + pay çizgisine çeker.
        const face = findNearestWallFace(floorWalls, cad.points, event.planPoint, radiusCm, clearanceCm)
        if (face) return { point: face, snap: null }

        // Yüze yeterince yakın değilse (yarıçap içindeki en yakın nokta
        // gövdenin dışında kaldı, ör. duvarın ucuna yakın) yön onun AÇISINA
        // paralel/dik iki eksenden imlece en yakın olana kelepçelenir — HER
        // karede yeniden, kilitlenmeden. Bu, duvara YAKINDAYKEN dik ekseninde
        // de ilerleyebilme (köşe dönüşü) imkânını korur — face magnet yalnız
        // paralel yüzeyi verir.
        const wall = findNearestWallParallel(floorWalls, cad.points, draftLine.anchor, event.planPoint, radiusCm, clearanceCm)
        if (wall) return { point: wall.position, snap: null }

        // Duvar yakında DEĞİLSE boru TAMAMEN serbest: imleç çapraz dahil
        // aynen izlenir (kullanıcı isteği, 2026-08: "borular her zaman
        // serbest hareket edebilsin", "duvara snap değilse serbest çizim").
        return { point: event.planPoint, snap: null }
      }

      const point = event.ctrlKey ? event.planPoint : resolvePlacementPosition(event.planPoint, zoom)
      return { point, snap: null }
    }

    /**
     * İlk tıklama. Hat bir hedefe düştüyse başı oraya bağlanır; düşmediyse ve o
     * araç bir ÖN ELEMAN istiyorsa (ilk boru → servis kutusu) önce eleman
     * yerleştirilir ve hat onun çıkış portundan başlar.
     *
     * Branşman burada AYRI: HİÇBİR hedefe bağlanmaz, her zaman yer seviyesinde
     * SERBEST bir nokta bırakır — sayaç ve arasındaki vanalı mavi kesikli kol
     * ikinci tıkta gelir (`commitBranchGroundStep`). `resolveSnap` branşmanda
     * zaten `snap: null` döndürüyor; buradaki sıra o kuralı görünür kılıyor.
     *
     * Eleman kendi adımında yazılır: ayrı bir Ctrl+Z ile geri alınır. Hat ile
     * aynı adıma sokulsaydı yarım bırakılan (Esc'lenen) çizimde eleman da
     * kaybolurdu — oysa kullanıcı onu görerek koydu.
     */
    const startDraft = (point: PlanPoint, snap: LineToolSnap | null): LineDraft | null => {
      if (kind === 'branch') return { kind, ...startChain(point, null) }

      if (snap) {
        const attachment = toAttachment(snap)
        // Sayaçtan/servis kutusundan/branşmandan çıkan yeni boru sıfırdan
        // değil o hedefin O ANKİ kotundan başlar (kullanıcı isteği, 2026-08).
        const cad = useCadStore.getState()
        const elevationCm = resolveSeedElevationCm(
          attachment,
          cad.installationElements,
          cad.installationLines,
          cad.installationConnections,
        )
        return { kind, ...startChain(point, attachment, elevationCm) }
      }

      const cad = useCadStore.getState()
      const seedType = getLineSeedElementType(hasServiceBox(cad.installationElements))
      // Hiçbir hedefe düşmedi ve bu araç bir ön eleman da koymuyorsa (servis
      // kutusu zaten var): boş yere bağlantısız bir başlangıç YAZILMAZ — boru
      // her zaman bir porta, mevcut bir boruya ya da (ilk boru için) yeni
      // konacak servis kutusuna bağlı başlar (kullanıcı isteği, 2026-08).
      if (!seedType) return null

      const metadata = getSymbolMetadata(seedType)
      const seedPort = getSeedPort(metadata)
      const elementId = cad.addElement({ type: seedType, position: point })
      if (!seedPort) return { kind, ...startChain(point, null) }

      const element = useCadStore
        .getState()
        .installationElements.find((candidate) => candidate.id === elementId)
      const startPoint = element ? getPortWorldPosition(element, seedPort, metadata) : point

      return {
        kind,
        // Servis kutusundan çıkan İLK boru varsayılan kotu 15cm'de başlar
        // (kullanıcı isteği, 2026-08) — bkz. SERVICE_BOX_SEED_HEIGHT_CM.
        ...startChain(
          startPoint,
          { kind: 'port', elementId, portId: seedPort.id },
          SERVICE_BOX_SEED_HEIGHT_CM,
        ),
      }
    }

    /**
     * Branşmanın İLK adımı: `draft.anchor` yer seviyesinde serbest bırakılmış
     * bir noktadır (`startTarget` null — startDraft'ta kurulan tek durum).
     * Önce o noktadan tıklanan yere kadar mavi kesikli bir `branchStub` çizilir,
     * sonra sayaç (+ araya giren vana) bu kolun ucuna `resolveFreeEndAttachment`
     * ile AYNI mekanizmayla eklenir (palet'ten sayaç yerleştirmeyle birebir) —
     * geometri iki kez yazılmasın diye.
     *
     * Sayaç konunca zincir onun ÇIKIŞ portundan DEVAM eder: branşman yerleşince
     * boru döşeme hemen başlar ve o boru branşmandan ÇIKAR (kullanıcı isteği,
     * 2026-08). Borunun başka bir yerden başlaması mümkün değil — branşman
     * aracında port/boru yakalaması kapalı (bkz. `resolveSnap`), yani sayacın
     * çıkışı bu araçtaki TEK boru çıkış noktasıdır.
     *
     * `snap` burada bilerek yok sayılır: bu adımın ucu her zaman TAZE yerleşen
     * sayacın giriş portu olur, kullanıcının tıkladığı nokta yalnız YÖNÜ verir
     * (tıpkı `resolveFreeEndAttachment`'ın var olan bir hattı uzatması gibi).
     */
    const commitBranchGroundStep = (draft: LineDraft, point: PlanPoint) => {
      const written = useCadStore.getState().addLine({
        kind: 'branchStub',
        points: [draft.anchor, point],
        pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
        startTarget: draft.startTarget ?? undefined,
        // Mavi kesikli kol da sayaçla AYNI varsayılan kotta gider (kullanıcı
        // isteği, 2026-08) — BRANCH_SEED_HEIGHT_CM.
        pipe: { startHeightCm: BRANCH_SEED_HEIGHT_CM, endHeightCm: BRANCH_SEED_HEIGHT_CM, description: '' },
      })
      if (!written) return

      const cadAfterStub = useCadStore.getState()
      const stubLine = cadAfterStub.installationLines.find(
        (candidate) => candidate.id === written.lineId,
      )
      if (!stubLine) {
        writeDraft(null)
        return
      }

      const attachment = resolveFreeEndAttachment(
        [stubLine],
        cadAfterStub.installationConnections,
        getSymbolMetadata,
        'gasMeter',
        point,
        BRANCH_METER_ATTACH_RADIUS_CM,
      )
      const meterId = attachment ? useCadStore.getState().placeElementAtLineEnd(attachment) : null
      if (!meterId) {
        writeDraft(null)
        return
      }

      const metadata = getSymbolMetadata('gasMeter')
      const outputPort = getSeedPort(metadata)
      const meter = useCadStore
        .getState()
        .installationElements.find((candidate) => candidate.id === meterId)

      if (!meter || !outputPort) {
        writeDraft(null)
        return
      }

      // Boru sayacın ÇIKIŞ portundan başlar (yukarıdaki nota bkz.); varsayılan
      // kot sayacın mont kotuyla AYNI (BRANCH_SEED_HEIGHT_CM) — sıfırdan
      // başlayıp sayaçta aniden zıplamaz.
      writeDraft({
        kind: 'branch',
        ...startChain(
          getPortWorldPosition(meter, outputPort, metadata),
          { kind: 'port', elementId: meterId, portId: outputPort.id },
          BRANCH_SEED_HEIGHT_CM,
        ),
      })
    }

    /**
     * Bir adımı (iki köşe arası boru) yazar. Hedefe bağlanarak biten adım
     * zinciri KAPATIR — bağlantı kurulduysa çizilecek bir şey kalmamıştır ve
     * araç aktif kalır.
     */
    const commitStep = (draft: LineDraft, point: PlanPoint, snap: LineToolSnap | null) => {
      if (draft.kind === 'branch' && draft.startTarget === null) {
        commitBranchGroundStep(draft, point)
        return
      }

      const written = useCadStore.getState().addLine({
        kind: draft.kind,
        points: [draft.anchor, point],
        pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
        startTarget: draft.startTarget ?? undefined,
        endTarget: snap ? toAttachment(snap) : undefined,
        // Kot (K102) `pipe` türünde İKİ uçlu (K102); branşmanda TEK alan
        // (`BranchPropertiesPanel`) — sayacın çıkış kotuyla başlar (kullanıcı
        // isteği, 2026-08), yatay adımda değişmez.
        pipe:
          draft.kind === 'pipe'
            ? { startHeightCm: draft.elevationCm, endHeightCm: draft.elevationCm, description: '' }
            : undefined,
        branch: draft.kind === 'branch' ? { elevationCm: draft.elevationCm } : undefined,
      })
      if (!written) return

      // Kat bağlantısı yarım kalmış olabilir (`floorLinkActions.ts` →
      // `commitDraftFloorLink`): hedef katta ilk adım tam bu ANDA yazıldı,
      // eksik uç artık biliniyor. Yalnız bu katın (aktif kat) beklediği tarafta
      // tamamlanır — başka bir kattan gelen eski bir bekleme burada tüketilmez.
      const pending = usePlumbingUiStore.getState().pendingFloorLink
      if (pending) {
        const activeFloorId = useCadStore.getState().activeFloorId
        if ('belowPointId' in pending && pending.aboveFloorId === activeFloorId) {
          useCadStore.getState().addFloorPipeLink({ ...pending, abovePointId: written.startPointId })
          usePlumbingUiStore.getState().setPendingFloorLink(null)
        } else if ('abovePointId' in pending && pending.belowFloorId === activeFloorId) {
          useCadStore.getState().addFloorPipeLink({ ...pending, belowPointId: written.startPointId })
          usePlumbingUiStore.getState().setPendingFloorLink(null)
        }
      }

      writeDraft(snap ? null : { kind: draft.kind, ...advanceChain(draft, point, written) })
    }

    /** Taslak boşken sağ tık: araçtan çıkar, Seçim aracına döner. */
    const exitTool = () => {
      writeDraft(null)
      useUiStore.getState().setActiveTool(INSTALLATION_SELECTION_TOOL_ID)
    }

    /**
     * Zincir sürerken sağ tık: taslağı orada DURDURUR. Yazılmış adımlar
     * KALIR (her biri kendi başına bir borudur, geri alınmaz) — yalnız
     * "bir sonraki köşe nereye bağlanacak" taslağı silinir. Araç aktif
     * kalır ki başka bir noktadan hemen yeni bir boruya başlanabilsin
     * (kullanıcı isteği, 2026-08: "tek sağ tık son noktayı geri almasın,
     * orayı durdursun").
     */
    const stopChain = () => {
      writeDraft(null)
    }

    /**
     * Sağ tık İKİ ADIMLI (duvar aracıyla aynı desen, K84): zincir sürerken
     * onu durdurur, taslak boşken araçtan çıkar. Tek adıma indirilseydi
     * zincirin sonunu getirmek aracı da kapatırdı ve arka arkaya boru
     * çizmek imkânsızlaşırdı.
     */
    const applyRightClick = () => {
      const draft = readDraft()
      if (draft) {
        stopChain()
        return
      }
      exitTool()
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        const resolved = resolveSnap(event)
        cursorRef.current = resolved.point
        snapRef.current = resolved.snap
      },

      onPointerDown: (event) => {
        // Sağ tık pointerdown'ı da tetikler; yalnız sol tuş nokta koyar.
        if (event.button !== LEFT_BUTTON) return

        // Konum pointermove'a bırakılmaz: dokunmatikte tıklamadan önce hareket gelmez.
        const resolved = resolveSnap(event)
        cursorRef.current = resolved.point
        snapRef.current = resolved.snap

        const draft = readDraft()

        if (!draft) {
          const started = startDraft(resolved.point, resolved.snap)
          // Boş yere bağlantısız tık: yazılacak bir şey yok, jest sessizce düşer.
          if (started) writeDraft(started)
          return
        }

        // Aynı yere ikinci tık sıfır boy boru üretirdi.
        if (isSamePoint(draft.anchor, resolved.point)) return

        commitStep(draft, resolved.point, resolved.snap)
      },

      // contextmenu'yü DrawSurface yakalayıp preventDefault ediyor.
      onContextMenu: () => applyRightClick(),

      // Esc devam eden zinciri BIRAKIR; yazılmış adımlar kalır (her sol tık
      // kendi borusunu yazdı, kullanıcı onları görerek koydu — tıpkı başlangıç
      // elemanı gibi). Kullanıcı isteği (2026-08): Esc imlece (Seçim aracına)
      // DÖNER — taslak boşken sağ tıkla aynı jest, `exitTool` yeniden kullanılır.
      onCancel: () => exitTool(),
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (!readDraft()) return

      // Kat bağlantısı (kullanıcı isteği, 2026-08): tıklanabilir bir sahne
      // ögesi güvenilir olmazdı (bu araç `subscribeDrawSurface` ile HAM
      // pointerdown'ı dinliyor, R3F'in kendi onClick sentetik olayıyla
      // YARIŞIYOR). PageUp/PageDown zaten "kattan kata geç"i taşıyor
      // (`useEditorShortcuts.ts`) ve BAĞLANTI KURMADAN geçiyor; bu yüzden ok
      // tuşları kullanılıyor, aynı tuş iki farklı işe binmesin diye.
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        commitDraftFloorLink('up')
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        commitDraftFloorLink('down')
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      unsubscribe()
      window.removeEventListener('keydown', handleKeyDown)
      // Araç değişince yarım hat asılı kalmasın.
      writeDraft(null)
      // Tamamlanmamış kat bağlantısı da düşer: hedef katta hiç adım
      // yazılmadan araçtan çıkılırsa bekleyen taraf sonsuza dek asılı kalmasın.
      usePlumbingUiStore.getState().setPendingFloorLink(null)
      cursorRef.current = null
      snapRef.current = null
    }
  }, [camera, kind])

  return { kind, cursorRef, snapRef }
}
