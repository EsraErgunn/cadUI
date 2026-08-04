import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'

import { FieldFrame } from './FieldFrame'
import { buildFieldAria } from './fieldAria'
import { adminFieldVariants, stepperButtonVariants } from '../adminVariants'

const DEFAULT_MIN = 0
const DEFAULT_STEP = 1

/**
 * Elle yazarken kabul edilen ara biçimler. Yarım kalan giriş de geçer ("12," gibi),
 * yoksa kullanıcı ondalık basamağı hiç yazamazdı. Eksi işareti ikisinde de yok:
 * negatif değer sonradan düzeltilmez, baştan girilemez.
 */
const INTEGER_DRAFT_PATTERN = /^\d*$/
const DECIMAL_DRAFT_PATTERN = /^\d*[.,]?\d*$/

/** Baştaki sıfırlar: alanlar 0 ile açtığı için yazılan her değer "012" görünürdü. */
const LEADING_ZEROS_PATTERN = /^0+(?=\d)/

interface NumberStepperFieldProps {
  id: string
  label: string
  labelNote?: string
  value: number
  /** Varsayılan 0: formdaki sayısal alanların hiçbiri negatif olamaz. */
  min?: number
  /** Verilirse değer bu tavanı aşamaz; aşan giriş anında tavana çekilir. */
  max?: number
  step?: number
  /** Sayılabilir alanlarda (daire/işyeri adedi) ondalık ayraç hiç yazılamaz. */
  isInteger?: boolean
  /** Girdinin sağında görünen birim: m², m³/h, mbar. */
  unit?: string
  hint?: string
  error?: string
  isDisabled?: boolean
  onChange: (value: number) => void
}

/** Yarım kalan taslak (boş alan, tek ayraç) sayı değil: `null` döner. */
function parseDraft(raw: string): number | null {
  if (raw.trim() === '') return null
  const parsed = Number(raw.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Sayısal alan + alt alta duran artır/azalt okları. Değer okların yanında
 * doğrudan klavyeyle de yazılabilir.
 *
 * Girdi native `type="number"` DEĞİL, metin girdisi + `role="spinbutton"`:
 * sayı girdisinde tarayıcı geçersiz ara giriş için ("-", "1e", çift ayraç) boş
 * dize veriyor, yani "kullanıcı alanı boşalttı" ile "geçersiz karakter yazdı"
 * ayırt edilemiyordu; ondalık ayracı da tarayıcı yereline göre değişiyordu.
 * Metin girdisinde ham metin elimizde olduğu için kural tek yerde ve her
 * tarayıcıda aynı.
 *
 * Ok tuşları da native davranışa bırakılmaz, `onKeyDown`'da ele alınır: sınırı
 * tek bir yerde (`clamp`) uygulamak klavye ile düğmenin ayrışmasını engelliyor.
 */
export function NumberStepperField({
  id,
  label,
  labelNote,
  value,
  min = DEFAULT_MIN,
  max,
  step = DEFAULT_STEP,
  isInteger = false,
  unit,
  hint,
  error,
  isDisabled = false,
  onChange,
}: NumberStepperFieldProps) {
  // Yazım sırasında alan geçici olarak boş ya da yarım kalabilmeli; bu ara biçim
  // sayı olarak tutulamadığı için ayrı bir taslak dizede durur. Taslak yalnız
  // odak süresince yaşar, blur'da düşer ve alan yine değerden beslenir.
  const [draft, setDraft] = useState<string | null>(null)

  const clamp = (next: number): number => {
    const atLeastMin = Math.max(next, min)
    return max === undefined ? atLeastMin : Math.min(atLeastMin, max)
  }
  const isAtMin = value <= min
  const isAtMax = max !== undefined && value >= max
  const displayValue = draft ?? String(value)

  const applyStep = (delta: number) => {
    // Taslak düşürülmezse ok tuşuyla değişen değer ekranda görünmezdi.
    setDraft(null)
    onChange(clamp(value + delta))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

    event.preventDefault()
    applyStep(event.key === 'ArrowUp' ? step : -step)
  }

  const handleInput = (raw: string) => {
    const pattern = isInteger ? INTEGER_DRAFT_PATTERN : DECIMAL_DRAFT_PATTERN
    // Kabul edilmeyen karakter alanı hiç değiştirmez: yazılanı sessizce
    // düzeltmek yerine girdirmemek, kullanıcıya sınırı anında gösteriyor.
    if (!pattern.test(raw)) return

    const next = raw.replace(LEADING_ZEROS_PATTERN, '')
    const parsed = parseDraft(next)
    if (parsed === null) {
      setDraft(next)
      return
    }

    // Sınırı aşan giriş ANINDA sınıra çekilir; taslakta olduğu gibi kalsaydı
    // ekrandaki sayı ile formdaki değer ayrışırdı.
    const bounded = clamp(parsed)
    setDraft(bounded === parsed ? next : String(bounded))
    onChange(bounded)
  }

  const handleBlur = () => {
    if (draft === null) return

    setDraft(null)
    // Alan boş bırakılıp çıkıldıysa değer alt sınıra döner; ekranda görünen ile
    // formdaki değer ayrışmasın.
    if (parseDraft(draft) === null) onChange(min)
  }

  return (
    <FieldFrame id={id} label={label} labelNote={labelNote} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="spinbutton"
          inputMode={isInteger ? 'numeric' : 'decimal'}
          autoComplete="off"
          value={displayValue}
          // Taslak yazılırken bile ekran okuyucu FORMDAKİ değeri duyurur.
          aria-valuenow={value}
          aria-valuemin={min}
          aria-valuemax={max}
          disabled={isDisabled}
          onKeyDown={handleKeyDown}
          onChange={(event) => handleInput(event.target.value)}
          onBlur={handleBlur}
          {...buildFieldAria(id, { hint, error })}
          className={adminFieldVariants({
            tone: error === undefined ? 'plain' : 'invalid',
            // Sağ boşluk okların ve birimin yerini açar.
            className: 'w-full pr-16',
          })}
        />

        {unit !== undefined && (
          <span
            aria-hidden
            className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 text-xs text-ink-muted"
          >
            {unit}
          </span>
        )}

        {/* Oklar sekme sırasının DIŞINDA (tabIndex -1): aynı işi yukarı/aşağı ok
            tuşları zaten yapıyor. Fare kullanıcısı için görünür, klavye için
            gürültü değil. */}
        <div className="absolute right-px top-px flex h-[calc(100%-2px)] w-7 flex-col overflow-hidden rounded-r-lg border-l border-edge">
          <button
            type="button"
            tabIndex={-1}
            disabled={isDisabled || isAtMax}
            aria-label={`${label} değerini artır`}
            onClick={() => applyStep(step)}
            className={stepperButtonVariants()}
          >
            <ChevronUp aria-hidden className="size-3.5" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={isDisabled || isAtMin}
            aria-label={`${label} değerini azalt`}
            onClick={() => applyStep(-step)}
            className={stepperButtonVariants({ className: 'border-t border-edge' })}
          >
            <ChevronDown aria-hidden className="size-3.5" />
          </button>
        </div>
      </div>
    </FieldFrame>
  )
}
