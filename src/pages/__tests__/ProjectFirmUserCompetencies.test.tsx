import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  LIST_PATH,
  MOCK_GAS_FIRMS,
  MOCK_PROJECT_FIRMS,
  buildDetail,
  renderFormFlow,
} from './projectFirmUserFixture'

const readApi = vi.hoisted(() => ({
  getProjectFirmUser: vi.fn(),
  getCompetencyGasFirms: vi.fn(),
  getAuthorizedProjectFirms: vi.fn(),
}))
const formApi = vi.hoisted(() => ({
  saveProjectFirmUser: vi.fn(),
  findTakenProjectFirmUserFields: vi.fn(),
}))

vi.mock('../../api/projectFirmUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmUsers')>()),
  ...readApi,
}))

vi.mock('../../api/projectFirmUserForm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmUserForm')>()),
  ...formApi,
}))

beforeEach(() => {
  readApi.getCompetencyGasFirms.mockResolvedValue(MOCK_GAS_FIRMS)
  readApi.getAuthorizedProjectFirms.mockResolvedValue(MOCK_PROJECT_FIRMS)
  readApi.getProjectFirmUser.mockResolvedValue(buildDetail())
  formApi.findTakenProjectFirmUserFields.mockResolvedValue({
    isEmailTaken: false,
    isUsernameTaken: false,
  })
  formApi.saveProjectFirmUser.mockResolvedValue({ userId: 1001, isPersisted: false })
})

afterEach(() => {
  vi.clearAllMocks()
})

function addRowButton() {
  return screen.getByRole('button', { name: 'Yeni Yetkinlik Ekle' })
}

/** `rowNumber`. satırdaki alanı ada göre bulur. */
function rowField(rowNumber: number, field: string) {
  return screen.getByLabelText(`${rowNumber}. yetki satırı — ${field}`)
}

async function completeRow(
  user: ReturnType<typeof userEvent.setup>,
  rowNumber: number,
  { gasFirmId = '103', projectFirmId = '201' } = {},
) {
  await user.selectOptions(rowField(rowNumber, 'Gaz dağıtım firması'), gasFirmId)
  await waitFor(() => expect(rowField(rowNumber, 'Proje firması')).toBeEnabled())
  await user.selectOptions(rowField(rowNumber, 'Proje firması'), projectFirmId)
  await user.selectOptions(rowField(rowNumber, 'Yetki'), 'firmEngineer')
}

// KK-19: boş satır eklenir; açık satır tamamlanmadan ikinci satır eklenmez.
describe('yetki satırı ekleme (KK-19)', () => {
  it('bilgilendirme kutusu ve ekleme düğmesi görünür', () => {
    renderFormFlow()

    expect(
      screen.getByText('Kullanıcının en az 1 (bir) yetkisi tanımlı olmalıdır.'),
    ).toBeInTheDocument()
    expect(addRowButton()).toBeInTheDocument()
  })

  it('düğme boş satır ekler', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.click(addRowButton())

    expect(rowField(1, 'Gaz dağıtım firması')).toHaveValue('')
    expect(rowField(1, 'Aktif')).toBeChecked()
  })

  it('yarım satır varken ikinci satır eklenmez', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.click(addRowButton())
    await user.click(addRowButton())

    expect(
      screen.getByText('Yeni satır eklemeden önce açık satırdaki zorunlu seçimleri tamamlayın.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('2. yetki satırı — Yetki')).not.toBeInTheDocument()
  })

  it('satır tamamlanınca yeni satır eklenebilir', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.click(addRowButton())
    await completeRow(user, 1)
    await user.click(addRowButton())

    expect(rowField(2, 'Gaz dağıtım firması')).toBeInTheDocument()
  })
})

// KK-20: proje firması G.D. firmasına bağlı.
describe('proje firmasının firmaya bağlılığı (KK-20)', () => {
  it('firma seçilmeden proje firması kutusu pasiftir', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.click(addRowButton())

    expect(rowField(1, 'Proje firması')).toBeDisabled()
  })

  it('firma seçilince yalnız o firmanın yetkili proje firmaları gelir', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.click(addRowButton())
    await user.selectOptions(rowField(1, 'Gaz dağıtım firması'), '103')

    await waitFor(() => expect(rowField(1, 'Proje firması')).toBeEnabled())
    expect(readApi.getAuthorizedProjectFirms).toHaveBeenCalledWith(103, expect.anything())
    expect(within(rowField(1, 'Proje firması')).getByRole('option', { name: 'AA Mühendislik' }))
      .toBeInTheDocument()
  })

  it('firma değişince proje firması seçimi temizlenir', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.click(addRowButton())
    await completeRow(user, 1)
    expect(rowField(1, 'Proje firması')).toHaveValue('201')

    await user.selectOptions(rowField(1, 'Gaz dağıtım firması'), '105')

    await waitFor(() => expect(rowField(1, 'Proje firması')).toHaveValue(''))
  })
})

// KK-21: firma detayı yeni sekmede açılır, firma seçilmeden düğme pasiftir.
describe('firma detayı kısayolu (KK-21)', () => {
  it('firma seçilmeden düğme pasiftir', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.click(addRowButton())

    expect(rowField(1, 'Firma detayını yeni sekmede aç')).toBeDisabled()
  })

  it('firma seçilince yeni sekmeye açılan bağlantı olur', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.click(addRowButton())
    await completeRow(user, 1)

    const shortcut = rowField(1, 'Firma detayını yeni sekmede aç')
    expect(shortcut).toHaveAttribute('href', '/admin/project-firms/201')
    expect(shortcut).toHaveAttribute('target', '_blank')
  })
})

// KK-22: aynı ikili için ikinci satır tanımlanamaz.
describe('yinelenen yetki (KK-22)', () => {
  it('aynı ikili ikinci kez girilirse kayıt tamamlanmaz', async () => {
    const user = userEvent.setup()
    renderFormFlow(`${LIST_PATH}/1001`)
    await screen.findByLabelText(/1\. yetki satırı — Gaz dağıtım firması/)

    await user.click(addRowButton())
    await completeRow(user, 2, { gasFirmId: '103', projectFirmId: '201' })
    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    expect(
      await screen.findByText(
        'Bu gaz dağıtım firması ve proje firması ikilisi için zaten bir yetki satırı var.',
      ),
    ).toBeInTheDocument()
    expect(formApi.saveProjectFirmUser).not.toHaveBeenCalled()
  })

  it('proje firması farklıysa kayıt tamamlanır', async () => {
    const user = userEvent.setup()
    renderFormFlow(`${LIST_PATH}/1001`)
    await screen.findByLabelText(/1\. yetki satırı — Gaz dağıtım firması/)

    await user.click(addRowButton())
    await completeRow(user, 2, { gasFirmId: '103', projectFirmId: '202' })
    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    await waitFor(() => expect(formApi.saveProjectFirmUser).toHaveBeenCalled())
  })
})

// KK-23: satır silme onay ister; yetkisiz kayıt tamamlanmaz.
describe('satır silme ve en az bir yetki (KK-23)', () => {
  it('silme onay ister ve onaylanınca satır kalkar', async () => {
    const user = userEvent.setup()
    renderFormFlow(`${LIST_PATH}/1001`)
    await screen.findByLabelText(/1\. yetki satırı — Gaz dağıtım firması/)

    await user.click(screen.getByRole('button', { name: 'Sil' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Sil' }))

    await waitFor(() =>
      expect(
        screen.queryByLabelText('1. yetki satırı — Gaz dağıtım firması'),
      ).not.toBeInTheDocument(),
    )
  })

  it('vazgeçilirse satır durur', async () => {
    const user = userEvent.setup()
    renderFormFlow(`${LIST_PATH}/1001`)
    await screen.findByLabelText(/1\. yetki satırı — Gaz dağıtım firması/)

    await user.click(screen.getByRole('button', { name: 'Sil' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Vazgeç' }))

    expect(rowField(1, 'Gaz dağıtım firması')).toBeInTheDocument()
  })

  it('yetki satırı olmadan kayıt tamamlanmaz', async () => {
    const user = userEvent.setup()
    renderFormFlow()

    await user.type(screen.getByLabelText(/^Email/), 'yeni@firma.com')
    await user.type(screen.getByLabelText(/^Adı Soyadı/), 'Selin Arslan')
    await user.type(screen.getByLabelText(/^Şifre( \*)?$/), 'Guclu.Sifre1')
    await user.click(screen.getByRole('button', { name: /Kaydet/ }))

    await waitFor(() => expect(formApi.saveProjectFirmUser).not.toHaveBeenCalled())
    // Bilgilendirme kutusundaki metin hata olarak da çıkar: biri bilgi, biri engel.
    expect(
      screen.getAllByText('Kullanıcının en az 1 (bir) yetkisi tanımlı olmalıdır.').length,
    ).toBeGreaterThan(1)
  })
})
