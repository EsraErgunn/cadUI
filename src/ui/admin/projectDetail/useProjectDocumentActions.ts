import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import type { ProjectDocumentActions } from './ProjectDocumentsTab'
import {
  deleteDocument,
  linkDocumentToUnit,
  unlinkDocumentFromUnit,
} from '../../../api/documents'
import { ApiError } from '../../../api/http'

/**
 * Düzenlenebilir evrağın gerektirdiği EN AZ alan. İki ekran da bu şekli
 * karşılıyor: proje detayının `ProjectDocumentRow`'u ve Evrak Ekle ekranının
 * `DocumentRow`'u. Tam satır tipine bağlanmak, aynı işi yapan ikinci bir
 * diyalog ve ikinci bir hook doğururdu.
 */
export interface EditableDocument {
  id: number
  fileName: string
  unitIds: number[]
}

const MESSAGES = {
  deleted: 'Evrak silindi.',
  unitChanged: 'Evrağın birimi güncellendi.',
  deleteFailed: 'Evrak silinemedi. Bağlantınızı kontrol edip tekrar deneyin.',
  unitFailed: 'Evrağın birimi değiştirilemedi. Bağlantınızı kontrol edip tekrar deneyin.',
} as const

/** Sunucunun kendi metni varsa o gösterilir; yoksa genel cümleye inilir. */
function describeError(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message !== '' ? error.message : fallback
}

/**
 * Proje detayındaki evrak sekmesinin işleri: SİLME ve BİRİM DEĞİŞTİRME.
 *
 * Yükleme burada YOK — o kendi ekranında (`/admin/documents/new?project=`).
 *
 * "Birimi değiştir" diye tek bir uç yok: sunucuda bağ ekleme ve koparma ayrı
 * (`POST|DELETE /api/docs/{id}/units/{unitId}`). Sıra ÖNEMLİ — önce yeni bağ
 * kuruluyor, sonra eskiler koparılıyor: ters sırada, araya düşen bir hata
 * evrağı hiçbir birime bağlı olmayan bir hâlde bırakırdı.
 */
export function useProjectDocumentActions(projectId: number): ProjectDocumentActions {
  const queryClient = useQueryClient()

  const [pendingDocumentId, setPendingDocumentId] = useState<number | null>(null)
  const [notice, setNotice] = useState<ProjectDocumentActions['notice']>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [unitTarget, setUnitTarget] = useState<EditableDocument | null>(null)
  const [unitError, setUnitError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    // Aynı kaydı gösteren ÜÇ yüzey var: proje detayının evrak sekmesi, Evrak
    // Ekle ekranındaki "Proje Evrakları" listesi ve Evraklar liste ekranı.
    void queryClient.invalidateQueries({ queryKey: ['projectDocuments', projectId] })
    void queryClient.invalidateQueries({ queryKey: ['projectDocumentPicker', projectId] })
    void queryClient.invalidateQueries({ queryKey: ['documents'] })
  }, [projectId, queryClient])

  const confirmDelete = useCallback(() => {
    if (deleteTargetId === null) return
    const documentId = deleteTargetId

    setPendingDocumentId(documentId)
    setNotice(null)

    void (async () => {
      try {
        await deleteDocument(documentId)
        setDeleteTargetId(null)
        setNotice({ tone: 'success', message: MESSAGES.deleted })
        refresh()
      } catch (error) {
        setDeleteTargetId(null)
        setNotice({ tone: 'error', message: describeError(error, MESSAGES.deleteFailed) })
      } finally {
        setPendingDocumentId(null)
      }
    })()
  }, [deleteTargetId, refresh])

  const confirmUnitChange = useCallback(
    (unitId: number) => {
      if (unitTarget === null) return
      const document = unitTarget
      const staleUnitIds = document.unitIds.filter((id) => id !== unitId)

      // Zaten TEK bağı seçilen birimse istek atmanın karşılığı yok.
      if (staleUnitIds.length === 0 && document.unitIds.includes(unitId)) {
        setUnitTarget(null)
        return
      }

      setPendingDocumentId(document.id)
      setUnitError(null)

      void (async () => {
        try {
          if (!document.unitIds.includes(unitId)) {
            await linkDocumentToUnit(document.id, unitId)
          }
          for (const staleUnitId of staleUnitIds) {
            await unlinkDocumentFromUnit(document.id, staleUnitId)
          }

          setUnitTarget(null)
          setNotice({ tone: 'success', message: MESSAGES.unitChanged })
          refresh()
        } catch (error) {
          // Diyalog AÇIK kalıyor: kullanıcı seçimini kaybetmeden tekrar denesin.
          setUnitError(describeError(error, MESSAGES.unitFailed))
        } finally {
          setPendingDocumentId(null)
        }
      })()
    },
    [refresh, unitTarget],
  )

  return {
    pendingDocumentId,
    notice,
    dismissNotice: useCallback(() => setNotice(null), []),

    deleteTargetId,
    requestDelete: useCallback((documentId: number) => setDeleteTargetId(documentId), []),
    cancelDelete: useCallback(() => setDeleteTargetId(null), []),
    confirmDelete,

    unitTarget,
    unitError,
    dismissUnitError: useCallback(() => setUnitError(null), []),
    requestUnitChange: useCallback((document: EditableDocument) => {
      setUnitError(null)
      setUnitTarget(document)
    }, []),
    cancelUnitChange: useCallback(() => setUnitTarget(null), []),
    confirmUnitChange,
  }
}
