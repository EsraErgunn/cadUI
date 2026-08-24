import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { PROJECT_FIRM_QUERY_KEY, projectFirmQueryKey } from '../projectFirmForm'

/**
 * Tekil firma kaydı iki ekranda açılıyor (Profil, Firma Güncelle) ve bir süre
 * İKİ ayrı anahtar altında önbelleğe giriyordu: `projectFirmDetail` / `projectFirm`.
 * Sonuç, çapraz tutmayan geçersizleştirmeydi — biri kaydı güncelleyince ötekinin
 * kopyası bayat kalıyordu.
 *
 * Buradaki iki iddia o kaymayı tekrar mümkün kılmıyor: kimliksiz KÖK anahtarla
 * yapılan geçersizleştirmenin kimlikli girdiyi düşürdüğünü doğruluyor (Profil'in
 * kaydetme yolu buna dayanıyor) ve kimlikli geçersizleştirmenin yalnız o kaydı
 * hedeflediğini gösteriyor (Firma Güncelle'nin yolu).
 */
describe('proje firması önbellek anahtarı', () => {
  it('kök anahtarla geçersizleştirme kimlikli girdiyi de düşürür', async () => {
    const client = new QueryClient()
    client.setQueryData(projectFirmQueryKey(7), { id: 7 })

    await client.invalidateQueries({ queryKey: [PROJECT_FIRM_QUERY_KEY] })

    expect(client.getQueryState(projectFirmQueryKey(7))?.isInvalidated).toBe(true)
  })

  it('kimlikli geçersizleştirme başka firmanın kaydına dokunmaz', async () => {
    const client = new QueryClient()
    client.setQueryData(projectFirmQueryKey(7), { id: 7 })
    client.setQueryData(projectFirmQueryKey(9), { id: 9 })

    await client.invalidateQueries({ queryKey: projectFirmQueryKey(7) })

    expect(client.getQueryState(projectFirmQueryKey(7))?.isInvalidated).toBe(true)
    expect(client.getQueryState(projectFirmQueryKey(9))?.isInvalidated).toBe(false)
  })
})
