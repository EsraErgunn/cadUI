import { describe, expect, it } from 'vitest'

import type { ProjectHistoryRow } from '../../api/projectDetail'
import {
  getProjectApproverName,
  getProjectDesignerName,
  splitStreetDoorNo,
} from '../projectSummaryFields'

function row(overrides: Partial<ProjectHistoryRow> = {}): ProjectHistoryRow {
  return {
    id: 'row',
    fileType: null,
    createdAt: '2026-08-01T10:00:00.000Z',
    userName: 'Ahmet Yılmaz',
    roleSnapshot: 'Proje Firması Kullanıcısı',
    operation: 'projeKayit',
    operationName: 'Proje Kayıt',
    description: null,
    ...overrides,
  }
}

describe('getProjectDesignerName', () => {
  it('projeyi OLUŞTURAN kişinin adını verir', () => {
    // Kaynak geçmiş, oturumdaki kullanıcı DEĞİL: aynı belge her basımda aynı
    // ismi taşısın diye (K159).
    expect(getProjectDesignerName([row()], null)).toBe('Ahmet Yılmaz')
  })

  it('güncelleme/onay satırlarını değil YALNIZ kayıt satırını okur', () => {
    const rows = [
      row({ id: 'a', operation: 'projeGuncelleme', userName: 'Güncelleyen' }),
      row({ id: 'b', operation: 'projeOnay', userName: 'Onaylayan' }),
      row({ id: 'c', operation: 'projeKayit', userName: 'Oluşturan' }),
    ]

    expect(getProjectDesignerName(rows, null)).toBe('Oluşturan')
  })

  it('birden çok kayıt satırında EN ERKENİ geçerli', () => {
    // Sunucunun sıralamasına güvenilmiyor; dizinin ilk elemanı en eski olmayabilir.
    const rows = [
      row({ id: 'a', createdAt: '2026-08-05T10:00:00.000Z', userName: 'Sonraki' }),
      row({ id: 'b', createdAt: '2026-08-01T10:00:00.000Z', userName: 'İlk' }),
    ]

    expect(getProjectDesignerName(rows, null)).toBe('İlk')
  })

  it('SİSTEM YÖNETİCİSİ oluşturmuşsa firma yetkilisi yazılır', () => {
    // Admin bir kişi değil ("Sistem Yöneticisi") ve projenin tasarımcısı da
    // değil; kullanıcı kararı (K159).
    for (const roleSnapshot of ['Admin', 'Yönetici', 'admin', ' YÖNETİCİ ']) {
      const rows = [row({ roleSnapshot, userName: 'Sistem Yöneticisi' })]
      expect(getProjectDesignerName(rows, 'Mehmet Demir')).toBe('Mehmet Demir')
    }
  })

  it('admin oluşturmuş ama firma yetkilisi yoksa BOŞ kalır', () => {
    const rows = [row({ roleSnapshot: 'Admin', userName: 'Sistem Yöneticisi' })]
    expect(getProjectDesignerName(rows, null)).toBe('')
  })

  it('geçmiş BOŞSA firma yetkilisine düşer', () => {
    // Ölçüldü (2026-08): admin'in açtığı projede /history boş dizi dönüyor ve
    // kaşe kutusu bomboş çıkıyordu (kullanıcı bildirimi).
    expect(getProjectDesignerName([], 'Mehmet Demir')).toBe('Mehmet Demir')
  })

  it('geçmiş boş VE firma yetkilisi yoksa boş kalır', () => {
    expect(getProjectDesignerName([], null)).toBe('')
  })

  it('kayıt satırı varken firma yetkilisine DÜŞMEZ', () => {
    expect(getProjectDesignerName([row()], 'Mehmet Demir')).toBe('Ahmet Yılmaz')
  })

  it('ekranın "Bilinmeyen kullanıcı" yer tutucusu kâğıda GEÇMEZ', () => {
    // Ekranda anlamlı, kapakta yanlış: boş bırakmak doğru.
    const rows = [row({ userName: 'Bilinmeyen kullanıcı' })]
    expect(getProjectDesignerName(rows, null)).toBe('')
  })
})

describe('getProjectApproverName', () => {
  it('onay satırındaki kişinin adını verir', () => {
    // `GET /api/projects/{id}` onay bilgisi döndürmüyor; tek kaynak geçmiş.
    const rows = [row({ operation: 'projeOnay', userName: 'Kontrol Mühendisi' })]
    expect(getProjectApproverName(rows)).toBe('Kontrol Mühendisi')
  })

  it('yeniden onaylanmışsa EN GEÇ onayı verir', () => {
    const rows = [
      row({ id: 'a', operation: 'projeOnay', createdAt: '2026-08-01T10:00:00.000Z', userName: 'İlk' }),
      row({ id: 'b', operation: 'projeOnay', createdAt: '2026-08-09T10:00:00.000Z', userName: 'Son' }),
    ]

    expect(getProjectApproverName(rows)).toBe('Son')
  })

  it('onaylanmamış projede BOŞ kalır', () => {
    expect(getProjectApproverName([row()])).toBe('')
  })
})

describe('splitStreetDoorNo', () => {
  it('sokak adı ile kapı numarasını ayırır', () => {
    expect(splitStreetDoorNo('1.YERLİ SOKAK No:66')).toEqual({
      streetName: '1.YERLİ SOKAK',
      doorNumber: '66',
    })
  })

  it('numaradan SONRA devam eden adreste de çalışır', () => {
    // Eski desen sona sabitliydi ve tam adreste hiç eşleşmiyordu; ilçe/il eki
    // sokak adına da karışmamalı.
    expect(splitStreetDoorNo('Atatürk Mah. Yerli Sk. No:66 Konak/İzmir')).toEqual({
      streetName: 'Atatürk Mah. Yerli Sk.',
      doorNumber: '66',
    })
  })

  it('KELİME İÇİNDEKİ "no" hecesini yakalamaz', () => {
    // Ölçüldü: eski desen "Bornova" içindeki heceyi eşleştirip kapı numarasını
    // "va/İzmir" diye okuyordu.
    expect(splitStreetDoorNo('Atatürk Mahallesi 1234 Sokak No 12 Bornova/İzmir')).toEqual({
      streetName: 'Atatürk Mahallesi 1234 Sokak',
      doorNumber: '12',
    })
  })

  it('rakam gelmeyen "no" sözcüğü tetiklemez', () => {
    expect(splitStreetDoorNo('Bornova Mahallesi Nolu Sokak')).toEqual({
      streetName: 'Bornova Mahallesi Nolu Sokak',
      doorNumber: '',
    })
  })

  it('numarada harf ve bölü işareti korunur', () => {
    expect(splitStreetDoorNo('Atatürk Mah. Gazi Cad. No:7/B')).toEqual({
      streetName: 'Atatürk Mah. Gazi Cad.',
      doorNumber: '7/B',
    })
  })

  it('virgül ve boşluklu yazımı kabul eder', () => {
    expect(splitStreetDoorNo('Menekşe Sokak, No: 12')).toEqual({
      streetName: 'Menekşe Sokak',
      doorNumber: '12',
    })
  })

  it('numara YOKSA tamamı sokak adı, kapı boş', () => {
    // Tahmin etmektense boş bırakmak doğru: paftaya yanlış numara yazılmaz.
    expect(splitStreetDoorNo('Cumhuriyet Cad. 45/A Çankaya/Ankara')).toEqual({
      streetName: 'Cumhuriyet Cad. 45/A Çankaya/Ankara',
      doorNumber: '',
    })
  })

  it('boş adres boş sonuç verir', () => {
    expect(splitStreetDoorNo('')).toEqual({ streetName: '', doorNumber: '' })
  })
})
