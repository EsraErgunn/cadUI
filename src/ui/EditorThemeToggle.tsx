import { Moon, Sun } from 'lucide-react'

import { toolButtonVariants } from './controls/buttonVariants'
import { useTheme } from './useTheme'

/** Palet altındaki tema düğmesi: kısayol ipucunun yanında, editörün İÇİNDEN
    de açık/koyu tema değiştirilebilsin diye (K177'nin editöre uzanan hâli).
    Aynı `useTheme` modülünü sol menüdeki düğmeyle (`ui/admin/AdminSidebar`)
    paylaşır — ikisi de aynı `localStorage` anahtarını okur/yazar. */
export function EditorThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Temayı değiştir"
      aria-pressed={theme === 'dark'}
      className={toolButtonVariants()}
    >
      {theme === 'dark' ? (
        <Sun size={18} strokeWidth={1.7} aria-hidden />
      ) : (
        <Moon size={18} strokeWidth={1.7} aria-hidden />
      )}
    </button>
  )
}
