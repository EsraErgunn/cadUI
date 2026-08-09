import { describe, expect, it } from 'vitest'

import {
  getElementAttachMode,
  getInlineSpecs,
  getPlacementPreviewTypes,
} from '../attachModes'
import { INSTALLATION_ELEMENT_TYPES } from '../symbolMetadata'

describe('getElementAttachMode', () => {
  it('armatürleri boruya, sayacı boş uca, yakıcı cihazı en yakın boruya bağlar', () => {
    expect(getElementAttachMode('valve')).toBe('onLine')
    expect(getElementAttachMode('regulator')).toBe('onLine')
    expect(getElementAttachMode('insulation')).toBe('onLine')
    expect(getElementAttachMode('gasMeter')).toBe('lineEnd')
    expect(getElementAttachMode('combiBoiler')).toBe('nearestLine')
    expect(getElementAttachMode('serviceBox')).toBe('free')
  })

  it('her eleman türünün bir modu vardır', () => {
    for (const type of INSTALLATION_ELEMENT_TYPES) {
      expect(getElementAttachMode(type)).toBeDefined()
    }
  })
})

describe('getInlineSpecs', () => {
  it('refakatçisi olmayan elemanda yalnız kendisini 0 ofsetle verir', () => {
    expect(getInlineSpecs('valve')).toEqual([{ type: 'valve', offsetCm: 0 }])
  })

  it('regülatöre iki vana ve iki manometre ekler', () => {
    const specs = getInlineSpecs('regulator')

    expect(specs.map((spec) => spec.type)).toEqual([
      'valve',
      'manometer',
      'regulator',
      'manometer',
      'valve',
    ])
  })

  it('boru yönünde artan ofset sırasında döner', () => {
    const offsets = getInlineSpecs('regulator').map((spec) => spec.offsetCm)

    expect(offsets).toEqual([...offsets].sort((a, b) => a - b))
    expect(offsets.filter((offset) => offset === 0)).toHaveLength(1)
  })
})

describe('getPlacementPreviewTypes', () => {
  it('boruya oturan elemanda refakatçi sırasını birebir izler', () => {
    expect(getPlacementPreviewTypes('regulator')).toEqual(
      getInlineSpecs('regulator').map((spec) => spec.type),
    )
  })

  it('boş uca ve en yakın boruya takılan elemanda vanayı ikinci sıraya koyar', () => {
    expect(getPlacementPreviewTypes('gasMeter')).toEqual(['gasMeter', 'valve'])
    expect(getPlacementPreviewTypes('stove')).toEqual(['stove', 'valve'])
  })

  it('serbest elemanda yalnız kendisini verir', () => {
    expect(getPlacementPreviewTypes('serviceBox')).toEqual(['serviceBox'])
  })
})
