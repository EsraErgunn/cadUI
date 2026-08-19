import { History } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { VersionLoadConfirmDialog } from './VersionLoadConfirmDialog'
import { VersionRow } from './VersionRow'
import { useProjectVersions } from './useProjectVersions'
import { formatVersionEntry } from './versionFormat'
import type { ProjectVersionListItem } from '../../api/projects'
import type { Id } from '../../core/model'
import { selectIsProjectDirty, useCadStore } from '../../store/cadStore'
import { EDITOR_BAR_PANEL, editorBarButtonVariants } from '../menu/editorBarVariants'

export type VersionHistorySource = {
  projectId: Id | undefined
  /** Editörde açık olan sürüm; listede işaretlenir ve listeyi tazeler. */
  currentVersionId: Id | undefined
  onLoadVersion: (versionId: Id) => Promise<void>
}

/**
 * Kayıt geçmişi — K90'da bilerek pasif bırakılan düğmenin arkası. WebCAD'deki
 * gibi düğmenin ALTINDAN açılan liste (K109): kayıtlar tarih + saat, etiketli
 * olanlar ayraçtan sonra adıyla. Satır seçilince o sürümün çizimi MinIO'dan
 * çekilip editöre yüklenir.
 *
 * Açık/kapalı durumu BURADA: paneli kapatan tek şey kullanıcının kendisi ve
 * dışarıdaki hiçbir ekran parçası bu bilgiye ihtiyaç duymuyor — yüzen liste
 * tuvalin üstüne biniyor, kimsenin yerini daraltmıyor.
 */
export function VersionHistoryMenu({
  projectId,
  currentVersionId,
  onLoadVersion,
}: VersionHistorySource) {
  const [isOpen, setIsOpen] = useState(false)
  const isDirty = useCadStore(selectIsProjectDirty)
  const { versions, isLoading, error } = useProjectVersions(projectId, isOpen, currentVersionId)
  const [pendingVersion, setPendingVersion] = useState<ProjectVersionListItem | undefined>(undefined)
  const [loadingVersionId, setLoadingVersionId] = useState<Id | undefined>(undefined)
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    // Kapsam düğmeyi DE içeriyor: dışarıda bıraksaydık pointerdown listeyi
    // kapatır, hemen ardından düğmenin kendi click'i yeniden açardı (MenuBar'da
    // da aynı gerekçe).
    const handlePointerDown = (event: PointerEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return
      setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const runLoad = async (version: ProjectVersionListItem) => {
    setPendingVersion(undefined)
    setLoadingVersionId(version.id)
    try {
      await onLoadVersion(version.id)
      // Liste ancak yükleme bitince kapanıyor: kullanıcı hangi kaydı seçtiğini
      // işlem sürerken de görüyor.
      setIsOpen(false)
    } finally {
      // Hata mesajını üst bar gösteriyor (useProjectPersistence.error); burada
      // yalnız satırın "Yükleniyor…" hâli asılı kalmamalı.
      setLoadingVersionId(undefined)
    }
  }

  const handleSelect = (version: ProjectVersionListItem) => {
    // Temizken sorulacak bir şey yok: aynı çizim sunucuda zaten duruyor.
    if (isDirty) setPendingVersion(version)
    else void runLoad(version)
  }

  return (
    <div ref={anchorRef} className="relative">
      {/* Kaydet'in AÇILIRI değil, yanındaki ayrı düğme: kayıt geçmişi
          kaydetmenin bir çeşidi değil, geçmişe bakmak. */}
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Kayıt Geçmişi"
        aria-label="Kayıt Geçmişi"
        className={editorBarButtonVariants({ tone: isOpen ? 'active' : 'card', shape: 'icon' })}
      >
        <History size={16} strokeWidth={1.8} aria-hidden />
      </button>

      {isOpen && (
        <div
          aria-label="Kayıt geçmişi"
          className={`${EDITOR_BAR_PANEL} absolute right-0 top-full z-20 mt-1 flex max-h-[60vh] w-72 flex-col overflow-y-auto rounded-lg py-1 shadow-lg`}
        >
          {error === undefined ? (
            <p aria-live="polite" className="sr-only">
              {isLoading ? 'Kayıtlar yükleniyor.' : `${versions.length} kayıt listelendi.`}
            </p>
          ) : (
            <p role="alert" className="px-3 py-2 text-sm text-canvas-overlay-danger">
              {error}
            </p>
          )}

          {error === undefined && isLoading && (
            <p className="px-3 py-2 text-sm text-canvas-overlay-ink-muted">Yükleniyor…</p>
          )}

          {error === undefined && !isLoading && versions.length === 0 && (
            <p className="px-3 py-2 text-sm text-canvas-overlay-ink-muted">
              Bu projenin kaydedilmiş sürümü yok. &quot;Kaydet&quot; ilk sürümü oluşturur.
            </p>
          )}

          {error === undefined && !isLoading && versions.length > 0 && (
            <ul>
              {versions.map((version) => (
                <VersionRow
                  key={version.id}
                  version={version}
                  isCurrent={version.id === currentVersionId}
                  isLoading={version.id === loadingVersionId}
                  isDisabled={loadingVersionId !== undefined}
                  onSelect={() => handleSelect(version)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {pendingVersion && (
        <VersionLoadConfirmDialog
          versionTitle={formatVersionEntry(pendingVersion)}
          onCancel={() => setPendingVersion(undefined)}
          onConfirm={() => void runLoad(pendingVersion)}
        />
      )}
    </div>
  )
}
