import type { PlanPoint } from './coords'
import type { PlanBounds } from './viewport'

/**
 * Hata satırındaki "göster" tek bir sembolü de bütün bir güzergâhı da
 * gösterebilmeli. Pay olmadan `fitToBounds` tek noktada sıfır genişlikli bir
 * kutu görür ve varsayılan ölçeğe düşerdi; payla birlikte eleman ekranın
 * ortasına, çevresi de görünecek kadar geniş oturuyor.
 */
export const FOCUS_PADDING_CM = 150

export function getBoundsAround(
  targets: readonly PlanPoint[],
  paddingCm = FOCUS_PADDING_CM,
): PlanBounds | undefined {
  if (targets.length === 0) return undefined

  let minXCm = Infinity
  let minYCm = Infinity
  let maxXCm = -Infinity
  let maxYCm = -Infinity

  for (const target of targets) {
    minXCm = Math.min(minXCm, target.x)
    minYCm = Math.min(minYCm, target.y)
    maxXCm = Math.max(maxXCm, target.x)
    maxYCm = Math.max(maxYCm, target.y)
  }

  return {
    minXCm: minXCm - paddingCm,
    minYCm: minYCm - paddingCm,
    maxXCm: maxXCm + paddingCm,
    maxYCm: maxYCm + paddingCm,
  }
}
