import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NumberStepperField } from '../form/NumberStepperField'

interface RenderOptions {
  unit?: string
  isInteger?: boolean
  max?: number
}

function renderField(
  value: number,
  onChange = vi.fn(),
  { unit, isInteger, max }: RenderOptions = {},
) {
  render(
    <NumberStepperField
      id="area"
      label="Alan"
      value={value}
      unit={unit}
      isInteger={isInteger}
      max={max}
      onChange={onChange}
    />,
  )
  return onChange
}

/** Etiket hem girdiye hem ok düğmelerine bağlı; rol süzgeci girdiyi ayırır. */
function field(): HTMLElement {
  return screen.getByRole('spinbutton', { name: 'Alan' })
}

describe('NumberStepperField', () => {
  it('etiketi girdiye bağlar ve değeri gösterir', () => {
    renderField(12)

    expect(field()).toHaveValue('12')
    expect(field()).toHaveAttribute('aria-valuenow', '12')
  })

  it('yukarı ok tuşu değeri artırır', async () => {
    const onChange = renderField(3)

    field().focus()
    await userEvent.keyboard('{ArrowUp}')

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('aşağı ok tuşu değeri azaltır', async () => {
    const onChange = renderField(3)

    field().focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('klavyeyle alt sınırın altına inilemez', async () => {
    const onChange = renderField(0)

    field().focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('artır düğmesi değeri bir basamak yükseltir', async () => {
    const onChange = renderField(7)

    await userEvent.click(screen.getByRole('button', { name: 'Alan değerini artır' }))

    expect(onChange).toHaveBeenCalledWith(8)
  })

  it('azalt düğmesi alt sınırda pasiftir', () => {
    renderField(0)

    expect(screen.getByRole('button', { name: 'Alan değerini azalt' })).toBeDisabled()
  })

  it('elle yazılan değer okların yanında doğrudan girilebilir', async () => {
    const onChange = renderField(0)

    await userEvent.type(field(), '25')

    expect(onChange).toHaveBeenLastCalledWith(25)
  })

  it('baştaki sıfır elle yazımda birikmez', async () => {
    const onChange = renderField(0)

    // Alanlar 0 ile açıyor; temizlenmeseydi yazılan değer "012" görünürdü.
    await userEvent.type(field(), '12')

    expect(field()).toHaveValue('12')
    expect(onChange).toHaveBeenLastCalledWith(12)
  })

  it('eksi işareti hiç yazılamaz', async () => {
    const onChange = renderField(5)

    await userEvent.clear(field())
    await userEvent.type(field(), '-5')

    expect(field()).toHaveValue('5')
    expect(onChange.mock.calls.every(([next]) => next >= 0)).toBe(true)
  })

  it('tam sayı alanında ondalık ayraç yazılamaz', async () => {
    const onChange = renderField(0, vi.fn(), { isInteger: true })

    await userEvent.type(field(), '1,5')

    expect(field()).toHaveValue('15')
    expect(onChange).toHaveBeenLastCalledWith(15)
  })

  it('ondalıklı alanda virgül nokta gibi çözülür', async () => {
    const onChange = renderField(0)

    await userEvent.type(field(), '12,5')

    expect(onChange).toHaveBeenLastCalledWith(12.5)
  })

  it('alan yazım sırasında boş kalabilir, çıkışta alt sınıra döner', async () => {
    const onChange = renderField(9)

    await userEvent.clear(field())
    // Boşken değer HENÜZ sıfırlanmaz: kullanıcı yeni sayıyı yazmayı sürdürebilsin.
    expect(onChange).not.toHaveBeenCalled()

    await userEvent.tab()

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('üst sınırı aşan giriş anında sınıra çekilir', async () => {
    const onChange = renderField(0, vi.fn(), { max: 100 })

    await userEvent.type(field(), '150')

    expect(field()).toHaveValue('100')
    expect(onChange).toHaveBeenLastCalledWith(100)
  })

  it('artır düğmesi üst sınırda pasiftir', () => {
    renderField(100, vi.fn(), { max: 100 })

    expect(screen.getByRole('button', { name: 'Alan değerini artır' })).toBeDisabled()
    expect(field()).toHaveAttribute('aria-valuemax', '100')
  })

  it('birim etiketi görünür ama ekran okuyucuya tekrar okunmaz', () => {
    renderField(0, vi.fn(), { unit: 'm²' })

    // Birim etiketin içinde de geçtiği için ikinci kez duyurulmaz (aria-hidden).
    expect(screen.getByText('m²')).toHaveAttribute('aria-hidden', 'true')
  })

  it('ok düğmeleri sekme sırasına girmez', () => {
    renderField(3)

    expect(screen.getByRole('button', { name: 'Alan değerini artır' })).toHaveAttribute(
      'tabindex',
      '-1',
    )
  })
})
