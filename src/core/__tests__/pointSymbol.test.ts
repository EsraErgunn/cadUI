import { describe, expect, it } from 'vitest'

import type { PointSymbol, PointSymbolType } from '../model'
import {
  formatSymbolLabel,
  getNextSymbolLabel,
  getPointSymbolTypeForTool,
  isSymbolLabelTaken,
  isSymbolLabelValid,
  SYMBOL_LABEL_PREFIXES,
  SYMBOL_TYPE_LABELS,
} from '../pointSymbol'

const GROUND = 1
const UPPER = 14

/** Serbest sembol: kat alanı kendisinde, duvar çözümü gerekmiyor. */
function makeSymbol(
  id: number,
  type: PointSymbolType,
  label: string,
  floorId = GROUND,
): PointSymbol {
  return { id, type, label, note: '', attachment: 'free', floorId, x: 0, y: 0, rotationDeg: 0 }
}

describe('etiket biçimi', () => {
  it('önek + iki basamak', () => {
    expect(formatSymbolLabel('panel', 1)).toBe('P-01')
    expect(formatSymbolLabel('alarmDevice', 3)).toBe('AL-03')
  })

  it('99"u geçince basamak büyür', () => {
    expect(formatSymbolLabel('vent', 100)).toBe('MN-100')
  })

  it('yedi tipin de öneki ve Türkçe adı var', () => {
    expect(Object.keys(SYMBOL_LABEL_PREFIXES)).toHaveLength(7)
    expect(Object.keys(SYMBOL_TYPE_LABELS)).toHaveLength(7)
  })
})

describe('getNextSymbolLabel', () => {
  it('boş sahnede 01"den başlar', () => {
    expect(getNextSymbolLabel([], 'panel', GROUND, [])).toBe('P-01')
  })

  it('en yüksek numaranın bir fazlasını verir', () => {
    const symbols = [makeSymbol(1, 'panel', 'P-01'), makeSymbol(2, 'panel', 'P-05')]

    expect(getNextSymbolLabel(symbols, 'panel', GROUND, [])).toBe('P-06')
  })

  it('numarayı SAYIDAN türetmez — silinen numara geri kullanılmaz', () => {
    // İki sembol var ama numaralar 1 ve 5; sayıya bakılsaydı "P-03" çıkardı.
    const symbols = [makeSymbol(1, 'panel', 'P-01'), makeSymbol(2, 'panel', 'P-05')]

    expect(getNextSymbolLabel(symbols, 'panel', GROUND, [])).not.toBe('P-03')
  })

  it('başka TİP sayımı etkilemez', () => {
    const symbols = [makeSymbol(1, 'vent', 'MN-09')]

    expect(getNextSymbolLabel(symbols, 'panel', GROUND, [])).toBe('P-01')
  })

  it('başka KAT sayımı etkilemez', () => {
    const symbols = [makeSymbol(1, 'panel', 'P-07', UPPER)]

    expect(getNextSymbolLabel(symbols, 'panel', GROUND, [])).toBe('P-01')
  })

  it('elle verilmiş biçimsiz etiket sayımı bozmaz', () => {
    const symbols = [makeSymbol(1, 'panel', 'Mutfak panosu'), makeSymbol(2, 'panel', 'P-02')]

    expect(getNextSymbolLabel(symbols, 'panel', GROUND, [])).toBe('P-03')
  })
})

describe('isSymbolLabelTaken', () => {
  const symbols = [makeSymbol(1, 'panel', 'P-01'), makeSymbol(2, 'vent', 'MN-01', UPPER)]

  it('aynı kattaki aynı adı yakalar', () => {
    expect(isSymbolLabelTaken(symbols, 'P-01', GROUND, [])).toBe(true)
  })

  it('TİPTEN bağımsızdır — panoya menfezin adı verilemez', () => {
    const sameFloor = [makeSymbol(1, 'vent', 'MN-01')]

    expect(isSymbolLabelTaken(sameFloor, 'MN-01', GROUND, [])).toBe(true)
  })

  it('başka kattaki aynı ad çakışma değildir', () => {
    expect(isSymbolLabelTaken(symbols, 'MN-01', GROUND, [])).toBe(false)
  })

  it('sembolün KENDİ adı çakışma sayılmaz', () => {
    expect(isSymbolLabelTaken(symbols, 'P-01', GROUND, [], 1)).toBe(false)
  })

  it('baştaki sondaki boşluğu yok sayar', () => {
    expect(isSymbolLabelTaken(symbols, '  P-01 ', GROUND, [])).toBe(true)
  })
})

describe('isSymbolLabelValid', () => {
  it('boş ad geçersiz', () => {
    expect(isSymbolLabelValid('   ')).toBe(false)
    expect(isSymbolLabelValid('P-01')).toBe(true)
  })
})

describe('getPointSymbolTypeForTool', () => {
  it('yedi aracın tipini verir', () => {
    expect(getPointSymbolTypeForTool('panel')).toBe('panel')
    expect(getPointSymbolTypeForTool('vent')).toBe('vent')
  })

  it('Desen A dışındaki araç için undefined', () => {
    expect(getPointSymbolTypeForTool('drawWall')).toBeUndefined()
    expect(getPointSymbolTypeForTool('flueShaft')).toBeUndefined()
    expect(getPointSymbolTypeForTool('selection')).toBeUndefined()
  })
})

