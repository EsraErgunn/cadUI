const LABEL = 'Yakında'

/**
 * Ekranı henüz yazılmamış bağlantının rozeti. Bağlantı ÇALIŞIR (hedefte
 * karşılama sayfası var); rozet tıklamadan önce beklentiyi kurar ve metin
 * olduğu için erişilebilir adın parçası olarak ekran okuyucuya da ulaşır —
 * yalnız renkle verilseydi ulaşmazdı.
 */
export function ComingSoonBadge() {
  return (
    <span className="shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-ink-muted">
      {LABEL}
    </span>
  )
}
