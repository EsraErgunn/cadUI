import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { DocumentIndicator } from '../DocumentIndicator'

describe('DocumentIndicator', () => {
  it('evrak varken durumu ad olarak bildirir', () => {
    render(<DocumentIndicator hasDocuments />)

    expect(screen.getByRole('img', { name: 'Evrak var' })).toBeInTheDocument()
  })

  it('evrak yokken soluk ikon ve karşılık gelen ad kullanır', () => {
    render(<DocumentIndicator hasDocuments={false} />)

    const indicator = screen.getByRole('img', { name: 'Evrak yok' })
    expect(indicator.firstElementChild).toHaveClass('text-ink-disabled')
  })

  it('ipucu Tab ile odaklanabilir bir öğeye bağlıdır', async () => {
    const user = userEvent.setup()
    render(<DocumentIndicator hasDocuments />)

    await user.tab()

    expect(screen.getByRole('img', { name: 'Evrak var' })).toHaveFocus()
    expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('Evrak var')
  })
})
