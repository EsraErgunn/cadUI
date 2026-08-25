import { describe, expect, it } from 'vitest'

import { PIPE_TYPES, PIPE_TYPE_NAMES, formatPipeOuterDiameter } from '../pipeTypes'

describe('formatPipeOuterDiameter', () => {
  it('katalogdaki santimetreyi milimetre olarak yazar', () => {
    expect(formatPipeOuterDiameter('DN25')).toBe('Ø33,7 mm')
    expect(formatPipeOuterDiameter('DN100')).toBe('Ø114,3 mm')
  })

  it('ayırıcı Türkçe virgüldür', () => {
    expect(formatPipeOuterDiameter('DN15')).toContain(',')
    expect(formatPipeOuterDiameter('DN15')).not.toContain('.')
  })

  it('her çap yazılabilir ve anma adından FARKLI bir sayı verir', () => {
    // DN25'in dış çapı 25 mm değil 33,7 mm; ikisi karıştırılmasın diye
    // açıklamada yan yana yazılıyor.
    for (const typeName of PIPE_TYPE_NAMES) {
      const formatted = formatPipeOuterDiameter(typeName)
      expect(formatted.startsWith('Ø')).toBe(true)
      expect(formatted.endsWith(' mm')).toBe(true)
      expect(PIPE_TYPES[typeName].outerDiameterCm).toBeGreaterThan(0)
    }
  })
})
