// Yalnız tip: çalışma zamanı döngüsü oluşmasın (K17).
import type { CadState } from './cadStore'
import { removeFloorArchitectureInDraft, removeFloorInstallationInDraft } from './floorOps'
import { takeNextId } from './projectMeta'
import { cloneFloorArchitecture, type FloorArchitecture } from '../core/floorClone'
import type { Id } from '../core/model'
import {
  cloneFloorInstallation,
  type FloorInstallation,
} from '../plumbing/core/floorInstallationClone'

export type CopyFloorInput = {
  sourceFloorId: Id
  targetFloorId: Id
  /** Madde 16: mimari ve tesisat ayrı ayrı seçilebilir. */
  isArchitectureIncluded: boolean
  isInstallationIncluded: boolean
}

type FloorClonePayload = {
  architecture: FloorArchitecture | null
  installation: FloorInstallation | null
}

/**
 * Kopyanın İÇERİĞİNİ üretir ama store'a YAZMAZ — okuma ile yazma bilerek ayrı
 * (K166). Yeni id'ler burada alınır; sayaç ilerlemesi yazımdan bağımsızdır ve
 * zaten geri alınabilir bir işlemin parçası.
 */
function readFloorClone(draft: CadState, input: CopyFloorInput): FloorClonePayload {
  const { sourceFloorId, targetFloorId } = input

  return {
    architecture: input.isArchitectureIncluded
      ? cloneFloorArchitecture(draft, sourceFloorId, targetFloorId, () => takeNextId(draft))
      : null,
    // Eleman TEK BAŞINA kopyalanmaz: hat ve bağlantı kaydı da gelmeli. Eskiden
    // yalnız eleman kopyalanıyordu ve "üzerine yaz" kipinde hedefin boruları
    // silinip yerine yenisi YAZILMIYORDU — kaynak özeti "3 boru bölümü" deyip
    // hiçbirini taşımıyordu.
    installation: input.isInstallationIncluded
      ? cloneFloorInstallation(draft, sourceFloorId, targetFloorId, () => takeNextId(draft))
      : null,
  }
}

function writeFloorClone(draft: CadState, payload: FloorClonePayload): boolean {
  let isChanged = false

  const architecture = payload.architecture
  if (
    architecture &&
    (architecture.points.length > 0 ||
      architecture.symbols.length > 0 ||
      architecture.areaObjects.length > 0 ||
      architecture.beams.length > 0 ||
      architecture.texts.length > 0)
  ) {
    draft.points.push(...architecture.points)
    draft.walls.push(...architecture.walls)
    draft.openings.push(...architecture.openings)
    draft.rooms.push(...architecture.rooms)
    draft.symbols.push(...architecture.symbols)
    draft.areaObjects.push(...architecture.areaObjects)
    draft.beams.push(...architecture.beams)
    draft.texts.push(...architecture.texts)
    isChanged = true
  }

  const installation = payload.installation
  if (installation && (installation.elements.length > 0 || installation.lines.length > 0)) {
    draft.installationElements.push(...installation.elements)
    draft.installationLines.push(...installation.lines)
    draft.installationConnections.push(...installation.connections)
    isChanged = true
  }

  return isChanged
}

/**
 * Kopyayı hedefe yazar. Hedefin BOŞ olduğunu denetlemez: çağıran ya yeni (boş)
 * bir kata yazıyor ya da "üzerine yaz" kipinde hedefi zaten temizlemiş oluyor.
 * Denetim burada kalsaydı "yalnız tesisat kopyala" mimarisi olan bir hedefte
 * sebepsiz reddedilirdi.
 */
export function cloneFloorContentInDraft(draft: CadState, input: CopyFloorInput): boolean {
  if (input.sourceFloorId === input.targetFloorId) return false
  return writeFloorClone(draft, readFloorClone(draft, input))
}

/**
 * Birden çok kopyalamayı TEK işlemde uygular (K166). `applyFloorPlan`'ın
 * kopyalama fazı; ayrı bir "kat kopyala" action'ı YOK — pencere kopyalamayı da
 * taslakta biriktiriyor, böylece Uygula tek `set` ve tek Ctrl+Z kalıyor.
 *
 * ⚠️ Faz sırası kritik: bütün kaynaklar HERHANGİ bir silmeden ÖNCE okunur. Aynı
 * Uygula içinde bir kat hem kaynak hem hedef olabiliyor; hedef başına "sil sonra
 * klonla" döngüsü kurulsaydı sonuç katların LİSTE SIRASINA bağlı çıkardı.
 * Klonlama saf okuma olduğu için üç faza ayrılabiliyor.
 */
export function applyFloorCopiesInDraft(
  draft: CadState,
  copies: readonly CopyFloorInput[],
): boolean {
  const valid = copies.filter((copy) => copy.sourceFloorId !== copy.targetFloorId)
  if (valid.length === 0) return false

  // 1. OKU — hepsi, kopyalama öncesi durumdan.
  const payloads = valid.map((copy) => ({ copy, payload: readFloorClone(draft, copy) }))

  // 2. SİL — yalnız kopyalanan türler (madde 18).
  for (const { copy } of payloads) {
    if (copy.isArchitectureIncluded) removeFloorArchitectureInDraft(draft, copy.targetFloorId)
    if (copy.isInstallationIncluded) removeFloorInstallationInDraft(draft, copy.targetFloorId)
  }

  // 3. YAZ
  let isChanged = false
  for (const { payload } of payloads) {
    if (writeFloorClone(draft, payload)) isChanged = true
  }
  return isChanged
}
