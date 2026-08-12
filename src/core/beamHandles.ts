import { getBeamEnds, type BeamEndKey } from './beam'
import type { PlanPoint } from './coords'
import type { Beam } from './model'
import { getSegmentLength } from './wall'

/**
 * Tutamaç ölçüleri EKRAN pikselinde: zoom değişince tutamacın ekrandaki boyu
 * DEĞİŞMEZ (alan nesnesi tutamaçlarıyla aynı kural, K45). Dünya birimine çevrim
 * `px / zoom` — zoom piksel/cm demek (knowledge/viewport.md).
 */
export const BEAM_HANDLE_RADIUS_PX = 5
/** Görünmez tutma alanı işaretten geniş: 5 px'lik bir noktayı yakalamak zor olurdu. */
export const BEAM_HANDLE_HIT_PX = 24

export type BeamHandle = {
  end: BeamEndKey
  position: PlanPoint
}

/** Kirişin iki ucundaki tutamaç — uzatma/kısaltma buradan yapılır. */
export function getBeamHandles(beam: Pick<Beam, 'x1' | 'y1' | 'x2' | 'y2'>): BeamHandle[] {
  const ends = getBeamEnds(beam)
  return [
    { end: 'p1', position: ends.p1 },
    { end: 'p2', position: ends.p2 },
  ]
}

/**
 * İmleç hangi ucun üstünde? Erişim yarıçapı EKRAN pikselinden gelir, yani
 * uzaklaşınca da yakınlaşınca da tutma alanı ekranda aynı büyüklükte kalır.
 *
 * İki uç çakışırsa (dejenere kiriş) p1 kazanır — karar deterministik olsun.
 */
export function findBeamHandleAt(
  target: PlanPoint,
  beam: Pick<Beam, 'x1' | 'y1' | 'x2' | 'y2'>,
  zoom: number,
): BeamEndKey | undefined {
  const reachCm = BEAM_HANDLE_HIT_PX / 2 / zoom
  return getBeamHandles(beam).find(
    (handle) => getSegmentLength(target, handle.position) <= reachCm,
  )?.end
}
