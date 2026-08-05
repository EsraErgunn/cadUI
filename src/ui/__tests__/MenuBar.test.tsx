import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { useCadStore } from '../../store/cadStore'
import { MenuBar } from '../MenuBar'
import { EDITOR_MENUS } from '../menu/menuDefinitions'

function renderMenuBar(
  onCloseEditor = vi.fn(),
  onSave = vi.fn(),
  onExport = vi.fn(),
  onOpenFloorManagement = vi.fn(),
) {
  render(
    <MemoryRouter>
      <MenuBar
        onCloseEditor={onCloseEditor}
        onSave={onSave}
        onExport={onExport}
        onOpenFloorManagement={onOpenFloorManagement}
        isSaving={false}
      />
    </MemoryRouter>,
  )
  return { onCloseEditor, onSave, onExport, onOpenFloorManagement }
}

describe('MenuBar', () => {
  it('beş menü başlığını dokümandaki sırayla gösterir (KK-9)', () => {
    renderMenuBar()
    const nav = screen.getByRole('navigation', { name: 'Ana menü' })
    const titles = within(nav).getAllByRole('button').map((button) => button.textContent)
    expect(titles).toEqual(['Dosya', 'Düzenle', 'Görünüm', 'Katlar1', 'Araçlar'])
  })

  it.each(EDITOR_MENUS.map((menu) => [menu.label, menu] as const))(
    '%s menüsü maddeleri doğru sıra ve metinle listeler (KK-9)',
    async (label, menu) => {
      const user = userEvent.setup()
      renderMenuBar()

      await user.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }))

      const expectedLabels = menu.groups.flatMap((group) => group.items.map((item) => item.label))
      // menuitem ve menuitemcheckbox karışık sırada geliyor; RTL role sorgusu
      // tek rol aldığı için sırayı korumak adına DOM sırasından okuyoruz.
      const dropdown = screen.getByRole('menu', { name: label })
      const renderedLabels = [...dropdown.querySelectorAll('[role^="menuitem"]')].map(
        (item) => item.textContent,
      )
      expect(renderedLabels).toEqual(expectedLabels)
    },
  )

  it('yalnız Kaydet, Dışa Aktar ve Kapat aktiftir (KK-9)', async () => {
    const user = userEvent.setup()
    renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))

    expect(screen.getByRole('menuitem', { name: 'Kapat' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Kaydet' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Dışa Aktar (JSON)' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Gönder' })).toBeDisabled()
  })

  it('Dosya > Dışa Aktar dışa aktarmayı tetikler', async () => {
    const user = userEvent.setup()
    const { onExport } = renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Dışa Aktar (JSON)' }))

    expect(onExport).toHaveBeenCalledTimes(1)
  })

  it('Dosya > Kaydet ve Kaydet düğmesi aynı akışı tetikler', async () => {
    const user = userEvent.setup()
    const { onSave } = renderMenuBar()

    await user.click(screen.getByRole('button', { name: 'Kaydet' }))
    expect(onSave).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Kaydet' }))
    expect(onSave).toHaveBeenCalledTimes(2)
  })

  it('menü dışına tıklanınca kapanır (KK-9)', async () => {
    const user = userEvent.setup()
    renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Düzenle/ }))
    expect(screen.getByRole('menu', { name: 'Düzenle' })).toBeInTheDocument()

    await user.click(document.body)
    expect(screen.queryByRole('menu', { name: 'Düzenle' })).not.toBeInTheDocument()
  })

  it('Dosya > Kapat ve ← Projeler aynı akışı tetikler (KK-10)', async () => {
    const user = userEvent.setup()
    const { onCloseEditor } = renderMenuBar()

    await user.click(screen.getByRole('button', { name: 'Projeler' }))
    expect(onCloseEditor).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Kapat' }))
    expect(onCloseEditor).toHaveBeenCalledTimes(2)
  })

  it('geçmiş boşken Geri Al ve Yinele pasiftir', async () => {
    // Madde menüden KALKMAZ, yalnız pasifleşir: kullanıcı komutu aramasın.
    const user = userEvent.setup()
    useCadStore.temporal.getState().clear()
    renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Düzenle/ }))

    expect(screen.getByRole('menuitem', { name: 'Geri Al' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Yinele' })).toBeDisabled()
  })

  it('geri alınacak adım varken Geri Al aktifleşir', async () => {
    const user = userEvent.setup()
    useCadStore.temporal.getState().clear()
    // İzlenen bir alanı değiştirmek yeter: MenuBar'ın işi adımı KİMİN ürettiğini
    // bilmek değil, geçmişin dolu olduğunu yansıtmak.
    useCadStore.setState((state) => ({ revision: state.revision + 1 }))
    renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Düzenle/ }))

    expect(screen.getByRole('menuitem', { name: 'Geri Al' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Yinele' })).toBeDisabled()
  })

  it('kaydedilmemiş değişiklik varken Kaydet düğmesinde uyarı gösterilir (KK-16)', () => {
    useCadStore.setState((state) => ({ revision: state.revision + 1 }))
    renderMenuBar()

    // Gösterge yalnız renk değil: renk körü kullanıcı için ad da değişiyor.
    expect(screen.getByRole('button', { name: 'Kaydet (kaydedilmemiş değişiklik var)' }))
      .toBeInTheDocument()
  })

  it('değişiklik yokken uyarı gösterilmez', () => {
    useCadStore.getState().markSaved()
    renderMenuBar()

    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeInTheDocument()
  })

  it('Katlar başlığında kat adedi rozeti gösterilir (issue 2.4)', () => {
    renderMenuBar()
    expect(screen.getByRole('button', { name: /^Katlar/ })).toHaveTextContent('Katlar1')
  })
})
