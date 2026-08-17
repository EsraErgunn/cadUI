import { Toolbar } from './Toolbar'
import logo from '../assets/brand/logo3.png'

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
export function EditorSidebar() {
  return (
    // Genişliği palet belirler (iki sütun araç); sabit bir sayı yazılırsa palete
    // araç eklenince taşar.
    <div className="flex shrink-0 flex-col bg-surface-sunken">
      <div className="flex h-14 shrink-0 items-center justify-center px-3">
        <img src={logo} alt="StarCad" className="h-8 w-auto" />
      </div>
      <Toolbar />
    </div>
  )
}
