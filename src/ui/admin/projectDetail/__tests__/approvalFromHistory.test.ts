import { describe, expect, it } from 'vitest'

import type { ProjectHistoryRow } from '../../../../api/projectDetail'
import { buildApprovalFromHistory } from '../approvalFromHistory'

function buildRow(overrides: Partial<ProjectHistoryRow> = {}): ProjectHistoryRow {
  return {
    id: 'h1',
    fileType: null,
    createdAt: '2026-07-14T09:12:00.000Z',
    userName: 'KONTROL MÜHENDİSİ',
    roleSnapshot: 'GasDistributionUser',
    operation: 'Approved',
    operationName: 'Onaylanan',
    description: 'Proje uygundur.',
    ...overrides,
  }
}

/**
 * Onay künyesi işlem geçmişinden türetiliyor ve satırın kodu SUNUCUNUN durum
 * kodu: `ProjectApprovalManager.TransitionAsync` geçmişe hedef durumun kodunu
 * (`CodeValues.Approved`) yazıyor, ayrı bir "işlem" kodu üretmiyor. Kod bir
 * süre `projeOnay` diye aranıyordu ve hiçbir satır eşleşmediği için kart hep
 * boş kalıyordu — bu testler o eşleşmeyi sabitliyor.
 */
describe('buildApprovalFromHistory', () => {
  it('sunucunun `Approved` kodlu satırından künyeyi kurar', () => {
    const approval = buildApprovalFromHistory([buildRow()])

    expect(approval).toEqual({
      approvedAt: '2026-07-14T09:12:00.000Z',
      approverName: 'KONTROL MÜHENDİSİ',
      note: 'Proje uygundur.',
    })
  })

  /**
   * RET de bir karar: tarih ve gerekçe kartta görünmeli. Gerekçe satırın
   * `description`'ı — `POST /api/projects/{id}/reject` gövdesindeki metin.
   */
  it('ret satırından tarihi ve gerekçeyi kurar', () => {
    const approval = buildApprovalFromHistory([
      buildRow({
        operation: 'Rejected',
        operationName: 'Reddedilen',
        description: 'Kolon şeması eksik.',
      }),
    ])

    expect(approval).toEqual({
      approvedAt: '2026-07-14T09:12:00.000Z',
      approverName: 'KONTROL MÜHENDİSİ',
      note: 'Kolon şeması eksik.',
    })
  })

  /** "Onaya gönder" karar DEĞİL, karar talebi; künyeye girmemeli. */
  it('karar satırı yoksa null döner', () => {
    const approval = buildApprovalFromHistory([
      buildRow({ operation: 'PendingApproval', operationName: 'Onay Bekleyen' }),
    ])

    expect(approval).toBeNull()
  })

  // Proje reddedilip yeniden onaylanabiliyor; künye YÜRÜRLÜKTEKİ kararı gösterir.
  it('onay ve ret birlikteyken en YENİ kararı seçer', () => {
    const approval = buildApprovalFromHistory([
      buildRow({ createdAt: '2026-07-01T08:00:00.000Z', description: 'Uygundur.' }),
      buildRow({
        createdAt: '2026-08-01T08:00:00.000Z',
        operation: 'Rejected',
        operationName: 'Reddedilen',
        description: 'Sonradan reddedildi.',
      }),
    ])

    expect(approval?.note).toBe('Sonradan reddedildi.')
    expect(approval?.approvedAt).toBe('2026-08-01T08:00:00.000Z')
  })

  // Proje reddedilip yeniden onaylanabiliyor; künye YÜRÜRLÜKTEKİ kararı
  // göstermeli. Sunucu sırasına güvenilmiyor, damgaya bakılıyor.
  it('birden fazla onayda en YENİ damgalı satırı seçer', () => {
    const approval = buildApprovalFromHistory([
      buildRow({ id: 'eski', createdAt: '2026-07-01T08:00:00.000Z', userName: 'ESKİ' }),
      buildRow({ id: 'yeni', createdAt: '2026-08-01T08:00:00.000Z', userName: 'YENİ' }),
    ])

    expect(approval?.approverName).toBe('YENİ')
  })
})
