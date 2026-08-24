import type { DischargeStart } from './dischargeStart'
import type { DischargeLineKind } from './lineKinds'
import { normalizeZero, type PlanPoint } from '../../core/coords'

/**
 * Çizilmekte olan baca/havalandırma güzergâhı. Boru zincirinden (`lineChain.ts`)
 * FARKLI: orada her sol tık kendi borusunu hemen yazar, çünkü her borunun kendi
 * çapı olabilir ve tek başına seçilip silinebilmelidir. Kanalın çapı sabittir ve
 * cihazdan çıkan tek bir bütündür — ayrı hatlara bölünseydi çift çizgi köşe
 * mitresi iki hat arasında oluşamaz, kanal her köşede AÇIK kalırdı.
 *
 * Bu yüzden taslak store'a hiç dokunmaz: bitişte TEK `addLine` yazılır, tek
 * Ctrl+Z geri alır.
 */
export type DischargeDraft = {
  kind: DischargeLineKind
  start: DischargeStart
  /** Başlangıç portundan itibaren tüm köşeler; ilki her zaman `start.position`. */
  points: PlanPoint[]
}

export function startDischargeDraft(
  kind: DischargeLineKind,
  start: DischargeStart,
): DischargeDraft {
  return { kind, start, points: [start.position] }
}

/**
 * Ağzı yeni bir çözüme taşır — yalnız İLK köşe henüz bırakılmamışken anlamlı:
 * kanalın başlangıcı ağzın konumudur, sonrası kullanıcının köşeleridir.
 */
export function reseatDischargeStart(
  draft: DischargeDraft,
  start: DischargeStart,
): DischargeDraft {
  if (draft.points.length > 1) return draft
  return { ...draft, start, points: [start.position] }
}

export function appendDischargePoint(draft: DischargeDraft, point: PlanPoint): DischargeDraft {
  return { ...draft, points: [...draft.points, point] }
}

/**
 * Son köşeyi geri alır. Başlangıç portu silinemez: geriye tek nokta kalınca
 * taslak tümüyle DÜŞER (`null`) — cihazın üstünde yapışık duran sıfır boy bir
 * kanal anlamsız olurdu.
 */
export function popDischargePoint(draft: DischargeDraft): DischargeDraft | null {
  if (draft.points.length <= 1) return null
  return { ...draft, points: draft.points.slice(0, -1) }
}

/** En az iki köşe olmadan kanal yazılmaz. */
export function isDischargeDraftWritable(draft: DischargeDraft): boolean {
  return draft.points.length >= 2
}

/**
 * İlk köşeyi ağzın eksenine düşürür. Kanalın duvarları cihazın SVG'sindeki
 * bağlantı ağzının devamıdır; ilk segment serbest bırakılsaydı ızgaraya yuvarlanan
 * ikinci tık ağzın eksenine hemen hiç düşmez ve kanal cihazdan EĞİK çıkardı —
 * ağız çizgileriyle duvarlar birbirini tutmazdı.
 *
 * Sonraki köşeler serbesttir: kilit yalnız cihazdan çıkışa aittir.
 */
export function projectOntoOutletAxis(
  start: PlanPoint,
  direction: PlanPoint,
  point: PlanPoint,
): PlanPoint {
  const alongCm = (point.x - start.x) * direction.x + (point.y - start.y) * direction.y
  // Cihazın içine doğru geri gitmez; sıfır boy segmenti çağıran zaten reddeder.
  const clampedCm = Math.max(alongCm, 0)
  return {
    x: normalizeZero(start.x + direction.x * clampedCm),
    y: normalizeZero(start.y + direction.y * clampedCm),
  }
}
