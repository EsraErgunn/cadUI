# decision: metin (TextLabel) — plana konan not

Tür: `decision` · 2026-08 · İlgili: K81 (docs/kararlar.md)

## Model

`TextLabel { id, floorId, x, y, text, heightCm, angleDeg }` + `ProjectData.texts`.
Hiçbir şeye bağlı değil: duvara, odaya, nesneye tutunmaz, konumunu kendi taşır.

**`heightCm` DÜNYA boyudur.** Metin çizimin parçası; zoom'da duvarlarla birlikte
büyür, PDF'e planla aynı oranda basar. Oda adı ve ölçü yazıları bunun AKSİNE
ekran-sabit (`px / zoom`) çünkü onlar çizimden TÜREYEN okuma yardımcıları.
İkisini karıştırma.

Serileştirme: `texts` de `.default([])` alır (eski dosyalar açılsın),
`serializeProjectData` her zaman yazar (bit-bit turu korunsun). Yeni dizi
eklerken `docs/sample-project.json`'a da eklenmeli — kabul testi onu okuyor.

## Kapsam (ilk tur)

Koy / yaz / seç / taşı / sil. Grup dönüşümü ve Ctrl+D YOK. Eklenecekse
`transform.ts` + `duplicateOps.ts` K49'un dört türünü beşe çıkarır ve aynalamada
yazının kendisi ters dönmemeli, yalnız konumu (sembol açısındaki kuralın aynısı).

**Kutuyu boşaltıp onaylamak metni SİLER.** Yazısı olmayan not, kullanıcının
orada bir şey istemediğinin en açık ifadesi — yanlışlıkla konan metnin çıkış
kapısı da bu. Silme `deleteSelection`dan geçer (tek Ctrl+Z adımı).

Kuralın TEK adresi `isBlankText`: kutu "silecek miyim", store "yazacak mıyım"
diye aynı fonksiyonu sorar. Ayrışsalardı boşaltılan metin ne silinir ne yazılır,
eski hâliyle geri gelirdi. Store boş metni hâlâ YAZMAZ (görünmez, tutulamaz);
silme ayrı yoldan.

## Jest sahipliği — tekrarlayan tuzak

Metin `resolveArchitectureTarget` zincirinde YOK (bir notun üstüne düşen duvar
seçilemez olurdu). Sonuç: diğer hook'lar metnin üstünü "boşluk" sanıp çerçeve
seçimi başlatıyordu — `AreaObjectNameLabels`taki tuzağın aynısı.

Çözüm aynı: `findTextLabelAtPointer` jesti sahipleniyor, şu hook'lar onu çağırıp
erken dönüyor — `useSelectionTool`, `useWallSelectionTool`, `usePointDragTool`,
`usePointSymbolSelectionTool`, `useAreaObjectSelectionTool`. Yeni bir gövdesiz
nesne eklendiğinde bu listeyi güncellemek ZORUNLU (K44'ün dersi).

Tutma kutusu yazının gerçek genişliğinden değil kaba tahminden gelir
(`core/textLabel.ts`): core troika'yı/DOM'u tanımaz. Tahmin bilerek cömert.

## Düzenleme kutusu

`RoomNameEditor`ün birebir deseni ve aynı tuzakları — gerekçeler orada yazılı:
drei `<Html>`, NATIVE dinleyici (ayrı react-dom kökünden yapılan store yazımı
R3F ağacını yeniden çizdirmiyor), taslak yerel state'te.

Yerleştirmeden sonra araç SEÇİME döner (K42'nin karşılığı): araç açık kalsaydı
kullanıcı kutuya yazarken tuvale her tıkladığında yeni metin doğardı.
