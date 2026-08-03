import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DateTimeCell } from '../DateTimeCell'

describe('DateTimeCell', () => {
  it('tarihi ve saati iki satırda tr-TR biçiminde gösterir', () => {
    // Saat dilimi bilgisi olmayan değer yerel saat kabul edilir; test makinenin
    // diliminden bağımsız kalsın diye kayma yaratacak "Z" bilerek yok.
    const { container } = render(<DateTimeCell value="2026-07-10T16:28:26" />)

    const cell = container.querySelector('time')
    expect(cell).toHaveAttribute('dateTime', '2026-07-10T16:28:26')
    expect(cell?.textContent).toMatch(/^10\.0?7\.2026/)
    expect(cell?.textContent).toMatch(/16:28:26$/)
  })

  it('değer yokken boş hücre karşılığını döndürür', () => {
    render(<DateTimeCell value={null} />)

    expect(screen.getByText('Değer yok')).toBeInTheDocument()
  })

  it('okunamayan tarihte de boş hücre karşılığını döndürür', () => {
    render(<DateTimeCell value="tarih değil" />)

    expect(screen.getByText('Değer yok')).toBeInTheDocument()
  })
})
