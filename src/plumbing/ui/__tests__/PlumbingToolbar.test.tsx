import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { useUiStore } from '../../../store/uiStore'
import {
  DEFAULT_INSTALLATION_TOOL_ID,
  INSTALLATION_TOOLS,
  INSTALLATION_TOOL_GROUPS,
  type InstallationToolDefinition,
} from '../../core/installationTools'
import { PlumbingToolbar } from '../PlumbingToolbar'

// jsdom Pointer Capture API'sini uygulamıyor; palet dokunmatik sürüklemesi için
// `hasPointerCapture` çağırıyor ve stub olmadan her pointerdown patlıyor.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
})

beforeEach(() => {
  useUiStore.setState({ activeToolId: DEFAULT_INSTALLATION_TOOL_ID })
})

describe('PlumbingToolbar', () => {
  it('gruplardaki araçların tamamını sırayla gösterir', () => {
    render(<PlumbingToolbar />)
    // Sayım nav ile sınırlı: kısayol ipucu butonu palet dışında, araç değil.
    const buttons = within(screen.getByRole('navigation', { name: 'Araç paleti' })).getAllByRole(
      'button',
    )
    const paletteTools = INSTALLATION_TOOL_GROUPS.flatMap(
      (group) => group.tools as readonly InstallationToolDefinition[],
    )

    expect(buttons).toHaveLength(paletteTools.length)
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(
      paletteTools.map((tool) => tool.label),
    )
  })

  it('araçlar gruplara ayrılmış ve gruplar sırada', () => {
    render(<PlumbingToolbar />)

    const groups = within(screen.getByRole('navigation', { name: 'Araç paleti' })).getAllByRole(
      'group',
    )

    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(
      INSTALLATION_TOOL_GROUPS.map((group) => group.label),
    )
  })

  it('Seçim Aracı palette YOK — yüzen çubukta duruyor (K83 tesisat karşılığı)', () => {
    render(<PlumbingToolbar />)

    expect(screen.queryByRole('button', { name: 'Seçim Aracı' })).not.toBeInTheDocument()
    expect(INSTALLATION_TOOLS.some((tool) => tool.id === DEFAULT_INSTALLATION_TOOL_ID)).toBe(true)
  })

  it('paletteki her araç TAM BİR grupta — hiçbiri iki kez yok', () => {
    // Grup yapısı yerleşim bilgisi; düzleştirilmiş liste ikon kaydının ve
    // davranış çözen fonksiyonların kaynağı, ikisi ayrışırsa araç kaybolur.
    const grouped = INSTALLATION_TOOL_GROUPS.flatMap((group) => group.tools.map((tool) => tool.id))
    const known = new Set(INSTALLATION_TOOLS.map((tool) => tool.id))

    expect(new Set(grouped).size).toBe(grouped.length)
    for (const id of grouped) expect(known.has(id)).toBe(true)
  })

  it('açılışta hiçbir palet aracı vurgulu DEĞİL — varsayılan seçim kipi', () => {
    render(<PlumbingToolbar />)

    const buttons = within(screen.getByRole('navigation', { name: 'Araç paleti' })).getAllByRole(
      'button',
    )
    for (const button of buttons) expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(useUiStore.getState().activeToolId).toBe(DEFAULT_INSTALLATION_TOOL_ID)
  })

  it('araç BASILINCA etkinleşir — sürükle-bırak yerleştirme buna dayanıyor', async () => {
    const user = userEvent.setup()
    render(<PlumbingToolbar />)

    await user.pointer({ target: screen.getByRole('button', { name: 'Boru Ekle' }), keys: '[MouseLeft>]' })

    expect(useUiStore.getState().activeToolId).toBe('pipe')
  })

  it('araç tıklanınca vurgulanır', async () => {
    const user = userEvent.setup()
    render(<PlumbingToolbar />)

    await user.click(screen.getByRole('button', { name: 'Vana Ekle' }))

    expect(screen.getByRole('button', { name: 'Vana Ekle' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Ölçüm' })).toHaveAttribute('aria-pressed', 'false')
    expect(useUiStore.getState().activeToolId).toBe('valve')
  })
})
