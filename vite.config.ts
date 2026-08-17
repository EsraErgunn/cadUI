import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vitest/config'

// Vitest yapılandırması burada duruyor: ayrı vitest.config.ts açılırsa
// react/tailwind eklentileri testlere uygulanmaz ve JSX derlenmez.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] }),
    // Bundle analizi: yalnız `vite build --mode analyze` ile devreye girer,
    // normal build ve test koşularında hiç yüklenmez.
    ...(mode === 'analyze'
      ? [visualizer({ open: true, gzipSize: true, brotliSize: true, filename: 'stats.html' })]
      : []),
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
    /**
     * Paralel worker sayısı bilerek SINIRLI. Vitest varsayılanı çekirdek sayısı
     * kadar worker açıyor; her biri kendi jsdom ortamını kurduğu için (suite'in
     * en pahalı kalemi) geliştirme makinesinde — üstelik yanında docker'da SQL
     * Server koşarken — işlemci doluyor ve `waitFor` bekleyen testler kod
     * değişmeden rastgele zaman aşımına düşüyordu.
     *
     * Ölçüm (16 çekirdek, docker açık): 16 worker → 10 test düştü,
     * 8 worker → 1 test düştü, 4 worker → hepsi geçti. Yüzde veriliyor ki
     * daha küçük makinelerde de orantılı kalsın.
     *
     * Duvar saati süresi artıyor ama suite DETERMİNİSTİK oluyor; rastgele
     * düşen bir test, çalışmayan bir test demektir.
     */
    maxWorkers: '25%',
  },
}))
