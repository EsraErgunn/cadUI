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
  onImport = vi.fn(),
  onExport = vi.fn(),
) {
  render(
    <MemoryRouter>
      <MenuBar
        onCloseEditor={onCloseEditor}
        onSave={onSave}
        onImport={onImport}
        onExport={onExport}
        isSaving={false}
      />
    </MemoryRouter>,
  )
  return { onCloseEditor, onSave, onImport, onExport }
}

describe('MenuBar', () => {
  it('yalnız Dosya ve Araçlar menüleri kalır', () => {
    // Düzenle/Görünüm/Katlar tuvalin alt çubuğuna taşındı; üst bar proje
    // düzeyindeki işlere daraldı.
    renderMenuBar()
    const nav = screen.getByRole('navigation', { name: 'Ana menü' })
    const titles = within(nav)
      .getAllByRole('button')
      .map((button) => button.textContent)
    expect(titles).toEqual(['Dosya', 'Araçlar'])
  })

  it.each(EDITOR_MENUS.map((menu) => [menu.label, menu] as const))(
    '%s menüsü maddeleri doğru sıra ve metinle listeler (KK-9)',
    async (label, menu) => {
      const user = userEvent.setup()
      renderMenuBar()

      await user.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }))

      // Kısayol etiketi maddenin İÇİNDE duruyor (sağa yaslı), bu yüzden beklenen
      // metin "etiket + kısayol" olarak kuruluyor.
      const expectedLabels = menu.groups.flatMap((group) =>
        group.items.map((item) => `${item.label}${item.shortcut ?? ''}`),
      )
      const dropdown = screen.getByRole('menu', { name: label })
      const renderedLabels = [...dropdown.querySelectorAll('[role^="menuitem"]')].map(
        (item) => item.textContent,
      )
      expect(renderedLabels).toEqual(expectedLabels)
    },
  )

  it('yalnız Kaydet, İçe Aktar, Dışa Aktar ve Kapat aktiftir (KK-9)', async () => {
    const user = userEvent.setup()
    renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))

    expect(screen.getByRole('menuitem', { name: 'Kapat' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Kaydet' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'İçe Aktar' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Dışa Aktar (JSON)' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Gönder' })).toBeDisabled()
  })

  it('Dosya > İçe Aktar içe aktarmayı tetikler', async () => {
    const user = userEvent.setup()
    const { onImport } = renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    await user.click(screen.getByRole('menuitem', { name: 'İçe Aktar' }))

    expect(onImport).toHaveBeenCalledTimes(1)
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

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    expect(screen.getByRole('menu', { name: 'Dosya' })).toBeInTheDocument()

    await user.click(document.body)
    expect(screen.queryByRole('menu', { name: 'Dosya' })).not.toBeInTheDocument()
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

  it('kaydedilmemiş değişiklik varken Kaydet düğmesinde uyarı gösterilir (KK-16)', () => {
    useCadStore.setState((state) => ({ revision: state.revision + 1 }))
    renderMenuBar()

    // Gösterge yalnız renk değil: renk körü kullanıcı için ad da değişiyor.
    expect(
      screen.getByRole('button', { name: 'Kaydet (kaydedilmemiş değişiklik var)' }),
    ).toBeInTheDocument()
  })

  it('değişiklik yokken uyarı gösterilmez', () => {
    useCadStore.getState().markSaved()
    renderMenuBar()

    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeInTheDocument()
  })

  it('Test Et, Gönder ve Kayıt Geçmişi görünür ama pasif (K79)', () => {
    // Arkalarında henüz akış yok; düğme "bozuk" değil "henüz yok" demeli.
    renderMenuBar()

    expect(screen.getByRole('button', { name: 'Test Et' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Gönder' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Kayıt Geçmişi' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Hata Kontrolleri' })).toBeDisabled()
  })
})
