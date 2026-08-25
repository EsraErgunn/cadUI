import { floorContentDotVariants } from './floorVariants'
import type { FloorContent } from '../../core/floorContent'

/** Ekran okuyucu glifi göremez; içerik durumu metne de çevrilir. */
function describe(content: FloorContent): string {
  if (content.hasArchitecture && content.hasInstallation) return 'Mimari ve tesisat'
  if (content.hasArchitecture) return 'Yalnız mimari'
  if (content.hasInstallation) return 'Yalnız tesisat'
  return 'Boş'
}

export function FloorContentDot({ content }: { content: FloorContent }) {
  const filled = Number(content.hasArchitecture) + Number(content.hasInstallation)
  const tone = filled === 2 ? 'full' : filled === 1 ? 'partial' : 'empty'
  const label = describe(content)

  return <span title={label} aria-label={label} className={floorContentDotVariants({ tone })} />
}
