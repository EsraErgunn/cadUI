import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { MenuBar } from '../MenuBar'
import { Toolbar } from '../Toolbar'
import { FloatingToolbar } from '../canvas/FloatingToolbar'
import { ReadOnlyNotice } from '../canvas/ReadOnlyNotice'
import { PropertyPanelShell } from '../properties/PropertyPanelShell'

/**
 * Salt görüntüleme kipinin ARAYÜZ yüzeyleri.
 *
 * Bu dosya "düğme görünüyor mu"ya bakıyor ve TEK BAŞINA yeterli değil; gerçek
 * güvence `store/__tests__/editorReadOnly.test.ts` içindeki merkezî kapı
 * testlerinde — orada action doğrudan çağrılıyor ve state değişmiyor.
 */
function setReadOnly(isReadOnly: boolean): void {
  useUiStore.getState().setEditorReadOnly(isReadOnly)
}

const MENU_BAR_PROPS = {
  onCloseEditor: vi.fn(),
  onClearProject: vi.fn(),
  onDownloadProjectFile: vi.fn(),
  onOpenProjectFile: vi.fn(),
  onSave: vi.fn(),
  onSaveAs: vi.fn(),
  onImport: vi.fn(),
  onExport: vi.fn(),
  isSaving: false,
  versionHistory: { projectId: 1, currentVersionId: undefined, onLoadVersion: vi.fn() },
}

beforeEach(() => {
  setReadOnly(false)
  useUiStore.setState({ activeViewId: 'architecture' })
})

afterEach(() => {
  setReadOnly(false)
  vi.clearAllMocks()
})

describe('araç paleti', () => {
  it('salt görüntülemede hiç çizilmez', () => {
    setReadOnly(true)
    render(<Toolbar />)

    expect(screen.queryByRole('navigation', { name: 'Araç paleti' })).not.toBeInTheDocument()
  })

  it('yazan kullanıcıda çizilmeye devam eder', () => {
    render(<Toolbar />)

    expect(screen.getByRole('navigation', { name: 'Araç paleti' })).toBeInTheDocument()
  })
})

describe('üst bar', () => {
  it('salt görüntülemede Kaydet düğmesini göstermez', () => {
    setReadOnly(true)
    render(<MenuBar {...MENU_BAR_PROPS} />)

    expect(screen.queryByRole('button', { name: /Kaydet/ })).not.toBeInTheDocument()
  })

  it('yazan kullanıcıda Kaydet düğmesi durur', () => {
    render(<MenuBar {...MENU_BAR_PROPS} />)

    expect(screen.getByRole('button', { name: /Kaydet/ })).toBeInTheDocument()
  })
})

describe('yüzen çubuk', () => {
  const props = {
    onGoToFloor: vi.fn(),
    onOpenFloorManagement: vi.fn(),
    onOpenFloorCopy: vi.fn(),
  }

  it('salt görüntülemede geri al/yinele göstermez', () => {
    setReadOnly(true)
    render(<FloatingToolbar {...props} />)

    expect(screen.queryByRole('button', { name: 'Geri al' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Yinele' })).not.toBeInTheDocument()
  })

  /** Kat geçişi ve el aracı GÖRÜNTÜLEME işlemi; kapatılmamalı. */
  it('salt görüntülemede kat geçişi ve el aracı durur', () => {
    setReadOnly(true)
    render(<FloatingToolbar {...props} />)

    expect(screen.getByRole('button', { name: 'Alt kata geç' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Üst kata geç' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'El aracı' })).toBeInTheDocument()
  })

  it('yazan kullanıcıda geri al/yinele durur', () => {
    render(<FloatingToolbar {...props} />)

    expect(screen.getByRole('button', { name: 'Geri al' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Yinele' })).toBeInTheDocument()
  })
})

describe('özellik paneli kabuğu', () => {
  function renderShell() {
    return render(
      <PropertyPanelShell label="Nesne özellikleri" title="Duvar" isOpen onDelete={vi.fn()}>
        <input aria-label="Kalınlık" defaultValue="10" />
      </PropertyPanelShell>,
    )
  }

  /**
   * `fieldset disabled` görsel bir kilit değil: içindeki her denetimi tarayıcı
   * düzeyinde etkisiz kılıyor.
   */
  it('salt görüntülemede alanlar devre dışı ve Sil yok', () => {
    setReadOnly(true)
    renderShell()

    expect(screen.getByLabelText('Kalınlık')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Sil' })).not.toBeInTheDocument()
  })

  it('panel açık kalır: seçilen nesnenin özellikleri OKUNABİLİR', () => {
    setReadOnly(true)
    renderShell()

    expect(screen.getByRole('complementary', { name: 'Nesne özellikleri' })).toBeInTheDocument()
    expect(screen.getByLabelText('Kalınlık')).toHaveValue('10')
  })

  it('yazan kullanıcıda alanlar açık ve Sil durur', () => {
    renderShell()

    expect(screen.getByLabelText('Kalınlık')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Sil' })).toBeInTheDocument()
  })
})

describe('salt görüntüleme şeridi', () => {
  it('sebebi yazar', () => {
    render(<ReadOnlyNotice />)

    expect(screen.getByRole('status')).toHaveTextContent('Salt görüntüleme')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Bu proje üzerinde değişiklik yapamazsınız.',
    )
  })
})

describe('kip sızıntısı', () => {
  /** Kip `uiStore`da yaşıyor; çizim verisine ya da geçmişe HİÇ girmiyor. */
  it('çizim verisini ve kirli işaretini etkilemez', () => {
    const revisionBefore = useCadStore.getState().revision
    setReadOnly(true)

    expect(useCadStore.getState().revision).toBe(revisionBefore)
  })
})
