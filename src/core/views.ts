export type ViewDefinition = {
  id: string
  label: string
}

/**
 * Sahne seçicideki görünümler. İlk ikisi ÇİZİM görünümü (tuvale çizilir),
 * kalan ikisi salt OKUMA: katı model çizimin 3B türevi, izometrik hâlâ yazılmadı.
 */
export const EDITOR_VIEWS = [
  { id: 'architecture', label: 'Mimari Tasarım' },
  { id: 'installation', label: 'Tesisat Tasarımı' },
  { id: 'solid', label: 'Katı Model' },
  { id: 'isometric', label: 'İzometrik Görünüm' },
] as const satisfies readonly ViewDefinition[]

/** Tuvale ÇİZİLEN görünümler — araç paleti, çizim yüzeyi ve ızgara bunlara ait. */
export function isDrawingView(viewId: ViewId): boolean {
  return viewId === 'architecture' || viewId === 'installation'
}

export type ViewId = (typeof EDITOR_VIEWS)[number]['id']

export const DEFAULT_VIEW_ID: ViewId = 'architecture'

export function getViewLabel(viewId: ViewId): string {
  const view = EDITOR_VIEWS.find((candidate) => candidate.id === viewId)
  return view?.label ?? ''
}
