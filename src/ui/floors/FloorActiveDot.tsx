import { Circle, CircleDot } from 'lucide-react'

import { floorActiveDotVariants } from './floorVariants'

type FloorActiveDotProps = {
  floorName: string
  isActive: boolean
  onMakeActive: () => void
}

/**
 * Aktif kat işareti ve düğmesi (K168). Kat ADININ hemen solunda: "hangi
 * kattayım" sorusu adla birlikte okunuyor, satırın öbür ucundaki bir ikonla
 * değil.
 *
 * Aktifken DOLU halka, değilken boş — radyo düğmesinin okunuşu. Hem aktifken
 * hem hover'da büyür: sabit boyutlu bir halka tıklanabilir olduğunu
 * söylemiyordu.
 */
export function FloorActiveDot({ floorName, isActive, onMakeActive }: FloorActiveDotProps) {
  return (
    <button
      type="button"
      onClick={onMakeActive}
      disabled={isActive}
      aria-label={`${floorName} aktif yap`}
      aria-pressed={isActive}
      title={isActive ? 'Aktif kat' : 'Aktif yap'}
      className={floorActiveDotVariants({ isActive })}
    >
      {isActive ? (
        <CircleDot size={15} strokeWidth={2.4} aria-hidden />
      ) : (
        <Circle size={15} strokeWidth={1.8} aria-hidden />
      )}
    </button>
  )
}
