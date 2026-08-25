import { describe, expect, it } from 'vitest'

import type { PlanPoint } from '../../../core/coords'
import {
  layoutLabelsBesideAnchors,
  type LabelBox,
} from '../isometricLabelPlacement'

const LABEL_SIZE_CM = 10
const CENTER: PlanPoint = { x: 0, y: 0 }

const box = (key: string, x: number, y: number, widthCm = 60, heightCm = 30): LabelBox => ({
  key,
  anchor: { x, y },
  widthCm,
  heightCm,
})

/** Yerleşimin verdiği kaymayı çapaya uygulayıp yazının merkezini bulur. */
function center(boxes: readonly LabelBox[], key: string): PlanPoint {
  const offsets = layoutLabelsBesideAnchors(boxes, CENTER, LABEL_SIZE_CM)
  const target = boxes.find((candidate) => candidate.key === key)
  if (!target) throw new Error(`kutu yok: ${key}`)
  const offset = offsets.get(key)
  if (!offset) throw new Error(`kayma yok: ${key}`)
  return { x: target.anchor.x + offset.x, y: target.anchor.y + offset.y }
}

function isOverlapping(a: LabelBox, aAt: PlanPoint, b: LabelBox, bAt: PlanPoint): boolean {
  return (
    Math.abs(aAt.x - bAt.x) < (a.widthCm + b.widthCm) / 2 &&
    Math.abs(aAt.y - bAt.y) < (a.heightCm + b.heightCm) / 2
  )
}

describe('kâğıt etiket yerleşimi: nesnenin yanına', () => {
  it('etiket çapasının YANINDA durur, halkaya sürülmez', () => {
    // Halka yerleşiminde kayma sahne boyutuyla ölçekleniyordu; burada etiketin
    // KENDİ boyu kadar. Kullanıcının şikâyeti tam olarak buydu.
    const boxes = [box('a', 500, 0)]
    const offset = layoutLabelsBesideAnchors(boxes, CENTER, LABEL_SIZE_CM).get('a')!

    expect(Math.hypot(offset.x, offset.y)).toBeLessThan(boxes[0].widthCm)
  })

  it('kayma sahne BOYUTUNDAN bağımsız: büyük binada da yanında kalır', () => {
    const near = layoutLabelsBesideAnchors([box('a', 500, 0)], CENTER, LABEL_SIZE_CM).get('a')!
    const far = layoutLabelsBesideAnchors([box('a', 50000, 0)], CENTER, LABEL_SIZE_CM).get('a')!

    expect(far.x).toBeCloseTo(near.x, 6)
    expect(far.y).toBeCloseTo(near.y, 6)
  })

  it('etiket merkezden DIŞARI açılır: gövdenin içine düşmesin', () => {
    // Sağdaki çapanın etiketi sağa, soldakininki sola gitmeli.
    expect(center([box('sag', 500, 0)], 'sag').x).toBeGreaterThan(500)
    expect(center([box('sol', -500, 0)], 'sol').x).toBeLessThan(-500)
    expect(center([box('ust', 0, 500)], 'ust').y).toBeGreaterThan(500)
    expect(center([box('alt', 0, -500)], 'alt').y).toBeLessThan(-500)
  })

  it('kutunun KENARI çapaya değmez', () => {
    const target = box('a', 500, 0)
    const at = center([target], 'a')

    // Yatay yönde açıldığı için kutunun sol kenarı çapanın sağında kalmalı.
    expect(at.x - target.widthCm / 2).toBeGreaterThan(target.anchor.x)
  })
})

describe('kâğıt etiket yerleşimi: çakışma', () => {
  it('aynı noktadaki iki etiket AYRILIR', () => {
    const boxes = [box('a', 500, 0), box('b', 500, 0)]
    const offsets = layoutLabelsBesideAnchors(boxes, CENTER, LABEL_SIZE_CM)

    const a = { x: 500 + offsets.get('a')!.x, y: offsets.get('a')!.y }
    const b = { x: 500 + offsets.get('b')!.x, y: offsets.get('b')!.y }
    expect(isOverlapping(boxes[0], a, boxes[1], b)).toBe(false)
  })

  it('sıkışık bir öbekte HİÇBİR çift çakışmaz', () => {
    // Gerçek paftada tüketim noktaları birbirine yakın düşüyor; halka yerleşimi
    // bunu açısal payla çözüyordu, burada kutu itmesiyle çözülüyor.
    const boxes = [
      box('a', 400, 400),
      box('b', 420, 410),
      box('c', 440, 395),
      box('d', 410, 430),
      box('e', 430, 380),
    ]
    const offsets = layoutLabelsBesideAnchors(boxes, CENTER, LABEL_SIZE_CM)
    const placed = boxes.map((item) => ({
      item,
      at: {
        x: item.anchor.x + offsets.get(item.key)!.x,
        y: item.anchor.y + offsets.get(item.key)!.y,
      },
    }))

    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        expect(isOverlapping(placed[i].item, placed[i].at, placed[j].item, placed[j].at)).toBe(
          false,
        )
      }
    }
  })

  it('uzaktaki etiketler birbirini İTMEZ', () => {
    const lonely = layoutLabelsBesideAnchors([box('a', 500, 0)], CENTER, LABEL_SIZE_CM).get('a')!
    const crowded = layoutLabelsBesideAnchors(
      [box('a', 500, 0), box('b', -5000, 0)],
      CENTER,
      LABEL_SIZE_CM,
    ).get('a')!

    expect(crowded.x).toBeCloseTo(lonely.x, 6)
    expect(crowded.y).toBeCloseTo(lonely.y, 6)
  })

  it('sonuç KARARLI: aynı girdi aynı yerleşimi verir', () => {
    // Çakışma çözümü sırayla iterek çalışıyor; yön seçimi anahtara bağlandı,
    // yoksa aynı proje her basımda biraz farklı çıkardı.
    const boxes = [box('a', 400, 400), box('b', 400, 400), box('c', 405, 402)]
    const first = layoutLabelsBesideAnchors(boxes, CENTER, LABEL_SIZE_CM)
    const second = layoutLabelsBesideAnchors(boxes, CENTER, LABEL_SIZE_CM)

    for (const key of ['a', 'b', 'c']) {
      expect(second.get(key)).toEqual(first.get(key))
    }
  })

  it('itilme SINIRLI: kalabalık öbekte bile etiket çizimden kopmaz', () => {
    // Sınırsız itmede on kutu birbirini metrelerce uzağa savuruyor, kılavuz
    // çizgileri gövdenin üstünden geçiyordu (kullanıcı isteği: "çok da değil").
    const boxes = Array.from({ length: 10 }, (_, index) => box(`k${index}`, 400, 400))
    const offsets = layoutLabelsBesideAnchors(boxes, CENTER, LABEL_SIZE_CM)

    // Pay: istenen uzaklık (boşluk + kutunun yarı boyu) + birkaç satır boyu.
    // Kısıt AYIRMAYI ezmediği için son ayırma adımı payı bir miktar aşabilir;
    // aranan şey "kopmaması", milimetrik bir tavan değil.
    const maxDistanceCm = LABEL_SIZE_CM * 1.2 + 60 / 2 + 30 / 2 + LABEL_SIZE_CM * 4
    for (const offset of offsets.values()) {
      expect(Math.hypot(offset.x, offset.y)).toBeLessThan(maxDistanceCm * 1.5)
    }
  })

  it('boş liste boş yerleşim verir', () => {
    expect(layoutLabelsBesideAnchors([], CENTER, LABEL_SIZE_CM).size).toBe(0)
  })
})
