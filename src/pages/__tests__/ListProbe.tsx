import { useLocation } from 'react-router-dom'

/**
 * Testlerde yönlendirme hedefi. Rota durumunu da görünür kılar — başarı
 * bildiriminin taşıdığı veri (`savedFirmId`) böyle doğrulanabiliyor.
 *
 * Kendi dosyasında: bileşen sabitlerle aynı dosyada dursaydı
 * `react-refresh/only-export-components` kuralına takılırdı.
 */
export function ListProbe() {
  const location = useLocation()

  return (
    <div>
      <h1>Gaz Dağıtım Firmaları</h1>
      <span data-testid="list-state">{JSON.stringify(location.state)}</span>
    </div>
  )
}
