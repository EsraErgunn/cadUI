---
name: store
description: store/ içindeki Zustand slice'larıyla, immer producer'larıyla ve zundo geçmişiyle çalışırken oku. Yeni action eklerken, kaydet/yükle veya geri al/yinele davranışını değiştirirken gerekli.
---

# starcad — Store (Zustand + immer + zundo)

> TASLAK — sıra gelince doldurulacak. Aşağıdakiler yazılacak başlıklar.

- cadStore slice'lardan birleşir; slice'lar sahibe göre bölünmüş (herkes kendi dosyasında).
- Mutasyon immer producer içinde: taslağa doğrudan yaz VEYA yeni nesne döndür — ikisini karıştırma.
- Store'da SADECE saf veri (kaydedilecek JSON). Three.js/mesh nesnesi store'a KONMAZ.
  immer geliştirmede state'i dondurur; donmuş mesh three'yi bozar.
- id: nextUniqueId (artan tamsayı), action içinde üretilir (bileşende değil), bir kez.
  crypto.randomUUID() KULLANILMAZ — bkz. knowledge/id-scheme.md.
- Karmaşık işlem (kat kopyalama) TEK set() içinde yapılır → tek zundo adımı, tek Ctrl+Z.
- Geçmiş (history.ts): zundo partialize ile SADECE cad verisi izlenir; ui durumu (zoom,
  seçili araç) geçmişe girmez — Ctrl+Z zoom'u geri almasın.
- uiStore ayrı store: seçim, aktif araç, 2d/3d. Kaydedilmez, geçmişe girmez.
