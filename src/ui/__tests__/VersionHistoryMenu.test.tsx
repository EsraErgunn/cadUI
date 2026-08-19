import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCadStore } from '../../store/cadStore'
import { VersionHistoryMenu } from '../versions/VersionHistoryMenu'

const api = vi.hoisted(() => ({ getProjectVersions: vi.fn() }))

vi.mock('../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projects')>()),
  ...api,
}))

/**
 * Tarihler saat dilimi EKİ TAŞIMIYOR: uç `DateTime` döndürüyor
 * (ProjectVersion.CreatedAt = DateTime.UtcNow) ve .NET eksiz yazıyor. Değer UTC
 * kabul edilmeli — beklenen metin de bu yüzden `Z`li karşılığından üretiliyor,
 * elle yazılsaydı test yalnız yazanın saat diliminde geçerdi.
 */
const VERSIONS = [
  { id: 2, label: 'test1', createdAt: '2026-08-19T11:30:00' },
  { id: 1, label: null, createdAt: '2026-08-18T09:00:00' },
]

function expectedTimestampText(utcIso: string): string {
  const date = new Date(utcIso)
  const day = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(date)
  const time = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(date)
  return `${day} - ${time}`
}

const NEWEST_TEXT = expectedTimestampText('2026-08-19T11:30:00Z')
const OLDEST_TEXT = expectedTimestampText('2026-08-18T09:00:00Z')

function renderMenu(currentVersionId: number | undefined = 2) {
  const onLoadVersion = vi.fn().mockResolvedValue(undefined)
  render(
    <VersionHistoryMenu
      projectId={7}
      currentVersionId={currentVersionId}
      onLoadVersion={onLoadVersion}
    />,
  )
  return onLoadVersion
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Kayıt Geçmişi' }))
}

/** Kirli proje: içerik kaydedilenden farklı olmalı, `revision` artırmak yetmez (K94). */
function makeProjectDirty(): void {
  useCadStore.setState((state) => ({
    points: [...state.points, { id: 1, floorId: 1, x: 0, y: 0 }],
  }))
}

beforeEach(() => {
  api.getProjectVersions.mockReset()
  api.getProjectVersions.mockResolvedValue(VERSIONS)
  useCadStore.getState().resetProject()
})

describe('VersionHistoryMenu', () => {
  it('kapalıyken istek atılmaz — liste yalnız açılınca çekilir', () => {
    renderMenu()

    expect(api.getProjectVersions).not.toHaveBeenCalled()
  })

  it('kayıtları tarih-saat ve etiketle listeler; etiketsiz kayıt tarihiyle anılır', async () => {
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)

    const rows = await screen.findAllByRole('listitem')
    expect(within(rows[0]).getByRole('button')).toHaveAccessibleName(`${NEWEST_TEXT}, test1`)
    expect(within(rows[1]).getByRole('button')).toHaveAccessibleName(OLDEST_TEXT)
  })

  it('editörde açık olan sürüm işaretlenir', async () => {
    const user = userEvent.setup()
    renderMenu(1)
    await openMenu(user)

    const rows = await screen.findAllByRole('listitem')
    // İşaret yalnız renk değil: ekran okuyucu için aria-current de yazılıyor.
    expect(within(rows[1]).getByRole('button')).toHaveAttribute('aria-current', 'true')
    expect(within(rows[0]).getByRole('button')).not.toHaveAttribute('aria-current')
  })

  it('kaydedilmemiş değişiklik YOKKEN doğrudan yükler ve liste kapanır', async () => {
    const user = userEvent.setup()
    const onLoadVersion = renderMenu()
    await openMenu(user)

    await user.click(await screen.findByRole('button', { name: OLDEST_TEXT }))

    expect(onLoadVersion).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.queryByRole('listitem')).not.toBeInTheDocument())
  })

  it('kaydedilmemiş değişiklik VARKEN önce onay ister', async () => {
    // Yükleme geri al geçmişini de sıfırlıyor (cadStore.loadProject): kullanıcı
    // sorulmadan yüklerse çizimini Ctrl+Z ile geri getiremez.
    const user = userEvent.setup()
    const onLoadVersion = renderMenu()
    makeProjectDirty()
    await openMenu(user)

    await user.click(await screen.findByRole('button', { name: OLDEST_TEXT }))
    expect(onLoadVersion).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Yine de Yükle' }))
    expect(onLoadVersion).toHaveBeenCalledWith(1)
  })

  it('onay penceresinde vazgeçilirse yükleme yapılmaz', async () => {
    const user = userEvent.setup()
    const onLoadVersion = renderMenu()
    makeProjectDirty()
    await openMenu(user)

    await user.click(await screen.findByRole('button', { name: OLDEST_TEXT }))
    await user.click(screen.getByRole('button', { name: 'Vazgeç' }))

    expect(onLoadVersion).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('dışarı tıklanınca kapanır, düğmenin kendisi kapatıp yeniden AÇMAZ', async () => {
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)
    expect(await screen.findAllByRole('listitem')).toHaveLength(2)

    await user.click(document.body)
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()

    // İkinci tık yeniden açar: pointerdown ile click birbirini yemiyor.
    await openMenu(user)
    expect(await screen.findAllByRole('listitem')).toHaveLength(2)
  })

  it('kaydı olmayan projede yönlendiren bir boş mesaj gösterir', async () => {
    api.getProjectVersions.mockResolvedValue([])
    const user = userEvent.setup()
    renderMenu(undefined)
    await openMenu(user)

    expect(await screen.findByText(/kaydedilmiş sürümü yok/)).toBeInTheDocument()
  })

  it('liste alınamazsa hata duyurulur ve bayat kayıtlar gösterilmez', async () => {
    api.getProjectVersions.mockRejectedValue(new Error('Sunucuya ulaşılamadı.'))
    const user = userEvent.setup()
    renderMenu()
    await openMenu(user)

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Sunucuya ulaşılamadı.'))
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})
