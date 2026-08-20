import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_ROOM_NAME } from '../../core/model'
import { useCadStore } from '../cadStore'
import { addWall, drawRectangle, resetEmpty, rooms } from './roomFixture'

describe('oda tespiti — kapalı alan', () => {
  beforeEach(resetEmpty)

  it('şekil kapanınca oda oluşur', () => {
    drawRectangle()

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].name).toBe(DEFAULT_ROOM_NAME)
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

  it('duvar TAŞININCA oda ve adı korunur', () => {
    const { bottom } = drawRectangle()
    useCadStore.setState({
      rooms: rooms().map((room) => ({ ...room, name: 'Salon' })),
    })
    const roomId = rooms()[0].id

    useCadStore.getState().moveWall(bottom.wallId, 0, -50)

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].id).toBe(roomId)
    expect(rooms()[0].name).toBe('Salon')
  })

  it('duvar BÖLÜNÜNCE oda ve adı korunur', () => {
    drawRectangle()
    useCadStore.setState({ rooms: rooms().map((room) => ({ ...room, name: 'Salon' })) })
    const roomId = rooms()[0].id

    // Alt kenarın ortasına dışarıdan bir duvar değdir → alt kenar ikiye bölünür.
    addWall(200, 0, 200, -300)

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].id).toBe(roomId)
    expect(rooms()[0].name).toBe('Salon')
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
    useCadStore.setState({ rooms: rooms().map((room) => ({ ...room, name: 'Salon' })) })
    const oldRoomId = rooms()[0].id

    // Odayı ortadan kesen duvar: iki kenarı da böler.
    addWall(200, 0, 200, 300)

    expect(rooms()).toHaveLength(2)
    expect(rooms().every((room) => room.name === DEFAULT_ROOM_NAME)).toBe(true)
    // Eski kimlik yaşamaz — kullanıcı adı da kasten kaybolur.
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

  it('geri alma odanın ADINI da geri getirir', () => {
    const { bottom } = drawRectangle()
    useCadStore.setState({ rooms: rooms().map((room) => ({ ...room, name: 'Salon' })) })
    useCadStore.temporal.getState().clear()

    useCadStore.getState().deleteWall(bottom.wallId)
    expect(rooms()).toEqual([])

    useCadStore.temporal.getState().undo()

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].name).toBe('Salon')
  })
})

describe('oda adı düzenleme', () => {
  beforeEach(resetEmpty)

  it('adı değiştirir ve kırpar', () => {
    drawRectangle()
    const roomId = rooms()[0].id

    useCadStore.getState().setRoomName(roomId, '  Salon  ')

    expect(rooms()[0].name).toBe('Salon')
  })

  it('boş ad adı SİLER — etiket kullanım tipine düşsün diye', () => {
    // Eskiden reddediliyordu; mahal artık adsız doğduğu ve etiket ad → tip →
    // "Tanımsız" sırasını izlediği için adı temizlemek meşru bir işlem.
    drawRectangle()
    const roomId = rooms()[0].id
    useCadStore.getState().setRoomName(roomId, 'Salon')

    useCadStore.getState().setRoomName(roomId, '   ')

    expect(rooms()[0].name).toBe('')
  })

  it('kullanım tipi yazılır ve undefined ile ALANI SİLER', () => {
    drawRectangle()
    const roomId = rooms()[0].id

    useCadStore.getState().setRoomUsageType(roomId, 'kitchen')
    expect(rooms()[0].usageType).toBe('kitchen')

    // Alanın YOKLUĞU "tip belirtilmemiş" demek; boş bir değer bırakılmaz.
    useCadStore.getState().setRoomUsageType(roomId, undefined)
    expect('usageType' in rooms()[0]).toBe(false)
  })

  it('duvar taşınıp oda yeniden hesaplanınca kullanım tipi KORUNUR', () => {
    drawRectangle()
    const roomId = rooms()[0].id
    useCadStore.getState().setRoomUsageType(roomId, 'boilerRoom')

    // Aynı yüzü yeniden ürettiren bir düzenleme: eşleşme tutmalı ve tip yaşamalı.
    useCadStore.getState().setRoomName(roomId, 'Kazan')

    expect(rooms()[0].usageType).toBe('boilerRoom')
  })

  it('aynı adı yeniden yazmaz — geçmişe boş adım eklemesin', () => {
    drawRectangle()
    const roomId = rooms()[0].id
    const revisionBefore = useCadStore.getState().revision

    useCadStore.getState().setRoomName(roomId, DEFAULT_ROOM_NAME)

    expect(useCadStore.getState().revision).toBe(revisionBefore)
  })

  it('olmayan odada hiçbir şey yapmaz', () => {
    drawRectangle()
    const revisionBefore = useCadStore.getState().revision

    useCadStore.getState().setRoomName(9999, 'Salon')

    expect(useCadStore.getState().revision).toBe(revisionBefore)
    expect(rooms()[0].name).toBe(DEFAULT_ROOM_NAME)
  })

  it('ad değişimi tek Ctrl+Z ile geri alınır', () => {
    drawRectangle()
    const roomId = rooms()[0].id
    useCadStore.temporal.getState().clear()

    useCadStore.getState().setRoomName(roomId, 'Salon')
    expect(rooms()[0].name).toBe('Salon')

    useCadStore.temporal.getState().undo()

    expect(rooms()[0].name).toBe(DEFAULT_ROOM_NAME)
  })

  it('ad duvar taşınınca korunur — kimlik duvar kümesinde (K31)', () => {
    const { bottom } = drawRectangle()
    const roomId = rooms()[0].id
    useCadStore.getState().setRoomName(roomId, 'Mutfak')

    useCadStore.getState().moveWall(bottom.wallId, 0, -50)

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].name).toBe('Mutfak')
  })
})

