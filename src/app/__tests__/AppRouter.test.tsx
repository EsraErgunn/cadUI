import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import AppComponent from '../App'

/**
 * Veri router'ına geçişin (K112) duman testi: rota ağacı `createBrowserRouter`
 * altında da kuruluyor ve koruma çalışıyor mu. `AppRouter` başka hiçbir testte
 * render edilmiyor — bu dosya olmasaydı göç ancak tarayıcıda fark edilirdi.
 */
describe('AppRouter', () => {
  it('oturum yokken korumalı yol giriş ekranına düşer', async () => {
    window.history.pushState({}, '', '/projects')

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AppComponent />
      </QueryClientProvider>,
    )

    // Giriş ekranının kendi başlığı ("Welcome to"); yönlendirme yapılmazsa
    // yönetici kabuğu ya da boş Suspense ekranı kalırdı.
    expect(await screen.findByRole('heading', { name: 'Welcome to' })).toBeInTheDocument()
    expect(window.location.pathname).toBe('/login')
  })
})
