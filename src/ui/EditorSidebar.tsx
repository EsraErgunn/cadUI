import { Toolbar } from './Toolbar'
import logo from '../assets/brand/logo.st.png'

interface EditorSidebarProps {
  /** Logoya tıklayınca çağrılır. Gezinme kendisi kaydedilmemiş değişiklik
      sorusunu MenuBar'daki "Projeler" düğmesiyle aynı kapıdan sorar (K112) —
      burada ayrıca onay istenmez. */
  onCloseEditor: () => void
}

/**
 * Sol kolon: en üstte logo, altında araç paleti.
 *
 * Logo paletin İÇİNDE değil burada: palet görünüme göre tümüyle değişiyor
 * (mimari ↔ tesisat), logo değişmiyor — paletin içinde olsaydı iki dosyada iki
 * kopyası dururdu.
 *
 * Zemini kolon taşıyor, paletler değil: sağdaki içerik kolonu bu zeminin üstüne
 * yuvarlak köşeyle biniyor (EditorPage), o geçişin kesintisiz görünmesi için
 * sol tarafın tek parça bir yüzey olması gerekiyor.
 */
export function EditorSidebar({ onCloseEditor }: EditorSidebarProps) {
  return (
    // Genişliği palet belirler (iki sütun araç); sabit bir sayı yazılırsa palete
    // araç eklenince taşar.
    <div className="flex shrink-0 flex-col bg-surface-sunken">
      <div className="flex h-14 shrink-0 items-center justify-center px-3">
        <button
          type="button"
          onClick={onCloseEditor}
          aria-label="Projelere dön"
          className="cursor-pointer rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-selection/70"
        >
          <img src={logo} alt="" aria-hidden className="h-8 w-auto" />
        </button>
      </div>
      <Toolbar />
    </div>
  )
}
