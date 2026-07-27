import { render, screen } from '@testing-library/react'
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
  it('22 aracın tamamını dokümandaki sırayla gösterir (KK-8)', () => {
    render(<Toolbar />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(22)
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(
      ARCHITECTURE_TOOLS.map((tool) => tool.label),
    )
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
