import { beforeEach, describe, expect, it } from 'vitest'

import { serializeProjectData } from '../../../core/serialize'
import {
  selectIsProjectDirty,
  selectProjectData,
  useCadStore,
} from '../../../store/cadStore'
import {
  ISOMETRIC_ALPHA_MAX_DEG,
  ISOMETRIC_ANGLES_DEFAULT,
} from '../../core/isometricProjection'

beforeEach(() => {
  useCadStore.getState().resetProject()
})

describe('isometricAngles — durum', () => {
  it('varsayılan WebCAD açılarıyla başlar', () => {
    expect(useCadStore.getState().isometricAngles).toEqual(ISOMETRIC_ANGLES_DEFAULT)
  })

  it('sınırların dışındaki açı yazılmadan önce kırpılır', () => {
    useCadStore.getState().setIsometricAngles({ alphaDeg: 200, betaDeg: -30 })

    expect(useCadStore.getState().isometricAngles).toEqual({
      alphaDeg: ISOMETRIC_ALPHA_MAX_DEG,
      betaDeg: 330,
    })
  })
})

describe('isometricAngles — kirli işareti', () => {
  it('açıyı değiştirmek projeyi KİRLİ YAPMAZ', () => {
    // Kullanıcının bakış açısını oynatması "kaydedilmemiş değişiklik" uyarısı
    // üretmemeli; K3'ün "görünüm projeyi kirletmez" garantisi burada da geçerli.
    expect(selectIsProjectDirty(useCadStore.getState())).toBe(false)

    useCadStore.getState().setIsometricAngles({ alphaDeg: 12, betaDeg: 34 })

    expect(selectIsProjectDirty(useCadStore.getState())).toBe(false)
  })

  it('gerçek bir çizim değişikliği hâlâ kirli yapar', () => {
    useCadStore.getState().addElement({ type: 'valve', position: { x: 0, y: 0 } })
    expect(selectIsProjectDirty(useCadStore.getState())).toBe(true)
  })
})

describe('isometricAngles — kalıcılık', () => {
  it('varsayılana eşitken JSON anahtarı HİÇ üretilmez', () => {
    const data = selectProjectData(useCadStore.getState())
    expect(data.isometricAngles).toBeUndefined()
    expect(serializeProjectData(data)).not.toContain('isometricAngles')
  })

  it('değiştirilince kaydedilir', () => {
    useCadStore.getState().setIsometricAngles({ alphaDeg: 20, betaDeg: 45 })

    const data = selectProjectData(useCadStore.getState())
    expect(data.isometricAngles).toEqual({ alphaDeg: 20, betaDeg: 45 })
    expect(serializeProjectData(data)).toContain('"isometricAngles":{"alphaDeg":20,"betaDeg":45}')
  })

  it('yüklenen projede alan yoksa VARSAYILANA döner', () => {
    useCadStore.getState().setIsometricAngles({ alphaDeg: 20, betaDeg: 45 })

    const data = selectProjectData(useCadStore.getState())
    useCadStore.getState().loadProject({ ...data, isometricAngles: undefined })

    // Önceki projenin açısı sızmamalı.
    expect(useCadStore.getState().isometricAngles).toEqual(ISOMETRIC_ANGLES_DEFAULT)
  })

  it('yüklenen projedeki açı geri gelir ve proje temiz kalır', () => {
    const data = selectProjectData(useCadStore.getState())
    useCadStore.getState().loadProject({ ...data, isometricAngles: { alphaDeg: 15, betaDeg: 75 } })

    expect(useCadStore.getState().isometricAngles).toEqual({ alphaDeg: 15, betaDeg: 75 })
    expect(selectIsProjectDirty(useCadStore.getState())).toBe(false)
  })
})
