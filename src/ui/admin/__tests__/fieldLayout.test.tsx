import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { House } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import { SelectField } from '../form/SelectField'
import { TextField } from '../form/TextField'

/**
 * Yatay yerleşim ve ikon slotu yalnız GÖRÜNÜMÜ değiştirir. Etiket bağı, hata
 * duyurusu veya açıklama bağı bozulursa alan erişilebilirliğini sessizce
 * kaybeder — sınıf adı değil, bu davranış korunuyor.
 */
describe('Alan yerleşimi ve ikon slotu', () => {
  it('yatay yerleşimde ikonlu metin alanının etiket bağı ve hata duyurusu korunur', () => {
    render(
      <TextField
        id="firmNo"
        label="Firma No"
        value=""
        layout="horizontal"
        leftIcon={House}
        error="Firma no zorunludur."
        onChange={vi.fn()}
      />,
    )
    const input = screen.getByLabelText('Firma No')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Firma no zorunludur.')
    expect(screen.getByRole('alert')).toHaveTextContent('Firma no zorunludur.')
  })

  it('alan ikonu erişilebilir ada sızmaz', () => {
    const { container } = render(
      <TextField id="phone" label="Telefon" value="" leftIcon={House} onChange={vi.fn()} />,
    )

    expect(screen.getByLabelText('Telefon')).toHaveAccessibleName('Telefon')
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('ikonlu seçim kutusu seçilen değeri yukarı verir', async () => {
    const onChange = vi.fn()
    render(
      <SelectField
        id="group"
        label="Grup Firması"
        value=""
        options={[{ value: 'AKSA', label: 'AKSA' }]}
        placeholder="—"
        layout="horizontal"
        leftIcon={House}
        onChange={onChange}
      />,
    )

    await userEvent.selectOptions(screen.getByLabelText('Grup Firması'), 'AKSA')

    expect(onChange).toHaveBeenCalledWith('AKSA')
  })

  it('yerleşim verilmeyen alan varsayılan dikey iskeleti korur', () => {
    render(<TextField id="name" label="Proje Adı" value="" onChange={vi.fn()} />)

    expect(screen.getByLabelText('Proje Adı')).toBeInTheDocument()
  })
})
