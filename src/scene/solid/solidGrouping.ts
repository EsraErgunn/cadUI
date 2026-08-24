/**
 * Aynı renge düşen parçaları tek öbekte toplar. Katı model geometriyi RENK
 * BAŞINA birleştiriyor: malzeme geometriye değil mesh'e ait, dolayısıyla iki
 * ayrı renk aynı tampona giremiyor. Sıra korunur — aynı çizim her seferinde
 * aynı öbek listesini üretsin, React anahtarları oynamasın.
 */
export function groupByColorHex<T>(
  items: readonly T[],
  getColorHex: (item: T) => string,
): { colorHex: string; items: T[] }[] {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    const colorHex = getColorHex(item)
    const existing = groups.get(colorHex)
    if (existing) existing.push(item)
    else groups.set(colorHex, [item])
  }

  return [...groups.entries()].map(([colorHex, grouped]) => ({ colorHex, items: grouped }))
}
