import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { FloorCopyDialog } from '../FloorCopyDialog'

const UPPER_FLOOR_ID = 14
const TOP_FLOOR_ID = 15

/** Zemin katta kapalı bir çizim; 1. Kat DOLU, 2. Kat boş. */
beforeEach(() => {
  useCadStore.setState({
    floors: [
      createGroundFloor(),
      { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: DEFAULT_FLOOR_HEIGHT_CM, isBasement: false },
      { id: TOP_FLOOR_ID, name: '2. Kat', heightCm: DEFAULT_FLOOR_HEIGHT_CM, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [
      { id: 2, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
      { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
      { id: 20, floorId: UPPER_FLOOR_ID, x: 0, y: 0 },
      { id: 21, floorId: UPPER_FLOOR_ID, x: 300, y: 0 },
    ],
    walls: [
      { id: 6, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
      { id: 22, floorId: UPPER_FLOOR_ID, p1Id: 20, p2Id: 21, thickness: 20, height: 280 },
    ],
    openings: [{ id: 10, wallId: 6, offsetCm: 250, widthCm: 90, type: 'door' }],
    rooms: [],
    symbols: [],
    // Alan nesnesi/kiriş burada da sıfırlanır: "Düşey" satırı testi kaynağa
    // baca şaftı ekliyor, sonraki testlere sızmasın.
    areaObjects: [],
    beams: [],
    installationElements: [],
    installationLines: [],
    installationConnections: [],
    nextUniqueId: 100,
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
})

function renderDialog(onClose = vi.fn()) {
  render(<FloorCopyDialog onClose={onClose} />)
  return { onClose }
}

function wallCountOn(floorId: number): number {
  return useCadStore.getState().walls.filter((wall) => wall.floorId === floorId).length
}

describe('FloorCopyDialog — kaynak ve içerik (KK-15)', () => {
  it('kaynak katın içeriğini sayılarla özetler', () => {
    renderDialog()

    expect(screen.getByText('1 duvar · 1 kapı')).toBeInTheDocument()
  })

  it('kaynakta düşey eksen yoksa "Düşey" satırı yine durur', () => {
    renderDialog()

    // Satır koşullu değil: madde 15 kaynak özetini ÜÇ satır olarak tanımlıyor,
    // "yok" da bir cevap — satırın kaybolması kullanıcıya soru bıraktırırdı.
    expect(screen.getByText('Düşey')).toBeInTheDocument()
    expect(screen.getByText('yok')).toBeInTheDocument()
  })

  it('baca şaftı ve kolon havalandırmasını "Düşey" satırında adıyla sayar', () => {
    useCadStore.setState({
      areaObjects: [
        {
          id: 30,
          type: 'flueShaft',
          floorId: DEFAULT_FLOOR_ID,
          x: 100,
          y: 100,
          widthCm: 60,
          lengthCm: 60,
          angleDeg: 0,
          label: 'BŞ-01',
        },
        {
          id: 31,
          type: 'columnVentilation',
          floorId: DEFAULT_FLOOR_ID,
          x: 200,
          y: 100,
          widthCm: 40,
          lengthCm: 40,
          angleDeg: 0,
          label: 'KH-01',
        },
      ],
    })

    renderDialog()

    expect(screen.getByText('1 baca şaftı · 1 kolon havalandırması')).toBeInTheDocument()
  })

  it('kaynak kat hedef listesinde PASİFTİR', () => {
    renderDialog()

    expect(screen.getByRole('checkbox', { name: /Zemin Kat/ })).toBeDisabled()
  })

  it('hedef seçilmeden Kopyala pasiftir', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: /Kopyala/ })).toBeDisabled()
  })

  it('düğmede işlem görecek kat adedi yazar', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('checkbox', { name: /2\. Kat/ }))

    expect(screen.getByRole('button', { name: 'Kopyala · 1 kat' })).toBeEnabled()
  })
})

describe('FloorCopyDialog — tesisatın mimariye bağlılığı (KK-18)', () => {
  it('tesisat işaretlenince mimari de işaretlenir', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('checkbox', { name: /Tesisat Tasarımı/ }))

    expect(screen.getByRole('checkbox', { name: /Mimari Tasarım/ })).toBeChecked()
  })

  it('mimarinin işareti kalkınca tesisatınki de kalkar', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('checkbox', { name: /Tesisat Tasarımı/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Mimari Tasarım/ }))

    expect(screen.getByRole('checkbox', { name: /Tesisat Tasarımı/ })).not.toBeChecked()
  })

  it('hiçbiri işaretli değilken Kopyala pasiftir (KK-15)', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('checkbox', { name: /2\. Kat/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Mimari Tasarım/ }))

    expect(screen.getByRole('button', { name: /Kopyala/ })).toBeDisabled()
  })
})

describe('FloorCopyDialog — hedef seçimi (KK-16)', () => {
  it('"Tümünü seç" kaynak dışındaki katları işaretler', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Tümünü seç' }))

    expect(screen.getByRole('button', { name: 'Kopyala · 2 kat' })).toBeInTheDocument()
  })

  it('"Temizle" hiçbirini seçili bırakmaz', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Tümünü seç' }))
    await userEvent.click(screen.getByRole('button', { name: 'Temizle' }))

    expect(screen.getByRole('button', { name: /Kopyala/ })).toBeDisabled()
  })

  it('aralık seçimi aradaki katların tamamını işaretler', async () => {
    renderDialog()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Aralık başlangıcı' }), '14')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Aralık bitişi' }), '15')
    await userEvent.click(screen.getByRole('button', { name: 'Seç' }))

    expect(screen.getByRole('button', { name: 'Kopyala · 2 kat' })).toBeInTheDocument()
  })
})

describe('FloorCopyDialog — hedefte içerik (KK-17)', () => {
  it('içerik taşıyan hedef "İçerik var" rozetiyle ayrılır', () => {
    renderDialog()

    expect(screen.getByText('İçerik var')).toBeInTheDocument()
  })

  it('"Üzerine yaz" seçiliyken silinecek katlar adlarıyla uyarılır', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('checkbox', { name: /1\. Kat/ }))

    expect(screen.getByRole('alert')).toHaveTextContent('1. Kat')
    expect(screen.getByRole('alert')).toHaveTextContent('silinip yerine kaynak katın çizimi')
  })

  it('"Bu katları atla" seçilince dolu kat işlem dışında kalır', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Tümünü seç' }))
    await userEvent.click(screen.getByRole('radio', { name: /Bu katları atla/ }))

    expect(screen.getByRole('button', { name: 'Kopyala · 1 kat' })).toBeInTheDocument()
    expect(screen.getByText(/işlem dışında kalacak/)).toBeInTheDocument()
  })

  it('"Üzerine yaz" hedefteki çizimi değiştirir, biriktirmez', async () => {
    const { onClose } = renderDialog()

    await userEvent.click(screen.getByRole('checkbox', { name: /1\. Kat/ }))
    await userEvent.click(screen.getByRole('button', { name: /Kopyala/ }))

    // Kaynakta 1 duvar vardı; hedefteki 1 duvar silinip yerine 1 duvar yazıldı.
    expect(wallCountOn(UPPER_FLOOR_ID)).toBe(1)
    expect(onClose).toHaveBeenCalled()
  })

  it('birden çok hedefe kopyalama TEK geri alma adımıdır (madde 19)', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Tümünü seç' }))
    await userEvent.click(screen.getByRole('button', { name: /Kopyala/ }))

    expect(wallCountOn(UPPER_FLOOR_ID)).toBe(1)
    expect(wallCountOn(TOP_FLOOR_ID)).toBe(1)
    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)
  })
})
