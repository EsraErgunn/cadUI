import type { PlanPoint } from '../core/coords'

export type DrawSurfacePointerEvent = {
  planPoint: PlanPoint
  button: number
  shiftKey: boolean
  ctrlKey: boolean
  altKey: boolean
}

export type DrawSurfaceListener = {
  onPointerDown?: (event: DrawSurfacePointerEvent) => void
  onPointerMove?: (event: DrawSurfacePointerEvent) => void
  onPointerUp?: (event: DrawSurfacePointerEvent) => void
  onContextMenu?: (event: DrawSurfacePointerEvent) => void
  /** Esc — devam eden çizimi iptal etmek isteyen araçlar dinler. */
  onCancel?: () => void
}

export type DrawSurfacePointerEventKey =
  | 'onPointerDown'
  | 'onPointerMove'
  | 'onPointerUp'
  | 'onContextMenu'

const listeners = new Set<DrawSurfaceListener>()

export function subscribeDrawSurface(listener: DrawSurfaceListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function publishDrawSurfaceEvent(
  key: DrawSurfacePointerEventKey,
  event: DrawSurfacePointerEvent,
): void {
  for (const listener of listeners) listener[key]?.(event)
}

export function publishDrawSurfaceCancel(): void {
  for (const listener of listeners) listener.onCancel?.()
}
