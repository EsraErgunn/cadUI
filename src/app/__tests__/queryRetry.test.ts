import { describe, expect, it } from 'vitest'

import { ApiError, NetworkError } from '../../api/http'
import { MAX_QUERY_RETRIES, shouldRetryQuery } from '../queryRetry'

/**
 * Tekrar deneme kararı sorgunun İÇERİĞİNE değil hatanın TÜRÜNE bakar: aynı
 * istekle aynı yanıtı verecek hatalar tekrarlanmaz.
 */
describe('shouldRetryQuery', () => {
  it.each([400, 401, 403, 404, 409, 422, 499])('%i tekrarlanmaz', (status) => {
    expect(shouldRetryQuery(0, new ApiError(status, 'hata'))).toBe(false)
  })

  it.each([500, 502, 503])('%i tekrarlanır', (status) => {
    expect(shouldRetryQuery(0, new ApiError(status, 'hata'))).toBe(true)
  })

  /** Ağ hatasının status'ü yok; 4xx eleğine takılmamalı. */
  it('ağ hatası tekrarlanır', () => {
    expect(shouldRetryQuery(0, new NetworkError('Sunucuya ulaşılamadı.'))).toBe(true)
  })

  it('tanınmayan hata tekrarlanır', () => {
    expect(shouldRetryQuery(0, new Error('bilinmiyor'))).toBe(true)
  })

  it('üst sınıra gelince durur', () => {
    const error = new ApiError(500, 'hata')

    expect(shouldRetryQuery(MAX_QUERY_RETRIES - 1, error)).toBe(true)
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, error)).toBe(false)
  })
})
