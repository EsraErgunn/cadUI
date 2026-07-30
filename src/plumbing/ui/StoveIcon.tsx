import { forwardRef, type SVGProps } from 'react'

/**
 * lucide'da 4 gözlü ocak (kare + dolu daireler) karşılığı yok; lucide'ın kendi
 * çizim kalıbına (24x24, currentColor, size/strokeWidth prop'ları) uyan özel ikon.
 * Record<InstallationToolId, LucideIcon> tipine LucideIcon gibi geçer.
 */
export const StoveIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement> & { size?: string | number }>(
  ({ size = 24, strokeWidth = 2, ...rest }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="2.1" fill="currentColor" stroke="none" />
    </svg>
  ),
)

StoveIcon.displayName = 'StoveIcon'
