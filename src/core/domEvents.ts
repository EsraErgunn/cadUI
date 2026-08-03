/**
 * Kimlikler core'da çünkü hem ui/ hem scene/ okuyacak; eslint ui/ ↔ scene/
 * importunu engelliyor, ortak nokta core (tools.ts ile aynı gerekçe).
 */

/**
 * İmleç bir metin girişinde mi? Klavye kısayolları (Esc, Delete, Ctrl+Z)
 * kullanıcı yazı yazarken tetiklenmemeli.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}
