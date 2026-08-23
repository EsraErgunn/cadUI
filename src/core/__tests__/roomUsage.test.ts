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

  it('açık ve kapalı balkon AYRI tip (K144)', () => {
    // `balcony` DEĞERİ korundu, yalnız etiketi netleşti: eski kayıtlar
    // silinmiş bir tipe düşmesin.
    expect(getRoomDisplayName('balcony')).toBe('Balkon (Açık)')
    expect(getRoomDisplayName('balconyClosed')).toBe('Balkon (Kapalı)')
  })

  it('liste dışı değeri tanımaz', () => {
    expect(isRoomUsageType('kitchen')).toBe(true)
    expect(isRoomUsageType('yatakOdasi')).toBe(false)
    expect(isRoomUsageType('')).toBe(false)
  })
})

describe('getRoomDisplayName', () => {
  it('kullanım tipinin Türkçe adını yazar', () => {
    expect(getRoomDisplayName('boilerRoom')).toBe('Kazan Dairesi')
    expect(getRoomDisplayName('kitchen')).toBe('Mutfak')
  })

  it('tip seçilmemişse Tanımsız', () => {
    expect(getRoomDisplayName(undefined)).toBe(UNDEFINED_ROOM_LABEL)
  })

  it('her tip için bir etiket üretir — hiçbiri Tanımsız\'a düşmez', () => {
    for (const type of ROOM_USAGE_TYPES) {
      expect(getRoomDisplayName(type)).not.toBe(UNDEFINED_ROOM_LABEL)
    }
  })
})

describe('kullanım tipi seçenekleri panelde', () => {
  it('"Tanımsız" listede DEĞİL — o bir tip değil, tipin yokluğu', () => {
    expect(getRoomUsageOptions().map((option) => option.label)).not.toContain(UNDEFINED_ROOM_LABEL)
  })

  it('seçenek sayısı tip sayısıyla birebir', () => {
    expect(getRoomUsageOptions()).toHaveLength(ROOM_USAGE_TYPES.length)
  })
})
