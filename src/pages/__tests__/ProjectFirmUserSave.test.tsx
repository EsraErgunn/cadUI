import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CREATE_PATH, LIST_PATH, buildDetail, renderFormFlow } from './projectFirmUserFixture'

/** Etiket "Şifre" ya da "Şifre *"; göz düğmesinin adıyla ("Şifreyi göster") karışmasın. */
const PASSWORD_LABEL = /^Şifre( \*)?$/

const readApi = vi.hoisted(() => ({ getProjectFirmUser: vi.fn() }))
const formApi = vi.hoisted(() => ({ saveProjectFirmUser: vi.fn() }))
const firmsApi = vi.hoisted(() => ({ getProjectFirmList: vi.fn() }))

vi.mock('../../api/projectFirmUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmUsers')>()),
  ...readApi,
}))

vi.mock('../../api/projectFirmUserForm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmUserForm')>()),
  ...formApi,
}))

/** Formdaki "Proje Firması" kutusunun kaynağı; kullanıcı bir firmaya bağlanıyor. */
vi.mock('../../api/projectFirms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirms')>()),
  ...firmsApi,
}))

const PROJECT_FIRM = { id: 201, name: 'AA Mühendislik' }

beforeEach(() => {
  readApi.getProjectFirmUser.mockResolvedValue(buildDetail())
  firmsApi.getProjectFirmList.mockResolvedValue([PROJECT_FIRM])
  formApi.saveProjectFirmUser.mockResolvedValue({ userId: 1001 })
})

afterEach(() => {
  vi.clearAllMocks()
})

/** Zorunlu alanları doldurur; proje firması da zorunlu. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  // Seçenekler istekten sonra geliyor; kutu çizilmiş olsa da beklenmeli.
  await screen.findByRole('option', { name: PROJECT_FIRM.name })
  await user.selectOptions(screen.getByLabelText(/^Proje Firması/), String(PROJECT_FIRM.id))
  await user.type(screen.getByLabelText(/^Email/), 'yeni.kullanici@firma.com')
  await user.type(screen.getByLabelText(/^Adı Soyadı/), 'Selin Arslan')
  await user.type(screen.getByLabelText(PASSWORD_LABEL), 'Guclu.Sifre1')
}

/**
 * KK-16: benzersizlik SUNUCUDA denetleniyor ve 409 ile geliyor. Ön kontrol ucu
 * yok; zaten olsa da iki istek arasında başka biri aynı adı alabilirdi — tek
 * doğru yer sunucunun cevabı. Hangi alanın çakıştığı mesajdan okunuyor.
 */
describe('benzersizlik (KK-16)', () => {
  it('kullanımdaki kullanıcı adını alan hatası olarak gösterir', async () => {
    const user = userEvent.setup()
    const { ApiError } = await import('../../api/http')
    formApi.saveProjectFirmUser.mockRejectedValueOnce(
      new ApiError(409, 'Bu kullanıcı adı zaten kullanılıyor.'),
    )
    renderFormFlow()
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    expect(
      await screen.findByText('Bu kullanıcı adı zaten kullanılmaktadır.'),
    ).toBeInTheDocument()
  })

  it('kullanımdaki e-posta ile kayıt tamamlanmaz', async () => {
    const user = userEvent.setup()
    const { ApiError } = await import('../../api/http')
    formApi.saveProjectFirmUser.mockRejectedValueOnce(
      new ApiError(409, 'Bu e-posta adresi zaten kullanılıyor.'),
    )
    renderFormFlow()
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    expect(
      await screen.findByText('Bu e-posta adresi zaten kullanılmaktadır.'),
    ).toBeInTheDocument()
  })
})

// KK-24: kayıt → listeye dönüş + bildirim; iptal → veri kaydedilmez.
describe('kaydetme ve iptal (KK-24)', () => {
  it('geçerli form kaydedilir ve listeye dönülür', async () => {
    const user = userEvent.setup()
    renderFormFlow()
    await fillValidForm(user)

    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    await screen.findByRole('heading', { name: 'Proje Firması Kullanıcıları' })
    expect(formApi.saveProjectFirmUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'yeni.kullanici@firma.com',
        fullName: 'Selin Arslan',
        username: 'selin.arslan',
        projectFirmId: PROJECT_FIRM.id,
      }),
      null,
    )
    expect(screen.getByTestId('list-state')).toHaveTextContent('"savedUserId":1001')
  })

  it('dokunulmamış formda İptal doğrudan listeye döner', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.click(screen.getByRole('button', { name: 'İptal' }))

    expect(
      await screen.findByRole('heading', { name: 'Proje Firması Kullanıcıları' }),
    ).toBeInTheDocument()
    expect(formApi.saveProjectFirmUser).not.toHaveBeenCalled()
  })

  it('değişiklik varsa İptal onay ister', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.type(screen.getByLabelText(/^Adı Soyadı/), 'Selin')
    await user.click(screen.getByRole('button', { name: 'İptal' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText(/kaydedilmeden çıkılacaktır/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Listeye dön' }))
    expect(
      await screen.findByRole('heading', { name: 'Proje Firması Kullanıcıları' }),
    ).toBeInTheDocument()
  })
})

// KK-25: aynı ekran güncelleme için de kullanılır.
describe('güncelleme (KK-25)', () => {
  it('alanlar mevcut bilgilerle dolu gelir', async () => {
    renderFormFlow(`${LIST_PATH}/1001`)

    expect(await screen.findByLabelText(/^Email/)).toHaveValue('tolga.ertek@tekhnelogos.com')
    expect(screen.getByLabelText(/^Adı Soyadı/)).toHaveValue('Tolga Ertek')
    expect(screen.getByLabelText('Telefon')).toHaveValue('0532 118 08 80')
    expect(screen.getByRole('heading', { name: 'Proje Firma Kullanıcısı Güncelleme' }))
      .toBeInTheDocument()
  })

  it('kullanıcı adı salt okunur, şifre boş ve zorunsuz', async () => {
    const user = userEvent.setup()
    renderFormFlow(`${LIST_PATH}/1001`)

    const username = await screen.findByLabelText(/^Kullanıcı Adı/)
    expect(username).toHaveAttribute('readonly')
    expect(screen.getByLabelText(PASSWORD_LABEL)).toHaveValue('')
    expect(screen.getByText('Boş bırakılırsa şifre değişmez.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    await waitFor(() =>
      expect(formApi.saveProjectFirmUser).toHaveBeenCalledWith(
        expect.objectContaining({ password: null }),
        1001,
      ),
    )
  })
})

describe('oluşturma yolu', () => {
  it('yeni kayıt için detay ucuna gidilmez', () => {
    renderFormFlow(CREATE_PATH)

    expect(readApi.getProjectFirmUser).not.toHaveBeenCalled()
  })
})
