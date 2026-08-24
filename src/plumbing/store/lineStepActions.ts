import { usePlumbingUiStore } from './plumbingUiStore'
import type { PlanPoint } from '../../core/coords'
import { useCadStore } from '../../store/cadStore'
import { getAxisStepPoint, type DraftAxisDirection } from '../core/draftKeyboard'
import type { LineEndAttachment } from '../core/installationModel'
import { advanceChain } from '../core/lineChain'
import { isSamePoint } from '../core/lineGeometry'

/**
 * Zincirin bir ADIMINI yazar (iki köşe arası bir `InstallationLine`, K-W).
 * Fare (`useLineTool.commitStep`) ve klavye (`commitDraftAxisLength`) TEK
 * yoldan geçsin diye store köprüsünde: iki çağıran ayrı yazsaydı kot/çap/
 * bağlantı alanlarından biri er geç birinde unutulurdu.
 *
 * Hook DEĞİL (`pipeElevationActions.ts` ile aynı gerekçe): cadStore (çizim)
 * ile plumbingUiStore (taslak) arasında köprü, React'e ihtiyaç yok.
 *
 * Bir hedefe (`endTarget`) bağlanarak biten adım zinciri KAPATIR — bağlantı
 * kurulduysa çizilecek bir şey kalmamıştır.
 */
export function commitDraftStep(point: PlanPoint, endTarget: LineEndAttachment | null): boolean {
  const draft = usePlumbingUiStore.getState().draftLine
  if (!draft) return false
  if (isSamePoint(draft.anchor, point)) return false

  const written = useCadStore.getState().addLine({
    kind: draft.kind,
    points: [draft.anchor, point],
    pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
    startTarget: draft.startTarget ?? undefined,
    endTarget: endTarget ?? undefined,
    // Kot (K102) `pipe` türünde İKİ uçlu; branşmanda TEK alan
    // (`BranchPropertiesPanel`) — yatay adımda değişmez.
    pipe:
      draft.kind === 'pipe'
        ? { startHeightCm: draft.elevationCm, endHeightCm: draft.elevationCm, description: '' }
        : undefined,
    branch: draft.kind === 'branch' ? { elevationCm: draft.elevationCm } : undefined,
  })
  if (!written) return false

  usePlumbingUiStore
    .getState()
    .setDraftLine(endTarget ? null : { kind: draft.kind, ...advanceChain(draft, point, written) })
  return true
}

/**
 * Ok tuşuyla seçilen eksende, kutuya yazılan uzunlukta bir adım yazar
 * (kullanıcı isteği, 2026-08: "yön tuşlarıyla X ve Y eksenlerinde boru
 * çizimi"). Yakalama (port/boru/duvar) BİLEREK aranmaz: klavye girdisi kesin
 * bir sayıdır, en yakın porta çekilseydi yazılan uzunluk tutmazdı.
 *
 * Branşmanın YER adımı kapsam dışı (`startTarget === null`): o adım sayaç +
 * vana yerleştiriyor (`useLineTool.commitBranchGroundStep`), tek bir boru
 * yazmıyor — klavyeyle tetiklenmesi ayrı bir karar olurdu.
 */
export function commitDraftAxisLength(direction: DraftAxisDirection, lengthCm: number): boolean {
  const draft = usePlumbingUiStore.getState().draftLine
  if (!draft) return false
  if (draft.kind === 'branch' && draft.startTarget === null) return false
  if (!Number.isFinite(lengthCm) || lengthCm <= 0) return false

  return commitDraftStep(getAxisStepPoint(draft.anchor, direction, lengthCm), null)
}
