import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { FloorManagementDialog } from '../FloorManagementDialog'

const UPPER_FLOOR_ID = 100

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
    installationElements: [],
    installationLines: [],
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
})

function renderDialog(onClose = vi.fn()) {
  render(<FloorManagementDialog onClose={onClose} />)
  return { onClose }
}

function floorNames(): string[] {
  return useCadStore.getState().floors.map((floor) => floor.name)
}

describe('FloorManagementDialog — liste', () => {
  it('katları EN ÜST kat başta listeler', () => {
    renderDialog()

    const names = screen
      .getAllByRole('textbox', { name: /adı$/ })
      .map((input) => (input as HTMLInputElement).value)
    expect(names).toEqual(['1. Kat', DEFAULT_FLOOR_NAME])
  })

  it('özet alanında bina yüksekliği, kat sayısı ve aktif kat görünür (KK-2)', () => {
    renderDialog()

    expect(screen.getByText('6,00')).toBeInTheDocument()
    expect(screen.getByText('Bina yüksekliği')).toBeInTheDocument()
    expect(screen.getByText(DEFAULT_FLOOR_NAME)).toBeInTheDocument()
  })

  it('zemin katın kotu ±0,00, üstündeki kat pozitif (KK-3)', () => {
    renderDialog()

    expect(screen.getByText('±0,00')).toBeInTheDocument()
    expect(screen.getByText('+3,00')).toBeInTheDocument()
  })

  it('çizimi olmayan katlar "Boş" rozeti ve bilgilendirme kutusu alır (KK-10)', () => {
    renderDialog()

    expect(screen.getAllByText('Boş')).toHaveLength(2)
    expect(screen.getByText(/boş\. Boş katlar kaydedilir/)).toBeInTheDocument()
  })
})

describe('FloorManagementDialog — Uygula ve İptal (KK-11)', () => {
  it('"Uygula" tıklanana kadar store"a YAZMAZ', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Kat Ekle' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Boş kat' }))

    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME, '1. Kat'])
  })

  it('"Uygula" değişiklikleri yazar ve pencereyi kapatır', async () => {
    const { onClose } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Kat Ekle' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Boş kat' }))
    await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))

    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME, '1. Kat', '2. Kat'])
    expect(onClose).toHaveBeenCalled()
  })

  it('"İptal" hiçbir değişikliği uygulamaz', async () => {
    const { onClose } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Kat Ekle' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Boş kat' }))
    await userEvent.click(screen.getByRole('button', { name: 'İptal' }))

    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME, '1. Kat'])
    expect(onClose).toHaveBeenCalled()
  })

  it('ekleme + silme TEK adımda uygulanır — geçmişe iki adım yazılmaz (KK-20)', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))
    await userEvent.click(screen.getByRole('button', { name: 'Kat Ekle' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Boş kat' }))
    await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))

    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)
  })
})

describe('FloorManagementDialog — kat adı (KK-5)', () => {
  it('adı değiştirir', async () => {
    renderDialog()

    const input = screen.getByRole('textbox', { name: '1. Kat adı' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Çatı')
    await userEvent.tab()
    await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))

    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME, 'Çatı'])
  })

  it('çakışan adı reddeder ve uyarır', async () => {
    renderDialog()

    const input = screen.getByRole('textbox', { name: '1. Kat adı' })
    await userEvent.clear(input)
    await userEvent.type(input, DEFAULT_FLOOR_NAME)

    expect(screen.getByRole('alert')).toHaveTextContent('başka bir katta kullanılıyor')

    await userEvent.tab()
    await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))
    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME, '1. Kat'])
  })

  it('boş ad reddedilir', async () => {
    renderDialog()

    const input = screen.getByRole('textbox', { name: '1. Kat adı' })
    await userEvent.clear(input)

    expect(screen.getByRole('alert')).toHaveTextContent('boş olamaz')
  })
})

describe('FloorManagementDialog — yükseklik ve kot (KK-4)', () => {
  it('yükseklik değişince ÜSTTEKİ katın kotu kayar', async () => {
    renderDialog()

    const input = screen.getByRole('textbox', { name: `${DEFAULT_FLOOR_NAME} yüksekliği` })
    await userEvent.clear(input)
    await userEvent.type(input, '400')
    await userEvent.tab()

    expect(screen.getByText('+4,00')).toBeInTheDocument()
    // Bina yüksekliği de anında güncellenir (KK-2).
    expect(screen.getByText('7,00')).toBeInTheDocument()
  })

  it('200 cm altı değer alana yazılmaz', async () => {
    renderDialog()

    const input = screen.getByRole('textbox', { name: `${DEFAULT_FLOOR_NAME} yüksekliği` })
    await userEvent.clear(input)
    await userEvent.type(input, '150')
    await userEvent.tab()

    expect(input).toHaveValue('300')
  })
})

describe('FloorManagementDialog — seçim ve aktif kat (KK-9)', () => {
  it('"Aktif Yap" rozeti taşır, SEÇ işaretlerine dokunmaz', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('checkbox', { name: `${DEFAULT_FLOOR_NAME} seç` }))
    await userEvent.click(screen.getByRole('button', { name: 'Aktif Yap' }))

    expect(screen.getByText('AKTİF')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: `${DEFAULT_FLOOR_NAME} seç` })).toBeChecked()
  })

  it('aktif kat değişikliği "Uygula" ile yürürlüğe girer', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Aktif Yap' }))
    expect(useCadStore.getState().activeFloorId).toBe(DEFAULT_FLOOR_ID)

    await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))
    expect(useCadStore.getState().activeFloorId).toBe(UPPER_FLOOR_ID)
  })

  it('seçili kat adedi ve toplu silme düğmesi görünür', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('checkbox', { name: '1. Kat seç' }))

    expect(screen.getByText('Seçili 1 kat:')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sil' }))
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Kat içeriğinin silineceğini anladım' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Katı Sil' }))
    await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))

    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME])
  })
})

describe('FloorManagementDialog — sıralama ve ekleme', () => {
  it('tutamakta ArrowDown katı bir sıra aşağı taşır (KK-6)', async () => {
    renderDialog()

    screen.getByRole('button', { name: '1. Kat sırasını değiştir' }).focus()
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))

    expect(floorNames()).toEqual(['1. Kat', DEFAULT_FLOOR_NAME])
  })

  it('bodrum listenin en altına eklenir ve kotu negatif olur (KK-8)', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '+ Bodrum Ekle' }))

    expect(screen.getByText('−3,00')).toBeInTheDocument()
    expect(screen.getByText('(1 bodrum)')).toBeInTheDocument()
  })

  it('"Yeni kat yüksekliği" yalnız EKLENEN kata uygulanır (KK-7)', async () => {
    renderDialog()

    const field = screen.getByRole('textbox', { name: 'Yeni kat yüksekliği' })
    await userEvent.clear(field)
    await userEvent.type(field, '450')
    await userEvent.tab()

    await userEvent.click(screen.getByRole('button', { name: 'Kat Ekle' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Boş kat' }))
    await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))

    expect(useCadStore.getState().floors.map((floor) => floor.heightCm)).toEqual([300, 300, 450])
  })

  it('son kat silinemez', async () => {
    useCadStore.setState({ floors: [createGroundFloor()] })
    renderDialog()

    expect(screen.getByRole('button', { name: `${DEFAULT_FLOOR_NAME} sil` })).toBeDisabled()
  })
})

describe('FloorManagementDialog — kat silme onayı (KK-12, KK-14)', () => {
  it('satırdaki silme aksiyonu onay penceresi açar, doğrudan silmez', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))

    expect(screen.getByRole('heading', { name: 'Kat Silme Onayı' })).toBeInTheDocument()
    expect(screen.getByText(/silinecek\. Kata ait mimari/)).toBeInTheDocument()
    // Onay açılmışken kat hâlâ taslakta duruyor.
    expect(screen.getByRole('textbox', { name: '1. Kat adı' })).toBeInTheDocument()
  })

  it('onay kutusu işaretlenmeden "Katı Sil" pasiftir', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))
    const confirm = screen.getByRole('button', { name: 'Katı Sil' })
    expect(confirm).toBeDisabled()

    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Kat içeriğinin silineceğini anladım' }),
    )
    expect(confirm).toBeEnabled()
  })

  it('onaylanan silme taslaktan düşer, "Uygula" ile yazılır', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Kat içeriğinin silineceğini anladım' }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Katı Sil' }))

    // Onay taslağı değiştirir; store hâlâ eski hâlde.
    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME, '1. Kat'])

    await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))
    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME])
  })

  it('"Vazgeç" katı silmez', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))
    await userEvent.click(screen.getByRole('button', { name: 'Vazgeç' }))
    await userEvent.click(screen.getByRole('button', { name: 'Uygula' }))

    expect(floorNames()).toEqual([DEFAULT_FLOOR_NAME, '1. Kat'])
  })

  it('silme sonrası üstteki katın kot değişimi önceden gösterilir', async () => {
    useCadStore.setState({
      floors: [
        createGroundFloor(),
        { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: 300, isBasement: false },
        { id: 101, name: '2. Kat', heightCm: 300, isBasement: false },
      ],
    })
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))

    expect(screen.getByText(/2\. Kat \+6,00 → \+3,00/)).toBeInTheDocument()
  })

  it('tüm katlar seçiliyken silme yapılmaz ve en az bir kat gerektiği bildirilir', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('checkbox', { name: `${DEFAULT_FLOOR_NAME} seç` }))
    await userEvent.click(screen.getByRole('checkbox', { name: '1. Kat seç' }))
    await userEvent.click(screen.getByRole('button', { name: 'Sil' }))

    expect(screen.getByRole('alert')).toHaveTextContent('En az bir katın kalması gerekir')
    expect(screen.queryByRole('button', { name: 'Katı Sil' })).not.toBeInTheDocument()
  })
})

describe('FloorManagementDialog — düşey eksen uyarısı (KK-13)', () => {
  function putVerticalAxisOnUpperFloor() {
    useCadStore.setState({
      areaObjects: [
        {
          id: 70,
          type: 'flueShaft',
          floorId: UPPER_FLOOR_ID,
          x: 0,
          y: 0,
          widthCm: 60,
          lengthCm: 60,
          angleDeg: 0,
          label: 'BŞ-01',
        },
        {
          id: 71,
          type: 'columnVentilation',
          floorId: UPPER_FLOOR_ID,
          x: 100,
          y: 0,
          widthCm: 40,
          lengthCm: 40,
          angleDeg: 0,
          label: 'KH-01',
        },
      ],
    })
  }

  it('baca şaftı ve kolon havalandırması adedi uyarıda görünür', async () => {
    putVerticalAxisOnUpperFloor()
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('1 baca şaftı ve 1 kolon havalandırması')
    expect(alert).toHaveTextContent('aynı düşey eksende kalmaz')
  })

  it('düşey eksen nesnesi yoksa uyarı ÇIKMAZ', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))

    expect(screen.queryByText(/düşey eksende kalmaz/)).not.toBeInTheDocument()
  })

  it('merdiven düşey eksen uyarısı üretmez', async () => {
    useCadStore.setState({
      areaObjects: [
        {
          id: 72,
          type: 'stairs',
          floorId: UPPER_FLOOR_ID,
          x: 0,
          y: 0,
          widthCm: 120,
          lengthCm: 200,
          angleDeg: 0,
          label: 'M-01',
        },
      ],
    })
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))

    expect(screen.queryByText(/düşey eksende kalmaz/)).not.toBeInTheDocument()
    // Alan nesnesi mimari dökümünde yine de sayılır.
    expect(screen.getByText(/1 alan nesnesi/)).toBeInTheDocument()
  })
})
