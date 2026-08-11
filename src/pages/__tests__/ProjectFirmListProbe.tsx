import { useLocation } from 'react-router-dom'

/**
 * Proje firmaları listesinin testlerdeki yerine geçer. Rota durumunu görünür
 * kılıyor: başarı bildiriminin taşıdığı `savedFirmId` böyle doğrulanabiliyor.
 */
export function ProjectFirmListProbe() {
  const location = useLocation()

  return (
    <div>
      <h1>Proje Firmaları</h1>
      <span data-testid="list-state">{JSON.stringify(location.state)}</span>
    </div>
  )
}
