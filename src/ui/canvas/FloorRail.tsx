import { Layers } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { floorRailButtonVariants, floorRailToggleVariants } from './floorRailVariants'
import { getFloorShortLabels } from '../../core/floors'
import { useCadStore } from '../../store/cadStore'

/**
 * Sol üstteki kat şeridi (K166). Kat geçişi buradan yapılır; yüzen çubuktaki
 * kat LİSTESİ bu yüzden kalktı, orada yalnız iki pencere maddesi kaldı.
 *
 * Şerit YUKARIDAN AŞAĞI en üst kattan en alta dizilir — kullanıcı binayı
 * kesitten okuyor, "Katlar" penceresiyle aynı yön. Store dizisi en alt kat
 * başta olduğu için çevirme burada yapılıyor, veri çevrilmiyor.
 *
 * Etiketler kat ADINDAN değil SIRADAN geliyor (`getFloorShortLabels`): daire
 * dar, ad serbest metin ve "Asma Kat" sıradaki yerini söylemiyor. Tam ad
 * ipucunda ve erişilebilir adda duruyor.
 *
 * Şerit AÇILIR: kat ikonlu yuvarlak düğme sahnenin sol üstünde SABİT kalır,
 * katlar onun altından aşağı doğru uzar. Varsayılan AÇIK — şeridin varlık
 * sebebi tek tıklamayla kat değiştirmek; kapalı başlasaydı her geçiş iki
 * tıklama olurdu.
 */
export function FloorRail() {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const setActiveFloor = useCadStore((state) => state.setActiveFloor)

  const [isOpen, setIsOpen] = useState(true)
  const activeRef = useRef<HTMLButtonElement>(null)

  // Kat sayısı şeride sığmadığında aktif kat görünür kalmalı: dışarıdan
  // (kat penceresi, proje açma) değişen aktif kat kaydırma dışında kalabiliyor.
  useEffect(() => {
    // jsdom bu API'yi tanımıyor; şerit testte de mount edilebilmeli.
    activeRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [activeFloorId, isOpen])

  const labels = getFloorShortLabels(floors)
  const activeFloorName = floors.find((floor) => floor.id === activeFloorId)?.name ?? ''

  return (
    <div
      // `pointer-events-none` sarmalayıcıda: şeridin BOŞ kalan dikey alanı
      // tuvalin tıklamasını yutmamalı, yalnız düğmeler olayı alır.
      className="pointer-events-none absolute left-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] flex-col items-center gap-1"
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="floor-rail-list"
        // Ad çubuktaki kat düğmesinden AYRI: ikisi de "Katlar" deseydi ekran
        // okuyucuda iki özdeş kontrol duyulurdu.
        aria-label={`Kat şeridi, aktif kat ${activeFloorName}`}
        title={`Kat şeridi — aktif: ${activeFloorName}`}
        className={`pointer-events-auto ${floorRailToggleVariants({ isOpen })}`}
      >
        <Layers size={16} strokeWidth={1.8} aria-hidden />
      </button>

      {isOpen && (
        <div
          id="floor-rail-list"
          role="radiogroup"
          aria-label="Kat"
          className="floor-rail-scroll pointer-events-auto flex min-h-0 flex-col gap-1 overflow-y-auto py-0.5"
        >
          {floors
            .map((floor, index) => ({ floor, label: labels[index] }))
            .reverse()
            .map(({ floor, label }) => {
              const isActive = floor.id === activeFloorId

              return (
                <button
                  key={floor.id}
                  ref={isActive ? activeRef : undefined}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setActiveFloor(floor.id)}
                  title={floor.name}
                  aria-label={floor.name}
                  className={floorRailButtonVariants({ isActive })}
                >
                  {label}
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}
