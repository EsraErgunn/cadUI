import { beforeEach, describe, expect, it, vi } from 'vitest'

/* Tema modül durumu import anında localStorage'ı okuyor; her senaryo temiz bir
   modül örneği isteyecek. */
async function loadThemeModule() {
  vi.resetModules()
  return import('../useTheme')
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('useTheme', () => {
  it('kayıt yoksa açık temayla başlar', async () => {
    const { initTheme } = await loadThemeModule()
    initTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('kayıtlı koyu temayı ilk uygulamada geri yükler', async () => {
    localStorage.setItem('starcad.theme', 'dark')
    const { initTheme } = await loadThemeModule()
    initTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('geçiş hem kök class hem localStorage yazar', async () => {
    const { toggleTheme } = await loadThemeModule()

    toggleTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('starcad.theme')).toBe('dark')

    toggleTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('starcad.theme')).toBe('light')
  })

  it('bilinmeyen kayıt değeri açık temaya düşer', async () => {
    localStorage.setItem('starcad.theme', 'sepia')
    const { initTheme } = await loadThemeModule()
    initTheme()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
