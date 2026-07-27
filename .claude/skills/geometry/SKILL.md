---
name: geometry
description: core/ içindeki saf geometri fonksiyonlarıyla (snap, wall, room, pipe kesişim/çakışma, spatialIndex) çalışırken oku. Duvar/boru çizimi, ortogonal kısıt, mahal tespiti, üst üste binme kontrolü yazarken gerekli.
---

# starcad — Geometri (core/, React yok)

> TASLAK — sıra gelince doldurulacak. Aşağıdakiler yazılacak başlıklar.

- Bu klasörde React YOK. Girdi→çıktı saf fonksiyon. Her fonksiyonun testi yanında (__tests__).
- Kayan nokta: eşitlik karşılaştırması EPSILON ile. `a === b` değil `Math.abs(a-b) < EPS`.
- Ortogonal kısıt: yeni segment eklerken x veya y sabitlenir (a.x==b.x || a.y==b.y).
- Çakışma (duvar+boru üst üste binmez): segment-segment kesişim. Uç noktalarda
  tolerans bırak — yoksa düğümde birleşen komşu borular "çakışık" sayılır.
- Performans: n² kesişim kontrolü ~1000 segmentte kilitler. Önce rbush ile aday
  daralt (spatialIndex.ts), sonra kesin kesişim testi. rbush yavaşlayınca eklenir.
- Mahal (room.ts): duvar grafiğinde kapalı çevrim bul → martinez ile alan (m²).
- Test edilebilirlik ZORUNLU: "iki duvar kesişiyor mu" hatası gözle görünmez,
  izometrikte patlar. Fonksiyon saf olduğu için ekransız test edilir.
