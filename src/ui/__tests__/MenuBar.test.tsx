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
  onSaveAs = vi.fn(),
  onLoadVersion = vi.fn().mockResolvedValue(undefined),
  onClearProject = vi.fn(),
  onDownloadProjectFile = vi.fn(),
  onOpenProjectFile = vi.fn(),
) {
  render(
    <MemoryRouter>
      <MenuBar
        onCloseEditor={onCloseEditor}
        onClearProject={onClearProject}
        onDownloadProjectFile={onDownloadProjectFile}
        onOpenProjectFile={onOpenProjectFile}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onImport={onImport}
        onExport={onExport}
        isSaving={false}
        versionHistory={{ projectId: 1, currentVersionId: undefined, onLoadVersion }}
      />
    </MemoryRouter>,
  )
  return {
    onCloseEditor,
    onSave,
    onImport,
    onExport,
    onSaveAs,
    onClearProject,
    onDownloadProjectFile,
    onOpenProjectFile,
  }
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

  it('aktif maddeler: Kaydet, Farklı Kaydet, İçe/Dışa Aktar, Projeyi Temizle (K111)', async () => {
    const user = userEvent.setup()
    renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))

    expect(screen.getByRole('menuitem', { name: /^Kaydet/ })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: /^Farklı Kaydet/ })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'İçe Aktar (JSON)' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Dışa Aktar (JSON)' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Projeyi Temizle' })).toBeEnabled()
    // Proje dosyası maddeleri ARTIK ÇALIŞIYOR: biçim PDF olarak kararlaştı ve
    // çizim verisi belgeye gömülüyor.
    expect(screen.getByRole('menuitem', { name: 'Proje Dosyasını İndir' })).toBeEnabled()
    expect(screen.getByRole('menuitem', { name: 'Proje Dosyasını Aç' })).toBeEnabled()
  })

  it('üst barda karşılığı olan maddeler menüden KALKTI (K111)', async () => {
    const user = userEvent.setup()
    renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    const dropdown = screen.getByRole('menu', { name: 'Dosya' })

    for (const label of ['Kapat', 'Gönder', 'Proje Hareketleri', 'Proje Bilgileri']) {
      expect(within(dropdown).queryByRole('menuitem', { name: label })).not.toBeInTheDocument()
    }
  })

  it('Proje Bilgileri üst barda ikon düğmesi olarak durur (K111)', () => {
    renderMenuBar()

    // Arkasındaki ekran yazılmadı: görünür ama pasif.
    expect(screen.getByRole('button', { name: 'Proje Bilgileri' })).toBeDisabled()
  })

  it('Dosya > Proje Dosyasını İndir pencereyi açar; menü ÜRETMEZ', async () => {
    const user = userEvent.setup()
    const { onDownloadProjectFile } = renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Proje Dosyasını İndir' }))

    // Kat seçimi ve sayfa ayarları pencerenin işi; menü yalnız haber ediyor.
    expect(onDownloadProjectFile).toHaveBeenCalledTimes(1)
  })

  it('Dosya > Proje Dosyasını Aç dosya seçicisini tetikler', async () => {
    const user = userEvent.setup()
    const { onOpenProjectFile } = renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Proje Dosyasını Aç' }))

    expect(onOpenProjectFile).toHaveBeenCalledTimes(1)
  })

  it('Dosya > Projeyi Temizle onay akışını açar, doğrudan silmez', async () => {
    const user = userEvent.setup()
    const { onClearProject } = renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Projeyi Temizle' }))

    expect(onClearProject).toHaveBeenCalledTimes(1)
  })

  it('Dosya > Farklı Kaydet etiketli kaydı tetikler, düz kaydetmeyi DEĞİL', async () => {
    const user = userEvent.setup()
    const { onSaveAs, onSave } = renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    await user.click(screen.getByRole('menuitem', { name: /^Farklı Kaydet/ }))

    expect(onSaveAs).toHaveBeenCalledTimes(1)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('Dosya > İçe Aktar içe aktarmayı tetikler', async () => {
    const user = userEvent.setup()
    const { onImport } = renderMenuBar()

    await user.click(screen.getByRole('button', { name: /^Dosya/ }))
    await user.click(screen.getByRole('menuitem', { name: 'İçe Aktar (JSON)' }))

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
    await user.click(screen.getByRole('menuitem', { name: /^Kaydet/ }))
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

  it('← Projeler düğmesi editörden çıkışı tetikler (KK-10)', async () => {
    // "Dosya > Kapat" maddesi KALKTI: aynı işi yapan iki düğme vardı (K111).
    const user = userEvent.setup()
    const { onCloseEditor } = renderMenuBar()

    await user.click(screen.getByRole('button', { name: 'Projeler' }))
    expect(onCloseEditor).toHaveBeenCalledTimes(1)
  })

  it('kaydedilmemiş değişiklik varken Kaydet düğmesinde uyarı gösterilir (KK-16)', () => {
    // Kirlilik İÇERİKTEN hesaplanıyor: `revision` artırmak yetmez, çizim
    // verisinin gerçekten kaydedilenden farklı olması gerekir.
    useCadStore.setState((state) => ({
      points: [...state.points, { id: 1, floorId: 1, x: 0, y: 0 }],
    }))
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

  it('Test Et KALDIRILDI; Gönder görünür ama pasif (K142)', () => {
    // "Test Et" hiç bağlanmamıştı ve aynı işi Hata Kontrolleri yapıyor.
    renderMenuBar()

    expect(screen.queryByRole('button', { name: 'Test Et' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gönder' })).toBeDisabled()
  })

  it('Hata Kontrolleri düğmesi kendi listesini açar (artık pasif DEĞİL)', () => {
    renderMenuBar()

    const validationButton = screen.getByRole('button', { name: /Hata Kontrolleri/ })
    expect(validationButton).toBeEnabled()
    expect(validationButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('Kayıt Geçmişi düğmesi kendi listesini açar (artık pasif DEĞİL)', async () => {
    // K90'da yer tutucuydu; arkasına gerçek uç bağlandı.
    const user = userEvent.setup()
    renderMenuBar()

    const historyButton = screen.getByRole('button', { name: 'Kayıt Geçmişi' })
    expect(historyButton).toBeEnabled()
    expect(historyButton).toHaveAttribute('aria-expanded', 'false')

    await user.click(historyButton)
    expect(historyButton).toHaveAttribute('aria-expanded', 'true')
  })
})
