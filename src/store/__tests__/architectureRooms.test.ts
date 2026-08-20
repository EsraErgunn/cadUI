import { beforeEach, describe, expect, it } from 'vitest'


import { getRoomDisplayName } from '../../core/roomUsage'
import { useCadStore } from '../cadStore'
import { addWall, drawRectangle, resetEmpty, rooms } from './roomFixture'

describe('oda tespiti — kapalı alan', () => {
  beforeEach(resetEmpty)

  it('şekil kapanınca oda oluşur', () => {
    drawRectangle()

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].usageType).toBeUndefined()
  })

  it('şekil kapanmadan oda oluşmaz', () => {
    addWall(0, 0, 400, 0)
    addWall(400, 0, 400, 300)
    addWall(400, 300, 0, 300)

    expect(rooms()).toEqual([])
  })

  it('odanın çevrimi dört duvarı da içerir', () => {
    const { bottom, right, top, left } = drawRectangle()
    const ids = [bottom, right, top, left].map((wall) => wall.wallId).sort((a, b) => a - b)

    expect([...rooms()[0].wallIds].sort((a, b) => a - b)).toEqual(ids)
  })
})

describe('oda tespiti — kimlik', () => {
  beforeEach(resetEmpty)

  it('duvar TAŞININCA oda ve kullanım tipi korunur', () => {
    const { bottom } = drawRectangle()
    useCadStore.setState({
      rooms: rooms().map((room) => ({ ...room, usageType: 'livingRoom' as const })),
    })
    const roomId = rooms()[0].id

    useCadStore.getState().moveWall(bottom.wallId, 0, -50)

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].id).toBe(roomId)
    expect(rooms()[0].usageType).toBe('livingRoom')
  })

  it('duvar BÖLÜNÜNCE oda ve adı korunur', () => {
    drawRectangle()
    useCadStore.setState({ rooms: rooms().map((room) => ({ ...room, usageType: 'livingRoom' as const })) })
    const roomId = rooms()[0].id

    // Alt kenarın ortasına dışarıdan bir duvar değdir → alt kenar ikiye bölünür.
    addWall(200, 0, 200, -300)

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].id).toBe(roomId)
    expect(rooms()[0].usageType).toBe('livingRoom')
  })

  it('duvar SİLİNİNCE oda düşer', () => {
    const { bottom } = drawRectangle()
    expect(rooms()).toHaveLength(1)

    useCadStore.getState().deleteWall(bottom.wallId)

    expect(rooms()).toEqual([])
  })
})

describe('oda tespiti — içinden duvar geçmesi', () => {
  beforeEach(resetEmpty)

  it('oda İKİYE ayrılır ve ikisi de varsayılan adı alır', () => {
    drawRectangle()
    useCadStore.setState({ rooms: rooms().map((room) => ({ ...room, usageType: 'livingRoom' as const })) })
    const oldRoomId = rooms()[0].id

    // Odayı ortadan kesen duvar: iki kenarı da böler.
    addWall(200, 0, 200, 300)

    expect(rooms()).toHaveLength(2)
    expect(rooms().every((room) => room.usageType === undefined)).toBe(true)
    // Eski kimlik yaşamaz — kullanıcının verdiği tanım da kasten kaybolur.
    expect(rooms().some((room) => room.id === oldRoomId)).toBe(false)
  })
})

describe('oda tespiti — geri alma', () => {
  beforeEach(resetEmpty)

  it('oda, onu doğuran duvarla TEK adımda geri alınır', () => {
    const bottom = addWall(0, 0, 400, 0)!
    const right = useCadStore
      .getState()
      .addWall({ start: { pointId: bottom.p2Id }, end: { position: { x: 400, y: 300 } } })!
    const top = useCadStore
      .getState()
      .addWall({ start: { pointId: right.p2Id }, end: { position: { x: 0, y: 300 } } })!
    expect(rooms()).toEqual([])
    useCadStore.temporal.getState().clear()

    // Kapatan duvar: odayı doğuran hamle bu.
    useCadStore.getState().addWall({ start: { pointId: top.p2Id }, end: { pointId: bottom.p1Id } })
    expect(rooms()).toHaveLength(1)

    useCadStore.temporal.getState().undo()

    expect(rooms()).toEqual([])
  })

  it('geri alma odanın TANIMINI da geri getirir', () => {
    const { bottom } = drawRectangle()
    useCadStore.setState({ rooms: rooms().map((room) => ({ ...room, usageType: 'livingRoom' as const })) })
    useCadStore.temporal.getState().clear()

    useCadStore.getState().deleteWall(bottom.wallId)
    expect(rooms()).toEqual([])

    useCadStore.temporal.getState().undo()

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].usageType).toBe('livingRoom')
  })
})

describe('mahal tanımlama', () => {
  beforeEach(resetEmpty)

  it('kullanım tipi yazılır ve undefined ile ALANI SİLER', () => {
    drawRectangle()
    const roomId = rooms()[0].id

    useCadStore.getState().setRoomUsageType(roomId, 'kitchen')
    expect(rooms()[0].usageType).toBe('kitchen')

    // Alanın YOKLUĞU "tip belirtilmemiş" demek; boş bir değer bırakılmaz.
    useCadStore.getState().setRoomUsageType(roomId, undefined)
    expect('usageType' in rooms()[0]).toBe(false)
  })

  it('yeni mahal TİPSİZ doğar, etiketi "Tanımsız"', () => {
    drawRectangle()

    expect(rooms()[0].usageType).toBeUndefined()
    expect(getRoomDisplayName(rooms()[0].usageType)).toBe('Tanımsız')
  })

  it('aynı tipi yeniden yazmaz — geçmişe boş adım eklemesin', () => {
    drawRectangle()
    const roomId = rooms()[0].id
    useCadStore.getState().setRoomUsageType(roomId, 'kitchen')
    const revisionBefore = useCadStore.getState().revision

    useCadStore.getState().setRoomUsageType(roomId, 'kitchen')

    expect(useCadStore.getState().revision).toBe(revisionBefore)
  })

  it('olmayan mahalde hiçbir şey yapmaz', () => {
    drawRectangle()
    const revisionBefore = useCadStore.getState().revision

    useCadStore.getState().setRoomUsageType(9999, 'kitchen')

    expect(useCadStore.getState().revision).toBe(revisionBefore)
    expect(rooms()[0].usageType).toBeUndefined()
  })

  it('tip değişimi tek Ctrl+Z ile geri alınır', () => {
    drawRectangle()
    const roomId = rooms()[0].id
    useCadStore.temporal.getState().clear()

    useCadStore.getState().setRoomUsageType(roomId, 'livingRoom')
    expect(rooms()[0].usageType).toBe('livingRoom')

    useCadStore.temporal.getState().undo()

    expect(rooms()[0].usageType).toBeUndefined()
  })

  it('tip duvar taşınınca korunur — kimlik duvar kümesinde (K31)', () => {
    const { bottom } = drawRectangle()
    const roomId = rooms()[0].id
    useCadStore.getState().setRoomUsageType(roomId, 'kitchen')

    useCadStore.getState().moveWall(bottom.wallId, 0, -50)

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].usageType).toBe('kitchen')
  })
})
