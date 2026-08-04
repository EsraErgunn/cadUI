import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AdminLayout } from '../AdminLayout'

/**
 * jsdom düzen (layout) hesaplamaz — `scrollHeight`/`clientHeight` hep 0 döner —
 * bu yüzden testler piksel değil, kaydırmayı ÜRETEN sınıfları denetler:
 * viewport'a kilitleyen `h-screen`/`overflow-hidden` ve kabuktaki her dikey
 * kaydırma kabı burada yakalanır. Tablonun YATAY kaydırması bunun dışında
 * (kabuğun değil, DataTable'ın işi — kabul kriteri 4).
 */
function renderShell(content: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<p>{content}</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function shellRoot(): Element {
  const main = screen.getByRole('main')
  const shell = main.parentElement?.parentElement
  if (shell === null || shell === undefined) throw new Error('Kabuk kökü bulunamadı')
  return shell
}

/** SVG'de `className` bir nesne; sınıfları her zaman öznitelikten okuyoruz. */
function classList(node: Element): string[] {
  return (node.getAttribute('class') ?? '').split(/\s+/).filter((token) => token !== '')
}

/** Dikey kaydırma kabı üreten yardımcı sınıflar. `overflow-x-*` KAPSAM DIŞI:
    tablonun yatay kaydırması kabul kriteri 4, bozulmamalı. */
const VERTICAL_SCROLL_CLASSES = new Set([
  'overflow-auto',
  'overflow-scroll',
  'overflow-hidden',
  'overflow-y-auto',
  'overflow-y-scroll',
  'overflow-y-hidden',
])

describe('AdminLayout — kaydırma iskeleti', () => {
  it('kabuk viewport yüksekliğine kilitlenmez', () => {
    renderShell('içerik')

    // `h-screen` sayfayı içerik kısayken de tam 100vh'te tutuyordu: sayfalamanın
    // altında bir ekran boyu ölü alan kalıyordu.
    const classes = classList(shellRoot())
    expect(classes).not.toContain('h-screen')
    expect(classes).toContain('min-h-screen')
  })

  it('kabukta dikey kaydırma kabı yok — tek çubuk pencerenin', () => {
    renderShell('içerik')

    const shell = shellRoot()
    const offenders = [shell, ...shell.querySelectorAll('*')].filter((node) =>
      classList(node).some((token) => VERTICAL_SCROLL_CLASSES.has(token)),
    )

    expect(offenders.map((node) => node.getAttribute('class'))).toEqual([])
  })

  it('sol menü kendi kaydırma kabı değil', () => {
    renderShell('içerik')

    const nav = screen.getByRole('navigation', { name: 'Yönetici menüsü' })
    expect(classList(nav).some((token) => token.startsWith('overflow-'))).toBe(false)
  })
})
