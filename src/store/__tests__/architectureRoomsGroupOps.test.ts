import { beforeEach, describe, expect, it } from 'vitest'

import { useCadStore } from '../cadStore'
import { drawRectangle, resetEmpty, rooms } from './roomFixture'

/**
 * Grup işlemleri (KK-10/KK-11) odalardan ÖNCE yazıldı; oda yeniden hesaplaması
 * onlara sonradan bağlandı. Bu testler o bağı korur — düşerse odalar sessizce
 * hayalete döner ve kaydedilen JSON'a sızar.
 */
describe('oda tespiti — grup işlemleri', () => {
  beforeEach(resetEmpty)

  it('deleteSelection duvarı silince oda düşer', () => {
    const { bottom } = drawRectangle()
    expect(rooms()).toHaveLength(1)

    useCadStore.getState().deleteSelection([{ kind: 'wall', id: bottom.wallId }])

    expect(rooms()).toEqual([])
  })

  it('duplicateSelection kapalı çevrimi kopyalayınca YENİ oda doğar', () => {
    const { bottom, right, top } = drawRectangle()
    const closing = useCadStore.getState().walls.at(-1)!
    const selection = [bottom.wallId, right.wallId, top.wallId, closing.id].map((id) => ({
      kind: 'wall' as const,
      id,
    }))

    useCadStore.getState().duplicateSelection(selection, { dxCm: 1000, dyCm: 0 })

    expect(rooms()).toHaveLength(2)
  })

  it('transformSelection odayı taşırken kullanım tipini korur', () => {
    const { bottom, right, top } = drawRectangle()
    const closing = useCadStore.getState().walls.at(-1)!
    useCadStore.getState().setRoomUsageType(rooms()[0].id, 'livingRoom')
    const selection = [bottom.wallId, right.wallId, top.wallId, closing.id].map((id) => ({
      kind: 'wall' as const,
      id,
    }))

    useCadStore
      .getState()
      .transformSelection(selection, { kind: 'translate', dxCm: 200, dyCm: 100 })

    expect(rooms()).toHaveLength(1)
    expect(rooms()[0].usageType).toBe('livingRoom')
  })
})
