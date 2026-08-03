import { HEATING_TYPE_LABELS, type HeatingType } from '../../../api/projects'
import { adminBadgeVariants } from '../adminVariants'

/** Bkz. `ProjectTypeBadge`: bilinmeyen kod etiketsiz değil, ham hâliyle çıkar. */
const HEATING_TYPE_LABEL_LOOKUP: Record<string, string> = HEATING_TYPE_LABELS

/** Isınma tipi de sunucu tarafında genişleyebilir; `ProjectTypeCode` ile aynı gerekçe. */
type HeatingTypeCode = HeatingType | (string & {})

interface HeatingTypeBadgeProps {
  value: HeatingTypeCode
}

export function HeatingTypeBadge({ value }: HeatingTypeBadgeProps) {
  return (
    <span className={adminBadgeVariants({ className: 'px-2' })}>
      {HEATING_TYPE_LABEL_LOOKUP[value] ?? value}
    </span>
  )
}
