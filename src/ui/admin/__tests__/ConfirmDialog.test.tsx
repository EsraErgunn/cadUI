import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmDialog } from '../ConfirmDialog'

/** Odağın tetikleyen düğmeye dönmesi ancak gerçek bir açma/kapama akışında görülür. */
function DialogHarness({ onConfirm }: { onConfirm: () => void }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Sil
      </button>
      {isOpen && (
        <ConfirmDialog
          title="Proje silinsin mi?"
          description="Geri alınamaz."
          confirmLabel="Sil"
          onConfirm={() => {
            onConfirm()
            setIsOpen(false)
          }}
          onCancel={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

describe('ConfirmDialog', () => {
  it('açılınca odak onay düğmesine gider', async () => {
    const user = userEvent.setup()
    render(<DialogHarness onConfirm={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Sil' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAccessibleName('Proje silinsin mi?')
    expect(screen.getAllByRole('button', { name: 'Sil' }).at(-1)).toHaveFocus()
  })

  it('Esc ile kapanır ve odak tetikleyen düğmeye döner', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<DialogHarness onConfirm={onConfirm} />)

    const trigger = screen.getByRole('button', { name: 'Sil' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Tab odağı diyalogun içinde tutar', async () => {
    const user = userEvent.setup()
    render(<DialogHarness onConfirm={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Sil' }))
    const confirmButton = screen.getAllByRole('button', { name: 'Sil' }).at(-1)
    const cancelButton = screen.getByRole('button', { name: 'Vazgeç' })

    // Onay düğmesi listenin sonunda: Tab başa sarmalı, sayfaya kaçmamalı.
    await user.tab()
    expect(cancelButton).toHaveFocus()

    await user.tab({ shift: true })
    expect(confirmButton).toHaveFocus()
  })
})
