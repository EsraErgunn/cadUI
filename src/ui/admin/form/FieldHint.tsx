interface FieldHintProps {
  id: string
  children: string
}

/** Alanın altındaki küçük açıklama. `aria-describedby` ile girdiye bağlanır. */
export function FieldHint({ id, children }: FieldHintProps) {
  return (
    <p id={id} className="text-xs text-ink-muted">
      {children}
    </p>
  )
}
