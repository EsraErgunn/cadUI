import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { House } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'

import { CheckboxField } from '../form/CheckboxField'
import { DateField } from '../form/DateField'
import { FormCard } from '../form/FormCard'
import { SelectField } from '../form/SelectField'
import { TextAreaField } from '../form/TextAreaField'
import { TextField } from '../form/TextField'

describe('TextField', () => {
  it('etiketi girdiye bağlar ve yazılanı yukarı verir', async () => {
    const onChange = vi.fn()
    render(<TextField id="name" label="Proje Adı" value="" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Proje Adı'), 'A')

    expect(onChange).toHaveBeenCalledWith('A')
  })

  it('hata varsa aria-invalid ve aria-describedby kurulur', () => {
    render(
      <TextField
        id="name"
        label="Proje Adı"
        value=""
        error="Proje adı zorunludur."
        onChange={vi.fn()}
      />,
    )
    const input = screen.getByLabelText('Proje Adı')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Proje adı zorunludur.')
    expect(screen.getByRole('alert')).toHaveTextContent('Proje adı zorunludur.')
  })

  it('hata yokken aria-invalid yazılmaz', () => {
    render(<TextField id="name" label="Proje Adı" value="" onChange={vi.fn()} />)

    expect(screen.getByLabelText('Proje Adı')).not.toHaveAttribute('aria-invalid')
  })

  it('yardım metni de girdiye bağlanır', () => {
    render(
      <TextField
        id="name"
        label="Proje Adı"
        value=""
        hint="Yalnızca 1 mühendis seçilebilir."
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Proje Adı')).toHaveAccessibleDescription(
      'Yalnızca 1 mühendis seçilebilir.',
    )
  })

  it('etiket eki (parametrik) etiketin parçası olarak okunur', () => {
    render(
      <TextField
        id="type"
        label="Proje Tipi"
        labelNote="(parametrik)"
        value=""
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/Proje Tipi \(parametrik\)/)).toBeInTheDocument()
  })
})

describe('TextAreaField', () => {
  it('çok satırlı girdiyi etiketiyle bağlar', async () => {
    const onChange = vi.fn()
    render(<TextAreaField id="address" label="Adres" value="" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Adres'), 'x')

    expect(onChange).toHaveBeenCalledWith('x')
  })
})

describe('SelectField', () => {
  const options = [
    { value: '11', label: 'Anadolu Mühendislik' },
    { value: '12', label: 'Beyaz Tesisat' },
  ]

  it('seçim yapılmamış hâli boş seçenekle gösterir', () => {
    render(
      <SelectField
        id="firm"
        label="Proje Firması"
        value=""
        options={options}
        placeholder="Seçiniz"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Proje Firması')).toHaveValue('')
    expect(screen.getByRole('option', { name: 'Seçiniz' })).toBeInTheDocument()
  })

  it('seçilen değeri yukarı verir', async () => {
    const onChange = vi.fn()
    render(
      <SelectField
        id="firm"
        label="Proje Firması"
        value=""
        options={options}
        placeholder="Seçiniz"
        onChange={onChange}
      />,
    )

    await userEvent.selectOptions(screen.getByLabelText('Proje Firması'), '12')

    expect(onChange).toHaveBeenCalledWith('12')
  })

  it('pasifken tıklanamaz', () => {
    render(
      <SelectField
        id="engineer"
        label="Yetkili Mühendis"
        value=""
        options={[]}
        placeholder="Seçiniz"
        isDisabled
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Yetkili Mühendis')).toBeDisabled()
  })
})

describe('DateField', () => {
  it('alt sınırı girdiye yazar', () => {
    render(
      <DateField
        id="end"
        label="İş Bitiş Tarihi"
        value="2026-10-04"
        min="2026-08-04"
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('İş Bitiş Tarihi')).toHaveAttribute('min', '2026-08-04')
  })
})

describe('CheckboxField', () => {
  it('tıklanınca ters değeri verir', async () => {
    const onChange = vi.fn()
    render(<CheckboxField id="permit" label="Ruhsat Proje" value={false} onChange={onChange} />)

    await userEvent.click(screen.getByLabelText('Ruhsat Proje'))

    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('yardım metnini girdiye bağlar', () => {
    render(
      <CheckboxField
        id="permit"
        label="Ruhsat Proje"
        value={false}
        hint="Yapı ruhsatına bağlı proje."
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Ruhsat Proje')).toHaveAccessibleDescription(
      'Yapı ruhsatına bağlı proje.',
    )
  })
})

describe('FormCard', () => {
  it('bölümü başlığıyla adlandırır', () => {
    render(
      <FormCard title="Proje Bilgileri" icon={House}>
        <p>içerik</p>
      </FormCard>,
    )

    expect(screen.getByRole('region', { name: 'Proje Bilgileri' })).toBeInTheDocument()
  })
})
