import type { LineEndAttachment } from './installationModel'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'

/**
 * Zincirde yazılmış BİR boru adımı ve o adım yazılmadan önceki zincir hâli —
 * tek sağ tık buraya geri döner (boru silinir, uç eski yerine oturur).
 */
export type LineChainStep = {
  lineId: Id
  anchor: PlanPoint
  startTarget: LineEndAttachment | null
  elevationCm: number
}

/**
 * Devam eden çizimin durumu. Her sol tık KENDİ borusunu hemen yazdığı için
 * (K-W) burada yarım bir çoklu-nokta hattı değil, yalnız bir sonraki adımın
 * nereden ve neye bağlı başlayacağı durur.
 */
export type LineChain = {
  /** Zincirin ucu = lastik bandın kökü. */
  anchor: PlanPoint
  /** Sıradaki borunun başı neye bağlanacak; serbestse null. */
  startTarget: LineEndAttachment | null
  /** Zincirin O ANKİ kotu (K98) — `+`/`-` bunu değiştirir, yatay adım taşır. */
  elevationCm: number
  /** Bu jestte yazılmış adımlar, eskiden yeniye. */
  steps: LineChainStep[]
}

/** Yazılan borunun zincirlemek için gereken kimliği (`plumbingSlice.addLine` döner). */
export type WrittenLineStep = { lineId: Id; endPointId: Id }

export function startChain(
  anchor: PlanPoint,
  startTarget: LineEndAttachment | null,
  elevationCm = 0,
): LineChain {
  return { anchor, startTarget, elevationCm, steps: [] }
}

/**
 * Bir adım yazıldıktan sonraki zincir. Sıradaki adımın başı yazılan borunun
 * UCUNA bağlanır: bağlanmasaydı iki adım aynı köşeyi paylaştığını bilmez,
 * köşe sürüklenince komşu boru eski yerinde kalıp KOPARDI
 * (bkz. `lineCornerLink.ts`). `elevationCm` verilmezse zincirin ANKİ kotu
 * aynen taşınır (yatay adım) — dikey adımda çağıran yeni değeri geçirir.
 */
export function advanceChain(
  chain: LineChain,
  point: PlanPoint,
  written: WrittenLineStep,
  elevationCm: number = chain.elevationCm,
): LineChain {
  return {
    anchor: point,
    startTarget: { kind: 'linePoint', lineId: written.lineId, pointId: written.endPointId },
    elevationCm,
    steps: [
      ...chain.steps,
      { lineId: written.lineId, anchor: chain.anchor, startTarget: chain.startTarget, elevationCm: chain.elevationCm },
    ],
  }
}

/**
 * Son adımı geri alır: silinecek boru ile bir önceki zincir hâli. Yazılmış adım
 * yoksa zincir tümüyle düşer (`chain: null`) — geri alınacak boru da yoktur;
 * başlangıç elemanı kendi geçmiş adımında yazıldığı için o Ctrl+Z ile gider.
 */
export function rewindChain(chain: LineChain): {
  chain: LineChain | null
  removedLineId: Id | null
} {
  const lastStep = chain.steps.at(-1)
  if (!lastStep) return { chain: null, removedLineId: null }

  return {
    chain: {
      anchor: lastStep.anchor,
      startTarget: lastStep.startTarget,
      elevationCm: lastStep.elevationCm,
      steps: chain.steps.slice(0, -1),
    },
    removedLineId: lastStep.lineId,
  }
}
