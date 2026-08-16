import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { ARCHITECTURE_TOOLS, DEFAULT_TOOL_ID } from '../../core/tools'
import { useUiStore } from '../../store/uiStore'
import { StatusBar } from '../StatusBar'
import { Toolbar } from '../Toolbar'

beforeEach(() => {
  useUiStore.setState({ activeToolId: DEFAULT_TOOL_ID })
})

describe('Toolbar', () => {
  it('araçların tamamını dokümandaki sırayla gösterir (KK-8)', () => {
    render(<Toolbar />)
    // Sayım nav ile sınırlı: kısayol ipucu butonu palet dışında, araç değil.
    const buttons = within(screen.getByRole('navigation', { name: 'Araç paleti' })).getAllByRole(
      'button',
    )
    expect(buttons).toHaveLength(ARCHITECTURE_TOOLS.length)
    // Henüz yazılmamış araçların erişilebilir adı sebebi de söyler (K79).
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(
      ARCHITECTURE_TOOLS.map((tool) =>
        'isPlanned' in tool ? `${tool.label} (henüz eklenmedi)` : tool.label,
      ),
    )
  })

  it('"Toplu Silme" palette YOK (K79)', () => {
    // İşi zaten var: çerçeveyle çoklu seçim + Delete, hem de tek adımda.
    render(<Toolbar />)

    expect(screen.queryByRole('button', { name: /Toplu Silme/ })).not.toBeInTheDocument()
  })

  it('henüz yazılmamış araç PASİF — tıklanınca aktif araç değişmez', async () => {
    const user = userEvent.setup()
    render(<Toolbar />)

    const planned = screen.getByRole('button', { name: 'Ölçüm (henüz eklenmedi)' })
    expect(planned).toBeDisabled()

    await user.click(planned)
    expect(useUiStore.getState().activeToolId).toBe(DEFAULT_TOOL_ID)
  })

  it('açılışta Seçim Aracı aktiftir (KK-7)', () => {
    render(<Toolbar />)
    expect(screen.getByRole('button', { name: 'Seçim Aracı' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
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
    expect(screen.getByRole('button', { name: 'Seçim Aracı' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Aktif araç: Duvar Çiz')
  })
})
