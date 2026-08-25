import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { FloorManagementDialog } from '../FloorManagementDialog'

const UPPER_FLOOR_ID = 100

/** Zemin katta kapalı kare — kopyalanacak gerçek bir çizim; üst kat BOŞ. */
function seedGroundFloorDrawing(): void {
  useCadStore.setState({
    points: [
      { id: 2, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
      { id: 3, floorId: DEFAULT_FLOOR_ID, x: 400, y: 0 },
      { id: 4, floorId: DEFAULT_FLOOR_ID, x: 400, y: 300 },
      { id: 5, floorId: DEFAULT_FLOOR_ID, x: 0, y: 300 },
    ],
    walls: [
      { id: 6, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
      { id: 7, floorId: DEFAULT_FLOOR_ID, p1Id: 3, p2Id: 4, thickness: 20, height: 280 },
      { id: 8, floorId: DEFAULT_FLOOR_ID, p1Id: 4, p2Id: 5, thickness: 20, height: 280 },
      { id: 9, floorId: DEFAULT_FLOOR_ID, p1Id: 5, p2Id: 2, thickness: 20, height: 280 },
    ],
    nextUniqueId: 200,
  })
  // Kurulumun setState çağrısı da geçmişe yazıyor; ölçülen yalnız pencere olsun.
  useCadStore.temporal.getState().clear()
}

beforeEach(() => {
  useCadStore.setState({
    floors: [
      createGroundFloor(),
      { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: DEFAULT_FLOOR_HEIGHT_CM, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
    beams: [],
    texts: [],
    installationElements: [],
    installationLines: [],
    installationConnections: [],
    nextUniqueId: 200,
    revision: 0,
  })
  useCadStore.temporal.getState().clear()
})

function renderDialog(props: { isCopyMode?: boolean } = {}) {
  const onClose = vi.fn()
  render(<FloorManagementDialog {...props} onClose={onClose} />)
  return { onClose }
}

function floorNames(): string[] {
  return useCadStore.getState().floors.map((floor) => floor.name)
}

function rows(): HTMLElement[] {
  return screen.getAllByRole('listitem')
}

function wallCountOn(floorId: number): number {
  return useCadStore.getState().walls.filter((wall) => wall.floorId === floorId).length
}

const clickApply = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Uygula' }))

describe('FloorManagementDialog — liste', () => {
  it('katları EN ÜST kat başta listeler', () => {
    renderDialog()

    const names = rows().map((row) => row.textContent ?? '')
    expect(names[0]).toContain('1. Kat')
    expect(names[1]).toContain(DEFAULT_FLOOR_NAME)
  })

  it('kot ve içerik durumu satırda okunur', () => {
    renderDialog()

    expect(screen.getByText('+3,00')).toBeInTheDocument()
    // İçerik TEK glif; iki kat da boş.
    expect(screen.getAllByLabelText('Boş')).toHaveLength(2)
  })

  it('açıklama PARAGRAFI yok — sütunlar kendini anlatır', () => {
    renderDialog()

    expect(screen.queryByText(/toplu işlem içindir/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Yalnızca bundan sonra eklenen katlara/)).not.toBeInTheDocument()
  })
})

describe('FloorManagementDialog — Uygula ve İptal', () => {
  it('İptal hiçbir şey yazmaz', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog()

    await user.click(screen.getByRole('button', { name: 'Ekle' }))
    await user.click(screen.getByRole('button', { name: 'İptal' }))

    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME, '1. Kat'])
    expect(onClose).toHaveBeenCalled()
  })

  it('Uygula TEK geri alma adımı yazar', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Ekle' }))
    await clickApply(user)

    expect(floorNames()).toHaveLength(3)
    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)
  })
})

describe('FloorManagementDialog — ad konumdan gelir (K167)', () => {
  it('ad DÜZENLENEMEZ: satırdaki tek alan yükseklik', () => {
    renderDialog()

    expect(screen.queryByLabelText('1. Kat adı')).not.toBeInTheDocument()
    expect(screen.getByLabelText('1. Kat yüksekliği')).toBeInTheDocument()
  })

  it('kat yer değiştirince ADLAR da yer değiştirir', async () => {
    const user = userEvent.setup()
    renderDialog()

    // Zemin Kat'ı yukarı taşı: en üste geçen kat "1. Kat" adını devralmalı.
    const handle = screen.getByRole('button', { name: `${DEFAULT_FLOOR_NAME} sırasını değiştir` })
    handle.focus()
    await user.keyboard('{ArrowUp}')

    expect(rows()[0].textContent).toContain('1. Kat')
    expect(rows()[1].textContent).toContain(DEFAULT_FLOOR_NAME)
  })

  it('yükseklik değişince kot ANINDA güncellenir', async () => {
    const user = userEvent.setup()
    renderDialog()

    const field = screen.getByLabelText(`${DEFAULT_FLOOR_NAME} yüksekliği`)
    await user.clear(field)
    await user.type(field, '400')
    await user.tab()

    expect(screen.getByText('+4,00')).toBeInTheDocument()
  })
})

describe('FloorManagementDialog — sayıyla toplu ekleme (K166)', () => {
  it('girilen sayı kadar kat ekler', async () => {
    const user = userEvent.setup()
    renderDialog()

    const count = screen.getByLabelText('Eklenecek kat sayısı')
    await user.clear(count)
    await user.type(count, '3')
    await user.click(screen.getByRole('button', { name: 'Ekle' }))

    expect(rows()).toHaveLength(5)

    await clickApply(user)
    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME, '1. Kat', '2. Kat', '3. Kat', '4. Kat'])
  })

  it('kaynak seçilirse eklenen katların HEPSİ o kattan kopyalanır', async () => {
    seedGroundFloorDrawing()
    const user = userEvent.setup()
    renderDialog()

    const count = screen.getByLabelText('Eklenecek kat sayısı')
    await user.clear(count)
    await user.type(count, '2')

    await user.click(screen.getByRole('button', { name: 'Yeni katın içeriği' }))
    await user.click(
      screen.getByRole('menuitem', { name: new RegExp(`${DEFAULT_FLOOR_NAME}'tan kopyalayarak`) }),
    )
    await user.click(screen.getByRole('button', { name: 'Ekle' }))
    await clickApply(user)

    const added = useCadStore.getState().floors.slice(-2)
    expect(added.map((floor) => wallCountOn(floor.id))).toEqual([4, 4])
  })

  it('yeni kat ALTINDAKİ katın yüksekliğini devralır', async () => {
    const user = userEvent.setup()
    renderDialog()

    const height = screen.getByLabelText('1. Kat yüksekliği')
    await user.clear(height)
    await user.type(height, '420')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Ekle' }))
    await clickApply(user)

    expect(useCadStore.getState().floors.at(-1)?.heightCm).toBe(420)
  })
})

describe('FloorManagementDialog — kopyalama KİP (K166)', () => {
  async function enterCopyMode(user: ReturnType<typeof userEvent.setup>) {
    // Satırdaki kopyalama ikonu; açılır menü kalktı.
    await user.click(screen.getByRole('button', { name: `${DEFAULT_FLOOR_NAME} kattan kopyala` }))
  }

  it('ikinci bir pencere AÇMAZ, aynı liste hedef seçmeye geçer', async () => {
    seedGroundFloorDrawing()
    const user = userEvent.setup()
    renderDialog()

    await enterCopyMode(user)

    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Hedef katlar' })).toBeInTheDocument()
  })

  it('kopyalama Uygula"ya kadar store"a YAZMAZ', async () => {
    seedGroundFloorDrawing()
    const user = userEvent.setup()
    renderDialog()

    await enterCopyMode(user)
    await user.click(screen.getByLabelText('1. Kat hedef'))
    await user.click(screen.getByRole('button', { name: '1 kata kopyala' }))

    // Kip kapandı ama çizim hâlâ eski hâlinde.
    expect(wallCountOn(UPPER_FLOOR_ID)).toBe(0)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('İptal kopyalamayı da geri alır — eski pencerede alamıyordu', async () => {
    seedGroundFloorDrawing()
    const user = userEvent.setup()
    renderDialog()

    await enterCopyMode(user)
    await user.click(screen.getByLabelText('1. Kat hedef'))
    await user.click(screen.getByRole('button', { name: '1 kata kopyala' }))
    await user.click(screen.getByRole('button', { name: 'İptal' }))

    expect(wallCountOn(UPPER_FLOOR_ID)).toBe(0)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('Uygula kopyalamayı ve yapı değişikliğini TEK adımda yazar', async () => {
    seedGroundFloorDrawing()
    const user = userEvent.setup()
    renderDialog()

    await enterCopyMode(user)
    await user.click(screen.getByLabelText('1. Kat hedef'))
    await user.click(screen.getByRole('button', { name: '1 kata kopyala' }))
    await clickApply(user)

    expect(wallCountOn(UPPER_FLOOR_ID)).toBe(4)
    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)
  })

  it('BİR kaynak BİRDEN ÇOK kata kopyalanır — seçim birikir', async () => {
    seedGroundFloorDrawing()
    useCadStore.setState({
      floors: [
        ...useCadStore.getState().floors,
        { id: 300, name: '2. Kat', heightCm: DEFAULT_FLOOR_HEIGHT_CM, isBasement: false },
      ],
    })
    const user = userEvent.setup()
    renderDialog()

    await enterCopyMode(user)
    await user.click(screen.getByLabelText('1. Kat hedef'))
    await user.click(screen.getByLabelText('2. Kat hedef'))

    // İkinci tıklama birincisini DÜŞÜRMEZ.
    await user.click(screen.getByRole('button', { name: '2 kata kopyala' }))
    await clickApply(user)

    expect(wallCountOn(UPPER_FLOOR_ID)).toBe(4)
    expect(wallCountOn(300)).toBe(4)
  })

  it('hedef seçilmeden kopyalama düğmesi PASİF', async () => {
    seedGroundFloorDrawing()
    const user = userEvent.setup()
    renderDialog()

    await enterCopyMode(user)

    expect(screen.getByRole('button', { name: '0 kata kopyala' })).toBeDisabled()
  })

})

describe('FloorManagementDialog — seçim ve silme (K166)', () => {
  it('satırdaki çöp kutusu ONAY SORMADAN siler', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: '1. Kat sil' }))

    // Onay penceresi YOK; taslakta anında gitti, store'a Uygula yazacak.
    expect(rows()).toHaveLength(1)
    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME, '1. Kat'])

    await clickApply(user)
    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME])
  })

  it('DOLU katı silerken satırda onay ister', async () => {
    seedGroundFloorDrawing()
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: `${DEFAULT_FLOOR_NAME} sil` }))

    // Kat henüz durUYOR; onay bekliyor.
    expect(rows()).toHaveLength(2)
    expect(screen.getByText('Çizim silinecek')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: `${DEFAULT_FLOOR_NAME} silmeyi onayla` }))
    expect(rows()).toHaveLength(1)
  })

  it('onayda İptal katı bırakır', async () => {
    seedGroundFloorDrawing()
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: `${DEFAULT_FLOOR_NAME} sil` }))
    await user.click(screen.getByRole('button', { name: 'Vazgeç' }))

    expect(rows()).toHaveLength(2)
    expect(screen.queryByText('Çizim silinecek')).not.toBeInTheDocument()
  })

  it('silme pencere içinde GERİ ALINIR', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: '1. Kat sil' }))
    expect(rows()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Geri al' }))
    expect(rows()).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Yinele' }))
    expect(rows()).toHaveLength(1)
  })

  it('geri al yığın boşken PASİF', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Geri al' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Yinele' })).toBeDisabled()
  })

  it('SEÇİM geçmişe girmez — Ctrl+Z seçimi değil düzenlemeyi geri alır', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Ekle' }))
    await user.click(screen.getByLabelText('1. Kat seç'))
    await user.click(screen.getByRole('button', { name: 'Geri al' }))

    expect(rows()).toHaveLength(2)
  })

  it('tümünü seç bütün katları işaretler, toplu silme hepsini kaldırır', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByLabelText('Tümünü seç'))
    expect(screen.getByText('2 seçili')).toBeInTheDocument()

    // Projede en az bir kat kalmalı: tamamını kapsayan silme reddedilir.
    await user.click(screen.getByRole('button', { name: 'Seçili katları sil' }))
    expect(rows()).toHaveLength(2)
  })

  it('BİRDEN ÇOK kat seçiliyken toplu Kopyala YOK — kaynak tek olabilir', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByLabelText(`${DEFAULT_FLOOR_NAME} seç`))
    expect(screen.getByRole('button', { name: 'Kopyala' })).toBeInTheDocument()

    await user.click(screen.getByLabelText('1. Kat seç'))
    expect(screen.queryByRole('button', { name: 'Kopyala' })).not.toBeInTheDocument()
    // Silme çok seçimde çalışmaya devam eder.
    expect(screen.getByRole('button', { name: 'Seçili katları sil' })).toBeInTheDocument()
  })

  it('elle seçilen katlar toplu silinir', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Ekle' }))
    await user.click(screen.getByLabelText('1. Kat seç'))
    await user.keyboard('{Control>}')
    await user.click(screen.getByLabelText('2. Kat seç'))
    await user.keyboard('{/Control}')
    await user.click(screen.getByRole('button', { name: 'Seçili katları sil' }))
    await clickApply(user)

    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME])
  })

  it('son kat silinemez', async () => {
    useCadStore.setState({ floors: [createGroundFloor()] })
    renderDialog()

    expect(screen.getByRole('button', { name: `${DEFAULT_FLOOR_NAME} sil` })).toBeDisabled()
  })
})
