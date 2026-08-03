import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProjectTypeBadge } from '../ProjectTypeBadge'

describe('ProjectTypeBadge', () => {
  it('bilinen kodun Türkçe etiketini gösterir', () => {
    render(<ProjectTypeBadge code="ILAVE_TADILAT" />)

    expect(screen.getByText('İlave Tadilat')).toBeInTheDocument()
  })

  it('parametrik listeye sonradan eklenen kodu ham hâliyle gösterir', () => {
    render(<ProjectTypeBadge code="YENI_TIP" />)

    expect(screen.getByText('YENI_TIP')).toBeInTheDocument()
  })
})
