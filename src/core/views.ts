export type ViewDefinition = {
  id: string
  label: string
}

/** Issue 2.6: üç görünüm butonu, bu issue'da yalnız Mimari Tasarım aktif. */
export const EDITOR_VIEWS = [
  { id: 'architecture', label: 'Mimari Tasarım' },
  { id: 'installation', label: 'Tesisat Tasarımı' },
  { id: 'isometric', label: 'İzometrik Görünüm' },
] as const satisfies readonly ViewDefinition[]

export type ViewId = (typeof EDITOR_VIEWS)[number]['id']

export const DEFAULT_VIEW_ID: ViewId = 'architecture'

export function getViewLabel(viewId: ViewId): string {
  const view = EDITOR_VIEWS.find((candidate) => candidate.id === viewId)
  return view?.label ?? ''
}
