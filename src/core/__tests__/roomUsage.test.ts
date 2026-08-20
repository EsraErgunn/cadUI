import { describe, expect, it } from 'vitest'

import {
  getRoomDisplayName,
  getRoomUsageOptions,
  isRoomUsageType,
  ROOM_USAGE_LABELS,
  ROOM_USAGE_TYPES,
  UNDEFINED_ROOM_LABEL,
} from '../roomUsage'

describe('kullanım tipi listesi', () => {
  it('her tipin Türkçe etiketi var', () => {
    for (const type of ROOM_USAGE_TYPES) {
      expect(ROOM_USAGE_LABELS[type]).toBeTruthy()
    }
  })

  it('etiketler benzersiz — açılır listede iki aynı satır olmaz', () => {
    const labels = Object.values(ROOM_USAGE_LABELS)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('seçenekler tr-TR sırasında gelir', () => {
    const labels = getRoomUsageOptions().map((option) => option.label)
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, 'tr-TR')))
  })

  it('liste dışı değeri tanımaz', () => {
    expect(isRoomUsageType('kitchen')).toBe(true)
    expect(isRoomUsageType('yatakOdasi')).toBe(false)
    expect(isRoomUsageType('')).toBe(false)
  })
})

describe('getRoomDisplayName', () => {
  it('ad varsa adı yazar — tip dolu olsa bile', () => {
    expect(getRoomDisplayName('1 nolu daire mutfağı', 'kitchen')).toBe('1 nolu daire mutfağı')
  })

  it('ad yoksa kullanım tipinin adına düşer', () => {
    expect(getRoomDisplayName('', 'boilerRoom')).toBe('Kazan Dairesi')
  })

  it('ikisi de yoksa Tanımsız', () => {
    expect(getRoomDisplayName('', undefined)).toBe(UNDEFINED_ROOM_LABEL)
  })

  it('yalnız boşluktan oluşan ad, ad sayılmaz', () => {
    expect(getRoomDisplayName('   ', 'kitchen')).toBe('Mutfak')
    expect(getRoomDisplayName('   ', undefined)).toBe(UNDEFINED_ROOM_LABEL)
  })

  it('adın baştaki/sondaki boşluğunu kırpar', () => {
    expect(getRoomDisplayName('  Salon  ', undefined)).toBe('Salon')
  })
})
