import { describe, expect, it } from 'vitest'

import {
  getCommonNumber,
  getPropertyPanelTitle,
  getPropertySelectionKind,
} from '../propertyFields'
import type { SelectionItem } from '../selection'

const wall1: SelectionItem = { kind: 'wall', id: 8 }
const wall2: SelectionItem = { kind: 'wall', id: 9 }
const opening: SelectionItem = { kind: 'opening', id: 12 }

describe('getPropertySelectionKind', () => {
  it('boş seçim none', () => {
    expect(getPropertySelectionKind([])).toBe('none')
  })

  it('aynı türden nesneler o türü verir — sayıdan bağımsız', () => {
    expect(getPropertySelectionKind([wall1])).toBe('wall')
    expect(getPropertySelectionKind([wall1, wall2])).toBe('wall')
    expect(getPropertySelectionKind([opening])).toBe('opening')
  })

  it('farklı türler karışıktır', () => {
    expect(getPropertySelectionKind([wall1, opening])).toBe('mixed')
  })
})

describe('getCommonNumber', () => {
  it('hepsi aynıysa değeri verir', () => {
    expect(getCommonNumber([20, 20, 20])).toBe(20)
  })

  it('ayrışıyorsa undefined verir — rastgele biri gösterilmez', () => {
    expect(getCommonNumber([20, 30])).toBeUndefined()
  })

  it('boş dizi undefined', () => {
    expect(getCommonNumber([])).toBeUndefined()
  })
})

describe('getPropertyPanelTitle', () => {
  it('tek açıklıkta kapı ile pencereyi ayırır', () => {
    expect(getPropertyPanelTitle('opening', 1, true)).toBe('Kapı Özellikleri')
    expect(getPropertyPanelTitle('opening', 1, false)).toBe('Pencere Özellikleri')
  })

  it('çoklu seçimde sayıyı gösterir', () => {
    expect(getPropertyPanelTitle('wall', 3, false)).toBe('3 Duvar')
    expect(getPropertyPanelTitle('opening', 2, false)).toBe('2 Açıklık')
    expect(getPropertyPanelTitle('mixed', 4, false)).toBe('4 Nesne')
  })

  it('tek duvarda tür başlığı', () => {
    expect(getPropertyPanelTitle('wall', 1, false)).toBe('Duvar Özellikleri')
  })
})
