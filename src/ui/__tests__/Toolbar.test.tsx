import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  ARCHITECTURE_TOOL_GROUPS,
  ARCHITECTURE_TOOLS,
  DEFAULT_TOOL_ID,
  type ToolDefinition,
} from '../../core/tools'
import { useUiStore } from '../../store/uiStore'
import { StatusBar } from '../StatusBar'
import { Toolbar } from '../Toolbar'

beforeEach(() => {
  useUiStore.setState({ activeToolId: DEFAULT_TOOL_ID })
})

describe('Toolbar', () => {
  it('gruplardaki araçların tamamını sırayla gösterir (KK-8)', () => {
    render(<Toolbar />)
    // Sayım nav ile sınırlı: kısayol ipucu butonu palet dışında, araç değil.
    const buttons = within(screen.getByRole('navigation', { name: 'Araç paleti' })).getAllByRole(
      'button',
    )
    const paletteTools = ARCHITECTURE_TOOL_GROUPS.flatMap(
      (group) => group.tools as readonly ToolDefinition[],
    )

    expect(buttons).toHaveLength(paletteTools.length)
    // Henüz yazılmamış araçların erişilebilir adı sebebi de söyler (K79).
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(
      paletteTools.map((tool) =>
        'isPlanned' in tool ? `${tool.label} (henüz eklenmedi)` : tool.label,
      ),
    )
  })

  it('Seçim Aracı palette YOK — yüzen çubukta duruyor (K83)', () => {
    // Aynı kip iki palette birden dururken kullanıcı hangisinin "asıl"
    // olduğunu bilemiyordu. Araç olarak var olmaya devam ediyor.
    render(<Toolbar />)

    expect(screen.queryByRole('button', { name: 'Seçim Aracı' })).not.toBeInTheDocument()
    expect(ARCHITECTURE_TOOLS.some((tool) => tool.id === DEFAULT_TOOL_ID)).toBe(true)
  })

  it('araçlar gruplara ayrılmış ve gruplar sırada (K82)', () => {
    render(<Toolbar />)

    const groups = within(screen.getByRole('navigation', { name: 'Araç paleti' })).getAllByRole(
      'group',
    )

    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(
      ARCHITECTURE_TOOL_GROUPS.map((group) => group.label),
    )
  })

  it('paletteki her araç TAM BİR grupta — hiçbiri iki kez yok', () => {
    // Grup yapısı yerleşim bilgisi; düzleştirilmiş liste ikon kaydının ve
    // durum çubuğunun kaynağı, ikisi ayrışırsa araç sessizce kaybolur.
    const grouped = ARCHITECTURE_TOOL_GROUPS.flatMap((group) => group.tools.map((tool) => tool.id))
    const known = new Set(ARCHITECTURE_TOOLS.map((tool) => tool.id))

    expect(new Set(grouped).size).toBe(grouped.length)
    for (const id of grouped) expect(known.has(id)).toBe(true)
  })

  it('"Toplu Silme" palette YOK (K79)', () => {
    // İşi zaten var: çerçeveyle çoklu seçim + Delete, hem de tek adımda.
    render(<Toolbar />)

    expect(screen.queryByRole('button', { name: /Toplu Silme/ })).not.toBeInTheDocument()
  })

  it('henüz yazılmamış araç PASİF — tıklanınca aktif araç değişmez', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    const planned = screen.getByRole('button', { name: 'Serbest Çizim Araçları (henüz eklenmedi)' })
    expect(planned).toBeDisabled()

    await user.click(planned)
    expect(useUiStore.getState().activeToolId).toBe(DEFAULT_TOOL_ID)
  })

  it('Ölçüm aracı ARTIK etkin (K80)', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Ölçüm' }))

    expect(useUiStore.getState().activeToolId).toBe('measure')
  })

  it('Metin Ekle ARTIK etkin (K81)', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    await user.click(screen.getByRole('button', { name: 'Metin Ekle' }))

    expect(useUiStore.getState().activeToolId).toBe('text')
  })

  it('açılışta hiçbir palet aracı vurgulu DEĞİL — varsayılan seçim kipi (KK-7)', () => {
    // Seçim aracı palette olmadığı için (K83) vurgu da orada görünmüyor;
    // aktif kipi yüzen çubuk ve durum çubuğu söylüyor.
    render(
      <>
        <Toolbar />
        <StatusBar />
      </>,
    )

    const buttons = within(screen.getByRole('navigation', { name: 'Araç paleti' })).getAllByRole(
      'button',
    )
    for (const button of buttons) expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Aktif araç: Seçim Aracı')
  })

  it('araç tıklanınca vurgulanır ve durum çubuğu güncellenir (KK-7)', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Toolbar />
        <StatusBar />
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'Duvar Çiz' }))

    expect(screen.getByRole('button', { name: 'Duvar Çiz' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Oda Çiz' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Aktif araç: Duvar Çiz')
  })
})
