import { describe, expect, it } from 'vitest'

import { mergeElementIds, pruneElementIds, toggleElementId } from '../elementSelection'

describe('toggleElementId', () => {
  it('seçili olmayanı ekler', () => {
    expect(toggleElementId([1, 2], 3)).toEqual([1, 2, 3])
  })

  it('seçili olanı çıkarır', () => {
    expect(toggleElementId([1, 2, 3], 2)).toEqual([1, 3])
  })

  it('girdiyi değiştirmez', () => {
    const ids = [1, 2]
    toggleElementId(ids, 3)
    expect(ids).toEqual([1, 2])
  })
})

describe('mergeElementIds', () => {
  it('aynı id iki kez girmez', () => {
    expect(mergeElementIds([1, 2], [2, 3])).toEqual([1, 2, 3])
  })

  it('mevcut seçimin sırasını korur', () => {
    expect(mergeElementIds([3, 1], [2])).toEqual([3, 1, 2])
  })
})

describe('pruneElementIds', () => {
  it('artık var olmayan id kayıtlarını düşürür', () => {
    expect(pruneElementIds([1, 2, 3], [1, 3])).toEqual([1, 3])
  })

  it('hepsi duruyorsa aynı içeriği döndürür', () => {
    expect(pruneElementIds([1, 2], [1, 2, 5])).toEqual([1, 2])
  })
})
