import type { PlanPoint } from './coords'
import type { Beam, Id } from './model'
import { getSegmentLength, DEFAULT_WALL_THICKNESS_CM, MIN_WALL_LENGTH_CM } from './wall'

export const BEAM_LABEL_PREFIX = 'KR'

/**
 * Kiriş duvarla AYNI kalınlıkta doğar (kullanıcı isteği: "duvarlarımızla aynı
 * şekilde ve kalınlıkta"). Sabit bağlı değil, panelden değiştirilebilir.
 */
export const DEFAULT_BEAM_THICKNESS_CM = DEFAULT_WALL_THICKNESS_CM

/** Duvarla aynı sınırlar: sıfır boy/kalınlık görünmez nesne üretir. */
export const MIN_BEAM_LENGTH_CM = MIN_WALL_LENGTH_CM
export const MIN_BEAM_THICKNESS_CM = 1

const LABEL_NUMBER_PAD = 2

export type BeamEnds = { p1: PlanPoint; p2: PlanPoint }

/** Kirişin hangi ucu — tutamaç ve uzatma bu adla konuşur. */
export type BeamEndKey = 'p1' | 'p2'

export function getBeamEnds(beam: Pick<Beam, 'x1' | 'y1' | 'x2' | 'y2'>): BeamEnds {
  return { p1: { x: beam.x1, y: beam.y1 }, p2: { x: beam.x2, y: beam.y2 } }
}

export function getBeamLengthCm(beam: Pick<Beam, 'x1' | 'y1' | 'x2' | 'y2'>): number {
  const ends = getBeamEnds(beam)
  return getSegmentLength(ends.p1, ends.p2)
}

export type BeamShape = Pick<Beam, 'x1' | 'y1' | 'x2' | 'y2' | 'thicknessCm'>

/**
 * Kirişin çizilen dikdörtgeninin dört köşesi (kesik konturun ve dolgunun
 * kaynağı). Duvarın KAPSÜLÜNDEN (yuvarlak uçlu çizgi, K23) bilinçli olarak
 * ayrılıyor: kapsül tek bir kalın `<Line>` ile çiziliyor, oysa kirişin konturu
 * KESİK olmalı — kesikli bir kontur ancak gerçek bir dikdörtgen çevrimi
 * çizilerek elde edilir. Uçlar bu yüzden düz, yuvarlak değil.
 *
 * Sıra: p1-sol, p2-sol, p2-sağ, p1-sağ (eksen boyunca dolaşır, kendini kesmez).
 * Dejenere (sıfır boy) kirişte yön belirsiz — undefined döner, çağıran çizmez.
 */
export function getBeamCorners(beam: BeamShape): PlanPoint[] | undefined {
  const dx = beam.x2 - beam.x1
  const dy = beam.y2 - beam.y1
  const lengthCm = Math.hypot(dx, dy)
  if (lengthCm < MIN_BEAM_LENGTH_CM) return undefined

  // Eksene dik birim vektör × yarım kalınlık = kenara olan öteleme.
  const halfThicknessCm = beam.thicknessCm / 2
  const offsetX = (-dy / lengthCm) * halfThicknessCm
  const offsetY = (dx / lengthCm) * halfThicknessCm

  return [
    { x: beam.x1 + offsetX, y: beam.y1 + offsetY },
    { x: beam.x2 + offsetX, y: beam.y2 + offsetY },
    { x: beam.x2 - offsetX, y: beam.y2 - offsetY },
    { x: beam.x1 - offsetX, y: beam.y1 - offsetY },
  ]
}

/**
 * İmleç kirişin üstünde mi? Eksene olan dik uzaklık yarım kalınlığı aşmıyorsa
 * ve izdüşüm iki ucun ARASINDA kalıyorsa evet — yani gerçek dikdörtgenin içi,
 * duvardaki gibi yuvarlak uç payı yok.
 */
export function isPointInBeam(target: PlanPoint, beam: BeamShape): boolean {
  const dx = beam.x2 - beam.x1
  const dy = beam.y2 - beam.y1
  const lengthCm = Math.hypot(dx, dy)
  if (lengthCm < MIN_BEAM_LENGTH_CM) return false

  const toTargetX = target.x - beam.x1
  const toTargetY = target.y - beam.y1
  // Eksen boyunca (t) ve eksene dik (d) bileşenler; ikisi de cm.
  const alongCm = (toTargetX * dx + toTargetY * dy) / lengthCm
  const acrossCm = Math.abs((toTargetX * -dy + toTargetY * dx) / lengthCm)

  return alongCm >= 0 && alongCm <= lengthCm && acrossCm <= beam.thicknessCm / 2
}

/**
 * İmlecin altındaki kiriş — sonradan eklenen ÜSTTE sayılır (`architectureHover`
 * içindeki sembol/alan nesnesi taramasıyla aynı kural).
 */
export function findBeamUnderPoint(
  target: PlanPoint,
  beams: readonly Beam[],
  floorId: Id,
): Beam | undefined {
  return [...beams]
    .reverse()
    .find((beam) => beam.floorId === floorId && isPointInBeam(target, beam))
}

export function formatBeamLabel(sequence: number): string {
  return `${BEAM_LABEL_PREFIX}-${String(sequence).padStart(LABEL_NUMBER_PAD, '0')}`
}

/**
 * Sıradaki etiket: aynı KATTAKİ en yüksek numaranın bir fazlası —
 * `getNextAreaObjectLabel` ile aynı gerekçe (silinen numara geri kullanılmaz).
 */
export function getNextBeamLabel(beams: readonly Beam[], floorId: Id): string {
  const pattern = new RegExp(`^${BEAM_LABEL_PREFIX}-(\\d+)$`)

  let highest = 0
  for (const beam of beams) {
    if (beam.floorId !== floorId) continue
    const match = pattern.exec(beam.label.trim())
    if (match) highest = Math.max(highest, Number(match[1]))
  }

  return formatBeamLabel(highest + 1)
}

/** Etiket çakışması KAT içinde tanımlı — KK-10, alan nesnesiyle aynı kural. */
export function isBeamLabelTaken(
  beams: readonly Beam[],
  label: string,
  floorId: Id,
  exceptBeamId?: Id,
): boolean {
  const trimmed = label.trim()
  return beams.some(
    (beam) =>
      beam.id !== exceptBeamId && beam.floorId === floorId && beam.label.trim() === trimmed,
  )
}

export function isBeamLabelValid(label: string): boolean {
  return label.trim().length > 0
}
