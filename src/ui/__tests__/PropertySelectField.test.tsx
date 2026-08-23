import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PropertySelectField } from '../properties/PropertySelectField'

const OPTIONS = [
  { value: 'a', label: 'Alfa' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gama' },
]

function renderField(props: Partial<Parameters<typeof PropertySelectField>[0]> = {}) {
  const onCommit = vi.fn().mockReturnValue(true)
  render(
    <PropertySelectField
      label="Tip"
      value="a"
      options={OPTIONS}
      targetKey="test"
      onCommit={onCommit}
      {...props}
    />,
  )
  return { onCommit, trigger: screen.getByRole('combobox', { name: 'Tip' }) }
}

describe('PropertySelectField', () => {
  it('kapalıyken liste DOM\'da yok', () => {
    renderField()

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('liste HER ZAMAN tetikleyicinin ALTINDAN açılır', async () => {
    const user = userEvent.setup()
    const { trigger } = renderField()

    await user.click(trigger)

    // jsdom düzen hesabı yapmıyor; kontrol edilebilen şey konumun tetikleyicinin
    // ALT kenarından yazıldığı — yani yön hiçbir koşulda ters çevrilmiyor.
    const list = screen.getByRole('listbox')
    expect(list.style.top).toBe(`${trigger.getBoundingClientRect().bottom}px`)
    expect(list.style.maxHeight).not.toBe('')
  })

  it('seçenek tıklanınca commit eder ve kapanır', async () => {
    const user = userEvent.setup()
    const { onCommit, trigger } = renderField()

    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: 'Beta' }))

    expect(onCommit).toHaveBeenCalledWith('b')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('klavyeyle gezilip Enter ile seçilir', async () => {
    const user = userEvent.setup()
    const { onCommit, trigger } = renderField()

    trigger.focus()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    expect(onCommit).toHaveBeenCalledWith('b')
  })

  it('Escape commit ETMEDEN kapatır', async () => {
    const user = userEvent.setup()
    const { onCommit, trigger } = renderField()

    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('listenin KENDİ kaydırması listeyi kapatmaz, dışarıdaki kaydırma kapatır', async () => {
    const user = userEvent.setup()
    const { trigger } = renderField()

    await user.click(trigger)
    const list = screen.getByRole('listbox')

    // Dinleyici capture kipinde: liste içindeki kaydırma da window'a ulaşıyordu
    // ve uzun listede aşağı inmek imkânsızlaşıyordu.
    fireEvent.scroll(list)
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.scroll(trigger)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('ayrışan değerde "Farklı" yazar', () => {
    renderField({ value: undefined })

    expect(screen.getByRole('combobox', { name: 'Tip' })).toHaveTextContent('Farklı')
  })

  it('salt okunurken açılmaz', async () => {
    const user = userEvent.setup()
    const { trigger } = renderField({ isReadOnly: true })

    await user.click(trigger)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('reddedilen yazımda alan geçersiz işaretlenir', async () => {
    const user = userEvent.setup()
    const { trigger } = renderField({
      onCommit: () => false,
      rejectionMessage: 'Bu değer olmaz.',
    })

    await user.click(trigger)
    await user.click(screen.getByRole('option', { name: 'Gama' }))

    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Bu değer olmaz.')).toBeInTheDocument()
  })
})
