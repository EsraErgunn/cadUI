import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Vitest yapılandırması burada duruyor: ayrı vitest.config.ts açılırsa
// react/tailwind eklentileri testlere uygulanmaz ve JSX derlenmez.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  css: {
    // Boş nesne = "config dosyası arama, eklenti yok".
    // Üst klasördeki postcss.config.js'in bulunmasını engeller.
    postcss: {},
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
