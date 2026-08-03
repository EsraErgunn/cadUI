interface EmptyStateProps {
  message: string
}

/** Sonuç yokken gösterilen tek biçim. Tablo gövdesinde de, tablo dışında da aynı
    görünsün diye ayrı bileşen — "boş hücre bırakma" kuralı tek yerden uygulanır. */
export function EmptyState({ message }: EmptyStateProps) {
  return <p className="px-4 py-12 text-center text-ink-muted">{message}</p>
}
