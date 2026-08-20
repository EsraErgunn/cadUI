import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_VIEW_ID } from '../../core/views'
import { useUiStore } from '../../store/uiStore'
import { Toolbar } from '../Toolbar'
import { ViewSwitcher } from '../menu/ViewSwitcher'

beforeEach(() => {
  useUiStore.setState({ activeViewId: DEFAULT_VIEW_ID })
})

describe('ViewSwitcher', () => {
  it('İzometrik düğmesi AKTİF (kilit kalktı)', () => {
    render(<ViewSwitcher />)
    expect(screen.getByRole('button', { name: 'İzometrik Görünüm' })).toBeEnabled()
  })

  it('tıklanınca aktif görünüm izometriğe geçer', async () => {
    const user = userEvent.setup()
    render(<ViewSwitcher />)

    await user.click(screen.getByRole('button', { name: 'İzometrik Görünüm' }))

    expect(useUiStore.getState().activeViewId).toBe('isometric')
    expect(screen.getByRole('button', { name: 'İzometrik Görünüm' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

describe('Toolbar — izometrik', () => {
  it('izometrikte araç paleti HİÇ çizilmez', () => {
    useUiStore.setState({ activeViewId: 'isometric' })
    const { container } = render(<Toolbar />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('navigation', { name: 'Araç paleti' })).toBeNull()
  })
})
