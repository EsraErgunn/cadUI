import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EmptyValue } from '../EmptyValue'

describe('EmptyValue', () => {
  it('görsel tireyi ekran okuyucudan gizler, yerine okunabilir karşılık verir', () => {
    const { container } = render(<EmptyValue />)

    expect(container.textContent).toContain('—')
    expect(screen.getByText('—')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Değer yok')).toHaveClass('sr-only')
  })
})
