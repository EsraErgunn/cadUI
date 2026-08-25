import { useCallback, useRef, useState } from 'react'

import { partitionDocumentFiles, type RejectedFile } from './documentFiles'
import type { DocumentUpload, DocumentUploadSource } from '../../../api/documents'

export const MISSING_TYPE_MESSAGE = 'Evrak tipi seçilmeden kayıt tamamlanamaz.'
export const MISSING_UNIT_MESSAGE = 'En az bir birim seçilmelidir.'

export interface UploadRow {
  /** React anahtarı ve satır kimliği. Dosya adı benzersiz değil: kullanıcı aynı
      adlı dosyayı iki kez ekleyebilir ve biri silinince yanlış satır düşerdi. */
  key: number
  source: DocumentUploadSource
  fileName: string
  docTypeCodeId: number | null
  unitIds: number[]
}

export interface UploadRowErrors {
  docType?: string
  units?: string
}

export interface DocumentUploadState {
  rows: UploadRow[]
  rejected: RejectedFile[]
  /** Satır anahtarı → alan hataları. "Kaydet"e basılana kadar boş. */
  errors: Map<number, UploadRowErrors>
  addFiles: (files: File[]) => void
  /** "Proje Evrakları" sekmesinden yeniden ilişkilendirme (gereksinim 7). */
  /** Aynı evrağın iki kez eklenmesini engellemek için: sekme düğmesi pasifleşir. */
  removeRow: (key: number) => void
  setRowType: (key: number, docTypeCodeId: number | null) => void
  setRowUnits: (key: number, unitIds: number[]) => void
  dismissRejections: () => void
  /** Doğrulama geçerse yükleme listesini döndürür, geçmezse `null` yazıp
      hataları ekrana basar. */
  collectValidUploads: () => DocumentUpload[] | null
}

function validateRow(row: UploadRow): UploadRowErrors {
  const errors: UploadRowErrors = {}
  if (row.docTypeCodeId === null) errors.docType = MISSING_TYPE_MESSAGE
  if (row.unitIds.length === 0) errors.units = MISSING_UNIT_MESSAGE
  return errors
}

/**
 * Evrak Ekle ekranının durumu. Dosyalar `File` nesnesi olarak bellekte tutulur
 * ve sunucuya gitmez — kalıcılık uç + veritabanı işi.
 */
export function useDocumentUpload(): DocumentUploadState {
  const [rows, setRows] = useState<UploadRow[]>([])
  const [rejected, setRejected] = useState<RejectedFile[]>([])
  const [errors, setErrors] = useState<Map<number, UploadRowErrors>>(new Map())
  // Artan sayaç: `crypto.randomUUID` yerine, id şeması kuralıyla aynı gerekçe.
  const nextKey = useRef(1)

  const addFiles = useCallback((files: File[]) => {
    const { accepted, rejected: refused } = partitionDocumentFiles(files)

    setRejected(refused)
    if (accepted.length === 0) return

    setRows((current) => [
      ...current,
      ...accepted.map((file) => {
        const row: UploadRow = {
          key: nextKey.current,
          source: { kind: 'file', file },
          fileName: file.name,
          docTypeCodeId: null,
          unitIds: [],
        }
        nextKey.current += 1
        return row
      }),
    ])
  }, [])

  const removeRow = useCallback((key: number) => {
    setRows((current) => current.filter((row) => row.key !== key))
    // Satır gidince hatası da gitmeli: kalsaydı ekranda sahibi olmayan bir
    // hata mesajı asılı kalırdı.
    setErrors((current) => {
      if (!current.has(key)) return current
      const next = new Map(current)
      next.delete(key)
      return next
    })
  }, [])

  const setRowType = useCallback((key: number, docTypeCodeId: number | null) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, docTypeCodeId } : row)),
    )
  }, [])

  const setRowUnits = useCallback((key: number, unitIds: number[]) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, unitIds } : row)))
  }, [])

  const dismissRejections = useCallback(() => setRejected([]), [])

  const collectValidUploads = useCallback((): DocumentUpload[] | null => {
    const found = new Map<number, UploadRowErrors>()

    for (const row of rows) {
      const rowErrors = validateRow(row)
      if (Object.keys(rowErrors).length > 0) found.set(row.key, rowErrors)
    }

    setErrors(found)
    if (found.size > 0 || rows.length === 0) return null

    return rows.map((row) => ({
      source: row.source,
      // Doğrulama geçtiyse tip seçilmiştir; tip sistemi bunu göremediği için
      // burada daraltılıyor.
      docTypeCodeId: row.docTypeCodeId ?? 0,
      unitIds: row.unitIds,
    }))
  }, [rows])

  return {
    rows,
    rejected,
    errors,
    addFiles,
    removeRow,
    setRowType,
    setRowUnits,
    dismissRejections,
    collectValidUploads,
  }
}
