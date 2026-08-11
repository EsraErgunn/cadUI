import { useLocation } from 'react-router-dom'

/**
 * Proje firması kullanıcıları listesinin testlerdeki yerine geçer. Rota
 * durumunu görünür kılıyor: kaydettikten sonra taşınan `savedUserId` ve
 * `isPersisted` böyle doğrulanabiliyor.
 */
export function ProjectFirmUserListProbe() {
  const location = useLocation()

  return (
    <div>
      <h1>Proje Firması Kullanıcıları</h1>
      <span data-testid="list-state">{JSON.stringify(location.state)}</span>
    </div>
  )
}
