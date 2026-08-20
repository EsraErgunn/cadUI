import { describe, expect, it } from 'vitest'

import {
  ELEMENT_LABEL_DISTANCE_FACTOR,
  LINE_LABEL_DISTANCE_FACTOR,
  getIsometricLabelDistanceCm,
} from '../isometricLabels'

describe('getIsometricLabelDistanceCm', () => {
  it('çizim boyutuyla ÖLÇEKLENİR (sabit cm değil)', () => {
    // Sabit bir değer iki yönden de yanlıştı: küçük dairede yazı borunun
    // üstüne biniyor, büyük binada hiç fark edilmiyordu.
    const small = getIsometricLabelDistanceCm(2000, LINE_LABEL_DISTANCE_FACTOR)
    const large = getIsometricLabelDistanceCm(8000, LINE_LABEL_DISTANCE_FACTOR)

    expect(large).toBeCloseTo(small * 4, 6)
  })

  it('çok küçük çizimde alt sınır devreye girer', () => {
    // Oran sıfıra yaklaşsa da etiket gövdeden ayrılmalı.
    expect(getIsometricLabelDistanceCm(1, LINE_LABEL_DISTANCE_FACTOR)).toBeGreaterThan(50)
  })

  it('hat etiketi eleman etiketinden DAHA YAKIN durur', () => {
    // Bir cihaz ile ona giden kısa kol neredeyse aynı ışında; eşit uzaklıkta
    // olsalar künyeleri üst üste binerdi.
    expect(getIsometricLabelDistanceCm(4000, LINE_LABEL_DISTANCE_FACTOR)).toBeLessThan(
      getIsometricLabelDistanceCm(4000, ELEMENT_LABEL_DISTANCE_FACTOR),
    )
  })
})
