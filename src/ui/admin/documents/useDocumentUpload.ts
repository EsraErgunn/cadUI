import { useCallback, useRef, useState } from 'react'

import { partitionDocumentFiles, type RejectedFile } from './documentFiles'
import type { DocumentRow, DocumentUpload, DocumentUploadSource } from '../../../api/documents'

export const MISSING_TYPE_MESSAGE = 'Evrak tipi seçilmeden kayıt tamamlanamaz.'
export const MISSING_UNIT_MESSAGE = 'En az bir birim seçilmelidir.'

export interface UploadRow {
  /** React anahtarı ve satır kimliği. Dosya adı benzersiz değil: kullanıcı aynı
      adlı dosyayı iki kez ekleyebilir ve biri silinince yanlış satır düşerdi. */
  key: number
  source: DocumentUploadSource
  fileName: string
  docTypeCode: string | null
  unitNames: string[]
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
  addExistingDocument: (document: DocumentRow) => void
  /** Aynı evrağın iki kez eklenmesini engellemek için: sekme düğmesi pasifleşir. */
  hasExistingDocument: (documentId: number) => boolean
  removeRow: (key: number) => void
  setRowType: (key: number, docTypeCode: string | null) => void
  setRowUnits: (key: number, unitNames: string[]) => void
  dismissRejections: () => void
  /** Doğrulama geçerse yükleme listesini döndürür, geçmezse `null` yazıp
      hataları ekrana basar. */
  collectValidUploads: () => DocumentUpload[] | null
}

function validateRow(row: UploadRow): UploadRowErrors {
  const errors: UploadRowErrors = {}
  if (row.docTypeCode === null) errors.docType = MISSING_TYPE_MESSAGE
  if (row.unitNames.length === 0) errors.units = MISSING_UNIT_MESSAGE
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
          docTypeCode: null,
          unitNames: [],
        }
        nextKey.current += 1
        return row
      }),
    ])
  }, [])

  const addExistingDocument = useCallback((document: DocumentRow) => {
    setRows((current) => {
      const isAlreadyAdded = current.some(
        (row) => row.source.kind === 'existing' && row.source.documentId === document.id,
      )
      if (isAlreadyAdded) return current

      const row: UploadRow = {
        key: nextKey.current,
        source: { kind: 'existing', documentId: document.id },
        fileName: document.fileName,
        // Tip kaynağından geliyor ama DEĞİŞTİRİLEBİLİR kalıyor: aynı dosya
        // başka bir tiple yeniden ilişkilendirilebilmeli.
        docTypeCode: document.docTypeCode,
        unitNames: [],
      }
      nextKey.current += 1
      return [...current, row]
    })
  }, [])

  const hasExistingDocument = useCallback(
    (documentId: number) =>
      rows.some((row) => row.source.kind === 'existing' && row.source.documentId === documentId),
    [rows],
  )

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

  const setRowType = useCallback((key: number, docTypeCode: string | null) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, docTypeCode } : row)),
    )
  }, [])

  const setRowUnits = useCallback((key: number, unitNames: string[]) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, unitNames } : row)))
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
      docTypeCode: row.docTypeCode ?? '',
      unitNames: row.unitNames,
    }))
  }, [rows])

  return {
    rows,
    rejected,
    errors,
    addFiles,
    addExistingDocument,
    hasExistingDocument,
    removeRow,
    setRowType,
    setRowUnits,
    dismissRejections,
    collectValidUploads,
  }
}
