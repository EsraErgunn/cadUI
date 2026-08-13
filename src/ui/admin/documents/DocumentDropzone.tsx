import { FileUp, Upload } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'

import { adminButtonVariants } from '../adminVariants'
import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  DOCUMENT_ACCEPT_ATTRIBUTE,
  MAX_DOCUMENT_SIZE_MB,
} from './documentFiles'

const DROP_HINT = 'Dosyaları buraya sürükleyip bırakın'
const FORMAT_HINT = `Lütfen ${ACCEPTED_DOCUMENT_EXTENSIONS.join(', ')} formatında doküman yükleyiniz!`
const SIZE_HINT = `Maksimum dosya boyutu ${MAX_DOCUMENT_SIZE_MB} MB olmalıdır!`

interface DocumentDropzoneProps {
  onFilesSelected: (files: File[]) => void
}

/**
 * "Dosya Seç" düğmesi ve sürükle-bırak alanı BİRLİKTE (gereksinim 8). Alanın
 * kendisi odaklanabilir değil: sürükleme klavyeyle yapılamıyor, aynı işi yapan
 * erişilebilir yol düğme. Bu yüzden düğme alanın dışında ve gerçek bir
 * `<button>`.
 */
export function DocumentDropzone({ onFilesSelected }: DocumentDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragActive(false)
    onFilesSelected([...event.dataTransfer.files])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={adminButtonVariants({ tone: 'primary' })}
        >
          <FileUp aria-hidden className="size-4" />
          Dosya Seç
        </button>
        <span className="text-sm text-ink-muted">veya</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={DOCUMENT_ACCEPT_ATTRIBUTE}
        aria-label="Yüklenecek dosyaları seçin"
        className="sr-only"
        onChange={(event) => {
          onFilesSelected([...(event.target.files ?? [])])
          // Aynı dosya art arda iki kez seçilebilsin: değer sıfırlanmazsa
          // ikinci seçim `change` olayını hiç doğurmaz.
          event.target.value = ''
        }}
      />

      <div
        onDragOver={(event) => {
          // Varsayılan davranış engellenmezse tarayıcı dosyayı SAYFA olarak açar
          // ve uygulamadan çıkılır.
          event.preventDefault()
          setIsDragActive(true)
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-10
                    text-center text-sm transition-colors ${
                      isDragActive ? 'border-accent bg-surface-sunken' : 'border-edge bg-surface'
                    }`}
      >
        <Upload aria-hidden className="size-6 text-ink-disabled" />
        <p className="font-semibold text-ink">{DROP_HINT}</p>
        <p className="text-ink-muted">{FORMAT_HINT}</p>
        <p className="text-xs text-ink-muted">{SIZE_HINT}</p>
      </div>
    </div>
  )
}
