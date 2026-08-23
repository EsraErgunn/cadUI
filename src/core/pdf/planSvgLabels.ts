import { n, svgText } from './svgPrimitives'
import type { PlanPoint } from '../coords'
import { clipLeaderEndToRectCm } from '../labelLeader'
import type { PlanRect } from '../selection'

/** Etiket satırının PLAN santimi cinsinden yüksekliği. */
export const LABEL_HEIGHT_CM = 14
const LABEL_LINE_GAP_CM = 4

/**
 * Harf genişliğinin yüksekliğe oranı (Roboto ~0.55, cömert tarafa yuvarlandı).
 * `core/roomLabel.ts` ile aynı kestirme: yazıyı ölçmeden kutu tahmini yeter,
 * çünkü kutu yalnız kılavuz çizgisinin NEREDE duracağını belirliyor.
 */
const CHAR_WIDTH_RATIO = 0.6

/** Kılavuz çizgisi yazıya değmesin diye kutuya eklenen pay (cm). */
const LABEL_PADDING_CM = 6

const LEADER_DASH_CM = 8
const LEADER_GAP_CM = 5
const LEADER_WIDTH_CM = 1

export type PlanLabelledItem = {
  /** Kılavuz çizgisinin BAŞLADIĞI yer — nesnenin kendisi. */
  origin: PlanPoint
  /** Yazının merkezi. */
  anchor: PlanPoint
  lines: readonly string[]
}

function getLabelRectCm(item: PlanLabelledItem): PlanRect {
  const longest = Math.max(...item.lines.map((line) => line.length), 1)
  const halfWidthCm = (longest * LABEL_HEIGHT_CM * CHAR_WIDTH_RATIO) / 2 + LABEL_PADDING_CM
  const heightCm = item.lines.length * LABEL_HEIGHT_CM + (item.lines.length - 1) * LABEL_LINE_GAP_CM
  const halfHeightCm = heightCm / 2 + LABEL_PADDING_CM

  return {
    minX: item.anchor.x - halfWidthCm,
    maxX: item.anchor.x + halfWidthCm,
    minY: item.anchor.y - halfHeightCm,
    maxY: item.anchor.y + halfHeightCm,
  }
}

/**
 * Ad etiketi + nesneye bağlayan KESİKLİ kılavuz çizgisi.
 *
 * Ekranda tesisat elemanı da (`ElementNameLabels`) alan nesnesi de
 * (`AreaObjectNameLabels`) böyle çiziliyor; kâğıtta da aynı olmalı, yoksa
 * etiketin hangi nesneye ait olduğu okunamıyor.
 *
 * Kılavuz yazının KUTUSUNDA durur, merkezinde değil (`clipLeaderEndToRectCm`) —
 * yoksa çizgi yazının içinden geçer.
 *
 * Renk DIŞARIDAN geliyor çünkü aynı yolu iki farklı ağırlıkta iş kullanıyor:
 * yapı elemanı adı silik mimari tonunda, tesisat cihazının adı koyu tonda
 * (K154). Sabit tek renk verilseydi cihaz adı plan yazısı gibi okunurdu.
 *
 * ⚠️ Bu yol, etiketi OLAN her nesne için ortaktır. Kiriş gibi bugün adı olmayan
 * nesnelere ileride ad eklendiğinde tek yapılacak şey buraya bir madde daha
 * beslemek — ikinci bir etiket/kılavuz çizim yolu açılmamalı.
 */
export function buildLabelSvg(
  items: readonly PlanLabelledItem[],
  fontFamily: string,
  color: string,
): string[] {
  const body: string[] = []

  for (const item of items) {
    if (item.lines.length === 0) continue

    const leaderEnd = clipLeaderEndToRectCm(item.origin, item.anchor, getLabelRectCm(item))
    body.push(
      `<line x1="${n(item.origin.x)}" y1="${n(-item.origin.y)}" ` +
        `x2="${n(leaderEnd.x)}" y2="${n(-leaderEnd.y)}" ` +
        `stroke="${color}" stroke-width="${n(LEADER_WIDTH_CM)}" ` +
        `stroke-dasharray="${n(LEADER_DASH_CM)} ${n(LEADER_GAP_CM)}" />`,
    )

    // Satırlar aşağı doğru dizilir; plan y YUKARI büyüdüğü için her satırda eksilir.
    item.lines.forEach((line, index) => {
      body.push(
        svgText(
          { x: item.anchor.x, y: item.anchor.y - index * (LABEL_HEIGHT_CM + LABEL_LINE_GAP_CM) },
          line,
          { fontFamily, sizeCm: LABEL_HEIGHT_CM, color },
        ),
      )
    })
  }

  return body
}
