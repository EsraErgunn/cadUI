import { FolderOpen, PenLine, type LucideIcon } from 'lucide-react'

/**
 * Menü başlıklarının ikonları. `menuDefinitions.ts` saf veri kalsın diye ayrı
 * dosyada — araç ikonlarında da (`tools/toolIcons.ts`) aynı ayrım var.
 */
export const MENU_ICONS: Record<string, LucideIcon> = {
  file: FolderOpen,
  tools: PenLine,
}
