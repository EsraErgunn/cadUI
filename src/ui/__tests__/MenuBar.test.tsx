import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { MenuBar } from '../MenuBar'
import { EDITOR_MENUS } from '../menu/menuDefinitions'

function renderMenuBar(onCloseEditor = vi.fn()) {
  render(
    <MemoryRouter>
      <MenuBar onCloseEditor={onCloseEditor} />
    </MemoryRouter>,
  )
  return onCloseEditor
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

  it('Kapat dışındaki tüm maddeler pasiftir (KK-9)', async () => {
    const user = userEvent.setup()
    renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))

    expect(screen.getByRole('menuitem', { name: 'Kapat' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Kaydet' })).toBeDisabled()
    expect(screen.getByRole('menuitem', { name: 'Gönder' })).toBeDisabled()
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
    const onCloseEditor = renderMenuBar()

    await user.click(screen.getByRole('button', { name: 'Projeler' }))
    expect(onCloseEditor).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Kapat' }))
    expect(onCloseEditor).toHaveBeenCalledTimes(2)
  })

  it('Katlar başlığında kat adedi rozeti gösterilir (issue 2.4)', () => {
    renderMenuBar()
    expect(screen.getByRole('button', { name: /^Katlar/ })).toHaveTextContent('Katlar1')
  })
})
