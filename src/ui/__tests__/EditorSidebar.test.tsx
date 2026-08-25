import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_TOOL_ID } from '../../core/tools'
import { useUiStore } from '../../store/uiStore'
import { EditorSidebar } from '../EditorSidebar'

beforeEach(() => {
  useUiStore.setState({ activeToolId: DEFAULT_TOOL_ID })
})

describe('EditorSidebar', () => {
  it('logoya tıklayınca editörden çıkışı tetikler', async () => {
    const onCloseEditor = vi.fn()
    const user = userEvent.setup()
    render(<EditorSidebar onCloseEditor={onCloseEditor} />)

    await user.click(screen.getByRole('button', { name: 'Projelere dön' }))

    expect(onCloseEditor).toHaveBeenCalledTimes(1)
  })
})
