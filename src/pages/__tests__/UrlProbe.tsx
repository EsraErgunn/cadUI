import { useLocation } from 'react-router-dom'

/** Adres çubuğunu testte görünür kılar: filtreler URL'e yazılıyor mu. */
export function UrlProbe() {
  const location = useLocation()

  return <span data-testid="url">{`${location.pathname}${location.search}`}</span>
}
