import { FieldFrame, type FieldLayout } from './FieldFrame'
import { Switch } from './Switch'

interface SwitchFieldProps {
  id: string
  label: string
  labelNote?: string
  value: boolean
  hint?: string
  isDisabled?: boolean
  layout?: FieldLayout
  onChange: (value: boolean) => void
}

/**
 * Etiketli anahtar. `<label htmlFor>` bir düğmeye de bağlanabilir (button
 * etiketlenebilir bir öğedir), bu yüzden diğer alanlarla aynı iskeleti ve aynı
 * dikey ritmi paylaşabiliyor.
 */
export function SwitchField({
  id,
  label,
  labelNote,
  value,
  hint,
  isDisabled = false,
  layout,
  onChange,
}: SwitchFieldProps) {
  return (
    <FieldFrame id={id} label={label} labelNote={labelNote} hint={hint} layout={layout}>
      {/* Kap `flex`: anahtar sütunun tamamına yayılmasın, kendi boyunda kalsın. */}
      <div className="flex">
        <Switch id={id} value={value} isDisabled={isDisabled} onChange={onChange} />
      </div>
    </FieldFrame>
  )
}
