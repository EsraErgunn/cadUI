import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HeatingTypeBadge } from '../HeatingTypeBadge'

describe('HeatingTypeBadge', () => {
  it('bilinen değerin Türkçe etiketini gösterir', () => {
    render(<HeatingTypeBadge value="merkezi" />)

    expect(screen.getByText('Merkezi')).toBeInTheDocument()
  })

  it('bilinmeyen değerde patlamaz, ham değeri gösterir', () => {
    render(<HeatingTypeBadge value="bolgesel" />)

    expect(screen.getByText('bolgesel')).toBeInTheDocument()
  })
})
