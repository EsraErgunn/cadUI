# Baca ve havalandırma kanalı: nokta değil, uzayan eleman (ASKIYA ALINDI)

> **2026-08 güncellemesi — aşağıdaki dönüşüm planı ASKIDA.** WebCAD referans projesi
> incelendi: baca ve havalandırma orada `InstallationLine` benzeri bir hat türü DEĞİL, kendi
> **ayrı grafları** (`flueGraph`, `ventilationGraph`), kendi nokta tipleri (`FluePoint`,
> `VentilationPoint`) ve cihaza bağı (`Boiler.flueStartPointId`, `FluePoint.applianceId`)
> olan paralel sistemler. Havalandırmanın bir de mimari tarafı var: duvara bağlı `Vent`
> menfezi + kesit hesabı. Yani "`InstallationLineKind`'a iki değer ekle" yaklaşımı yanlış
> çıktı. Konu "işlevler" başlığına ait ve sonraki bir işte ele alınacak; aşağıdaki üç soru
> da o işin parçası. Bkz. [../../docs/webcad-format.md](../../docs/webcad-format.md),
> kararlar K27–K30.

Kullanıcı kararı: baca ve havalandırma kanalı bir *damga* değil bir *güzergâh*tır —
boyu kullanıcı tarafından çizilir. Aşama 3'te nokta `InstallationElement` olarak
yerleşiyorlar; bu **geçici**. Dönüşüm planı: `CLAUDE_INSTALLATION_PLAN.md` → Aşama 5.1
(boru/branşman aracıyla birlikte, persistence'tan ÖNCE).

Yön: `InstallationLineKind` `'pipe' | 'branch'` → `+ 'chimney' | 'ventilationDuct'`.
Polyline aracı, undo adımı, segment yapısı ve uzunluk etiketi böylece paylaşılır.
Gaz taşımayan hat ayrımı tek bir saf predicate'te (`isGasCarryingKind`) toplanır —
port bağlantısı, izolasyon, servis kutusu ön koşulu ve BOM onu okur.

## Varsayarak kodlanmayacak üç soru

1. **Genişlik/çap** `kind` başına sabit mi, örnek başına kullanıcıdan mı? Sabitle
   başlanırsa alan sonradan eklenir; tersi göç gerektirir.
2. **Kat kapsamı**: baca binada dikey süreklidir. `Riser` gibi kökte mi durmalı
   (kat kopyalanınca klonlanmaz) yoksa kat bazlı mı? Kökte duracaksa
   `InstallationLine.floorId` bu iki `kind` için yetersiz.
3. **Cihaz–baca bağlantısı** var mı? Varsa cihaz metadata'sına ikinci port tipi
   (`flue`) gerekir; bu Bölüm 10 port tablosunu ve `SYMBOL_PORT_COUNTS`
   doğrulamasını etkiler.

(1) ve (2) cevaplanmadan Aşama 5.1 başlatılmaz. Bkz. [id-scheme](./id-scheme.md)
(göç neden pahalı) ve [coordinates](./coordinates.md) (sarı = gaz hattı; baca ve
kanal sarı OLAMAZ).
