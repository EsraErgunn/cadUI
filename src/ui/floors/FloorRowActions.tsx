import { Copy, CornerUpLeft, MoreHorizontal, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { FloorMenu, FloorMenuItem } from './FloorMenu'
import { FLOOR_FOCUS_RING } from './floorVariants'
import type { DraftFloor } from '../../core/floorPlan'
import {
  FLOOR_TYPES,
  FLOOR_TYPE_LABELS,
  canAssignFloorType,
  getFloorType,
  type FloorType,
} from '../../core/floors'
import type { Floor } from '../../core/model'
import { chromeButtonVariants } from '../controls/buttonVariants'

type FloorRowActionsProps = {
  floor: DraftFloor
  /** Kural konuma bakıyor: hangi tipin verilebileceği tüm listeye bağlı. */
  floors: readonly Floor[]
  isRemovable: boolean
  /** Katta çizim var mı — silme onayı YALNIZ buna bakar. */
  hasContent: boolean
  onCopyFrom: () => void
  onClearCopy: () => void
  onSetType: (type: FloorType | null) => void
  onRemove: () => void
}

/**
 * Satır işlemleri (K166). Kopyalama ve silme İKON — en sık kullanılanlar, menü
 * açtırmak onları iki tıklama uzağa koyuyordu.
 *
 * ⚠️ Kat TİPİ (K168) menüde: üç seçenekli ve çoğu katta hiçbiri geçerli değil,
 * satırda sürekli duran bir kontrolü hak etmiyor.
 *
 * ⚠️ Silme onayı YALNIZ dolu katta ve SATIRIN İÇİNDE: boş katta soracak bir şey
 * yok (kaybedilen bir çizim yok, üstelik işlem Uygula'ya kadar taslakta ve
 * sonrasında tek Ctrl+Z ile geri alınıyor). Ayrı bir onay PENCERESİ de yok.
 */
export function FloorRowActions({
  floor,
  floors,
  isRemovable,
  hasContent,
  onCopyFrom,
  onClearCopy,
  onSetType,
  onRemove,
}: FloorRowActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  if (isConfirming) {
    return (
      <span
        role="alert"
        className="flex shrink-0 items-center gap-1"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="text-xs font-semibold text-danger-ink">Çizim silinecek</span>
        <button
          type="button"
          onClick={() => setIsConfirming(false)}
          className={`${chromeButtonVariants()} h-7 px-2 text-xs ${FLOOR_FOCUS_RING}`}
        >
          {/* "İptal" DEĞİL: pencerenin alt barında zaten bir İptal var ve o
              bütün oturumu atıyor. İki farklı anlam aynı kelimeyi taşımamalı. */}
          Vazgeç
        </button>
        {/* ⚠️ `chromeButtonVariants` KULLANILMIYOR: onun `plain` tonundaki
            `hover:bg-surface-sunken` kırmızı dolgunun üstüne binip düğmeyi koyu
            temada yüzeye gömüyordu. Hover kırmızının KOYUSU (`danger-strong`). */}
        <button
          type="button"
          onClick={() => {
            setIsConfirming(false)
            onRemove()
          }}
          aria-label={`${floor.name} silmeyi onayla`}
          className={`inline-flex h-7 items-center justify-center rounded-md bg-danger px-2 text-xs font-medium text-surface transition-colors hover:bg-danger-strong ${FLOOR_FOCUS_RING}`}
        >
          Sil
        </button>
      </span>
    )
  }

  const currentType = getFloorType(floor)
  const assignable = FLOOR_TYPES.filter((type) => canAssignFloorType(floors, floor.id, type))
  // Hiçbir tip verilemiyorsa ve katın tipi de yoksa menü boş kalırdı.
  const hasTypeMenu = assignable.length > 0 || currentType !== null

  return (
    <span className="flex shrink-0 items-center" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={onCopyFrom}
        aria-label={`${floor.name} kattan kopyala`}
        title="Bu kattan kopyala"
        className={`${chromeButtonVariants({ shape: 'icon' })} ${FLOOR_FOCUS_RING}`}
      >
        <Copy size={15} strokeWidth={1.8} aria-hidden />
      </button>

      {floor.pendingCopy !== null && (
        <button
          type="button"
          onClick={onClearCopy}
          aria-label={`${floor.name} bekleyen kopyayı kaldır`}
          title="Bekleyen kopyayı kaldır"
          className={`${chromeButtonVariants({ shape: 'icon' })} text-brand ${FLOOR_FOCUS_RING}`}
        >
          <CornerUpLeft size={15} strokeWidth={1.8} aria-hidden />
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          if (hasContent) setIsConfirming(true)
          else onRemove()
        }}
        disabled={!isRemovable}
        title={isRemovable ? undefined : 'Projede en az bir kat kalmalı'}
        aria-label={`${floor.name} sil`}
        className={`${chromeButtonVariants({ shape: 'icon' })} enabled:hover:text-danger ${FLOOR_FOCUS_RING}`}
      >
        <Trash2 size={15} strokeWidth={1.8} aria-hidden />
      </button>

      {hasTypeMenu && (
        <FloorMenu
          label={`${floor.name} kat tipi`}
          align="right"
          widthClass="w-48"
          triggerClassName={chromeButtonVariants({ shape: 'icon' })}
          trigger={<MoreHorizontal size={16} strokeWidth={1.8} aria-hidden />}
        >
          {(close) => (
            <>
              <FloorMenuItem
                isDisabled={currentType === null}
                onSelect={() => {
                  onSetType(null)
                  close()
                }}
              >
                Kat tipi yok
              </FloorMenuItem>
              {assignable.map((type) => (
                <FloorMenuItem
                  key={type}
                  isDisabled={currentType === type}
                  onSelect={() => {
                    onSetType(type)
                    close()
                  }}
                >
                  {FLOOR_TYPE_LABELS[type]}
                </FloorMenuItem>
              ))}
            </>
          )}
        </FloorMenu>
      )}
    </span>
  )
}
