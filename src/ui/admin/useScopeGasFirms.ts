import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useAdminScopeParam } from './useAdminScopeParam'
import { fetchAllFirms } from '../../api/adminFirms'

export interface ScopeGasFirms {
  /**
   * Kapsamın kapsadığı gaz dağıtım firmalarının kimlikleri; `null` ise SÜZME
   * YOK. `null` iki hâli birden anlatıyor: sistem geneli (kapsam yok) ve firma
   * listesi henüz gelmedi. İkisi de "elimde daraltacak bilgi yok" demek ve
   * ikisinde de doğru davranış listeyi olduğu gibi göstermek — boş küme
   * dönseydi liste veri gelene kadar boşalır, kullanıcı kayıt kaybettiğini
   * sanırdı.
   */
  ids: Set<number> | null
  /** Aynı firmaların ADLARI; yalnız kimlik taşımayan satırlar için (evraklar). */
  names: Set<string> | null
}

const NO_SCOPE: ScopeGasFirms = { ids: null, names: null }

/**
 * Üst bardaki kapsamı (`group` / `gdfirm`) gaz dağıtım firması kümesine çevirir.
 *
 * Uçların hiçbiri kapsam parametresi almadığı için süzme İSTEMCİDE yapılıyor;
 * bu hook o süzmenin tek kaynağı, böylece üç liste ekranı da aynı kapsam
 * tanımını kullanır. Grup kapsamı grubun ALTINDAKİ firmaların tamamına açılıyor:
 * satırlar gruba değil firmaya bağlı.
 *
 * Firma listesi üst barın kapsam seçicisiyle AYNI anahtardan okunuyor
 * (`['gasDistributionFirms', 'all']`): üst bar her yönetici ekranında zaten
 * mount olduğu için bu hook fazladan istek doğurmaz.
 */
export function useScopeGasFirms(): ScopeGasFirms {
  const { scope } = useAdminScopeParam()
  const isScoped = scope.type !== 'global'

  const { data: firms } = useQuery({
    queryKey: ['gasDistributionFirms', 'all'],
    queryFn: ({ signal }) => fetchAllFirms(signal),
    enabled: isScoped,
  })

  return useMemo(() => {
    if (!isScoped || firms === undefined) return NO_SCOPE

    const matched =
      scope.type === 'firm'
        ? firms.filter((firm) => firm.id === scope.firmId)
        : firms.filter((firm) => firm.groupId === scope.groupId)

    return {
      ids: new Set(matched.map((firm) => firm.id)),
      names: new Set(matched.map((firm) => firm.name)),
    }
  }, [firms, isScoped, scope])
}
