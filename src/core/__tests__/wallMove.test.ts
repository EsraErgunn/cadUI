import { describe, expect, it } from 'vitest'

import { constrainDeltaToNormal, getWallNormal, snapNormalMoveToGrid } from '../wallMove'

describe('getWallNormal', () => {
  it('yatay duvarın normali DİKEY', () => {
    expect(getWallNormal({ x: 0, y: 0 }, { x: 500, y: 0 })).toEqual({ x: 0, y: 1 })
  })

  it('dikey duvarın normali YATAY', () => {
    expect(getWallNormal({ x: 0, y: 0 }, { x: 0, y: 300 })).toEqual({ x: -1, y: 0 })
  })

  it('birim uzunlukta döner', () => {
    const normal = getWallNormal({ x: 0, y: 0 }, { x: 300, y: 400 })!
    expect(Math.hypot(normal.x, normal.y)).toBeCloseTo(1)
  })

  it('sıfır boy duvarın yönü tanımsız', () => {
    expect(getWallNormal({ x: 10, y: 10 }, { x: 10, y: 10 })).toBeUndefined()
  })
})

describe('constrainDeltaToNormal', () => {
  const up = { x: 0, y: 1 }

  it('normal yönündeki bileşeni korur', () => {
    expect(constrainDeltaToNormal(0, 120, up)).toEqual({ dxCm: 0, dyCm: 120 })
  })

  it('eksen boyunca kaymayı DÜŞÜRÜR', () => {
    // Yatay duvar yana sürüklenmek istense de kıpırdamaz.
    expect(constrainDeltaToNormal(200, 0, up)).toEqual({ dxCm: 0, dyCm: 0 })
  })

  it('çapraz sürüklemede yalnız dik bileşen kalır', () => {
    expect(constrainDeltaToNormal(200, 120, up)).toEqual({ dxCm: 0, dyCm: 120 })
  })

  it('eğik duvarda da normalde kalır', () => {
    const normal = getWallNormal({ x: 0, y: 0 }, { x: 100, y: 100 })!
    const moved = constrainDeltaToNormal(50, 50, normal)
    // Sonuç normale paralel: eksen bileşeni sıfır.
    expect(moved.dxCm * 1 + moved.dyCm * 1).toBeCloseTo(0)
  })
})

describe('snapNormalMoveToGrid', () => {
  const origin = { x: 0, y: 0 }
  const up = { x: 0, y: 1 }

  it('dikey harekette yalnız y yuvarlanır', () => {
    expect(snapNormalMoveToGrid(origin, 0, 137, up, 50)).toEqual({ dxCm: 0, dyCm: 150 })
  })

  it('ızgara dışı başlangıçta MUTLAK konuma yapışır', () => {
    // 20'den 137 ilerlerse 157'ye gelir; en yakın ızgara 150, yani öteleme 130.
    expect(snapNormalMoveToGrid({ x: 0, y: 20 }, 0, 137, up, 50)).toEqual({ dxCm: 0, dyCm: 130 })
  })

  it('yatay harekette yalnız x yuvarlanır', () => {
    const right = { x: 1, y: 0 }
    expect(snapNormalMoveToGrid(origin, 137, 0, right, 50)).toEqual({ dxCm: 150, dyCm: 0 })
  })

  it('kısıtlı eksen ASLA kaymaz — yapışma onu da yuvarlamamalı', () => {
    const moved = snapNormalMoveToGrid({ x: 17, y: 0 }, 0, 137, up, 50)
    expect(moved.dxCm).toBe(0)
  })

  it('eğik duvarda mesafe yuvarlanır ve sonuç normalde kalır', () => {
    const normal = getWallNormal({ x: 0, y: 0 }, { x: 100, y: 100 })!
    const moved = snapNormalMoveToGrid(origin, normal.x * 137, normal.y * 137, normal, 50)
    expect(Math.hypot(moved.dxCm, moved.dyCm)).toBeCloseTo(150)
  })
})
