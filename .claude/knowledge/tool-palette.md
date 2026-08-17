---
type: decision
date: 2026-08-17
---

# Sol araç paleti: iki görünüm, tek kural (K82 · K83 · K96)

Mimari ve tesisat paletleri AYNI iskeleti paylaşır; farkları yalnız içerik.
Buton bileşeni tek: `ui/Toolbar.tsx` → `ToolButton` (tesisat oradan import eder).

## Araçlar İŞE göre gruplanır, sıraya göre değil

Düz sıra iki sütuna serilince ilgisiz araçlar yan yana düşüyordu (duvar–pano,
boru–izolasyon). Kullanıcı aradığı aracı TÜRÜNE göre arıyor.

- **Mimari** (K82): Kabuk · Yapı elemanları · Cihazlar · Notlar ve yardımcılar.
- **Tesisat** (K96): Besleme ve ölçüm · Hatlar · Armatürler · Yakıcı cihazlar ·
  Notlar ve yardımcılar. Sıra gazın yolunu izler; grup sınırları
  `plumbing/core/attachModes.ts`'teki tutunma kipiyle uyumlu (free/lineEnd ·
  onLine · nearestLine) — kullanıcının gördüğü ayrım ile kodun davranış ayrımı
  ayrışırsa "bu ikisi neden ayrı grupta" sorusunun cevabı kalmaz.

Her grup kendi ızgarası ve kendi `role="group"` + `aria-label`'ı: ekran okuyucu
grubu duyar, ekranda yalnız çizgi görünür.

## Ayraç her grubun ÜSTÜNDE, ilki dahil

En üstteki çizgi grupları değil paleti üstündeki LOGODAN ayırır (kullanıcı
kararı). Sınıf tek yerde: `ui/controls/buttonVariants.ts` → `TOOL_GROUP_DIVIDER`.

⚠️ Ayraç `<nav>`ın içinde ama ızgaranın DIŞINDA: iki sütunlu tek ızgarada çizgi
bir hücreyi işgal ederdi.

## Seçim Aracı palette YOK

İki palette de çıkarıldı (K83, K96). Aynı kip tuvalin altındaki yüzen çubukta El
aracıyla yan yana duruyor (K54/K57) — sol tuşun ne yapacağını söyleyen düğmeler
tek yerde olmalı. İki yerde birden dururken kullanıcı hangisinin "asıl" olduğunu
bilemiyordu.

Yine de bir ARAÇ: varsayılan odur ve hook'lar `SELECTION_TOOL_ID` /
`INSTALLATION_SELECTION_TOOL_ID` ile ona bakar.

## ⚠️ `*_TOOLS` ile `*_TOOL_GROUPS` aynı küme DEĞİL

`ARCHITECTURE_TOOLS` / `INSTALLATION_TOOLS` = VAR OLAN araçlar (palettekiler +
seçim aracı); ikon kaydı, kimlik tipi ve davranış çözen fonksiyonlar bunu okur.
Gruplar yalnız YERLEŞİM bilgisi. İkisini karıştıran kod palette olmayan bir
araca ikon aramaya kalkar.

⚠️ Düzleştirmenin dönüş tipi ELLE yazılır (`readonly Tool[]`): `flatMap` demet
tiplerini genişletiyor ve kimlik tipi `string`e düşüyordu — o hâlde "olmayan
araç kimliği" derleme hatası vermez, `Record<ToolId, LucideIcon>` kaydının tüm
araçları zorlaması da çöker.

## Palette duran ama yazılmamış araç

Mimaride `isPlanned` ile pasif çıkar ve erişilebilir adı sebebi söyler
(`… (henüz eklenmedi)`, K79). Tesisatta bugün böyle bir araç yok — alan
tanımda da yok, ihtiyaç olunca `core/tools.ts`'teki desen kopyalanır.
