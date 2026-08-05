# Hayalet katmanlar: her görünüm karşı katmanı soluk gösterir

İki yönlü ve simetrik: tesisat görünümünde mimari (`ArchitectureGhost`), mimari
görünümde tesisat (`InstallationGhost`) soluk çizilir. İkisi de tek dosyada
(`src/plumbing/scene/Ghosts.tsx`), ikisi de **`SceneRoot`'ta** mount edilir.

**Neden SceneRoot?** Hayalet, çizen katmanın parçası değil *görünümün bağlamı*dır.
`PlumbingLayer` içinde dursaydı simetriği `ArchitectureLayer`'a yazılmak zorunda
kalırdı (başka sahibin dosyası + plan Bölüm 4.3 kapalı listesi dışı). SceneRoot
zaten görünüm anahtarının olduğu yer.

**Kat.** Her hayalet aktif katı KENDİ okur (`activeFloorId`); mount eden kimse
kat bilgisi geçirmez. Kat geçişi geldiğinde hayaletler kendiliğinden doğru katı
gösterir.

## İki hayalet aynı yöntemi kullanmaz — bilerek

| | Mimari hayalet | Tesisat hayaleti |
|---|---|---|
| Yöntem | Tek soluk renge **boyanır** (`architectureGhost`) | **Rengi korunur**, saydamlaşır (`opacity 0.35`) |
| renderOrder | `architectureGhost: 5` — tesisatın **altında** | `installationGhost: 35` — mimarinin **üstünde** |

Tesisat rengi bilgi taşıyor (tuvalde sarı = gaz hattı); griye boyansa o bilgi
kaybolurdu. Mimari duvar rengi ise bilgi taşımıyor, boyanabiliyor.

`installationGhost` mimarinin ÜSTÜNDE çünkü "hayalet"liği saydamlıktan geliyor,
derinlikten değil: altına konsaydı oda dolgusu (`Room.tsx`, henüz boş) devreye
girdiğinde tamamen kaybolurdu — [symbol-backface](./symbol-backface.md) ile aynı
sınıf sessiz görünmezlik.

## Hayalet açıklık = mimari görünümün simgesi, soluk hâli

Kapı/pencere hayaletinin geometrisi `core/openingSymbol.ts` → `getOpeningSymbol`'dan
gelir; mimari görünümle **tek kaynak**. Ayrı bir "kaba hayalet simgesi" tutulmuyor —
denendi, kapı duvara dik bir çubuk pencere tek çizgi olarak çıktı ve plandan koptu.
Dolgu `SCENE_COLORS.background` ile hayalet duvar bandını **deler**: açıklık bandın
üstüne çizilmiş bir kutu değil, gerçek boşluk gibi okunmalı.

Açıklık `architectureGhostOpening: 6` sırasında, duvarın (`5`) ayrı bir tık üstünde.
Aynı renderOrder'da bırakılamaz: three eşitlikte `material.id`'ye, yani mount sırasına
düşer ve sonradan eklenen bir duvar deliği kapatabilir.

Alt kat hayaleti (`FloorBelowGhost`, KK-13) aynı deseni kendi renginde ve daha ince
çizgiyle uygular (`floorBelowGhostOpening: 4`). Salt hizalama referansı olması tip
ayrımını GEREKSİZ kılmıyor, tam tersi: üst kat kapısı alttakine oturtulacaksa kapı
pencereden ayırt edilebilmeli. Böylece üç hayaletin de açıklık geometrisi tek kaynakta;
dolgu üçgenleri `src/scene/openingFill.ts`'te paylaşılır.

Hayalet material klonları `symbolLoader.ts` → `getGhostMaterial` ile RENK başına
önbelleklenir ve dispose EDİLMEZ (paylaşılan material'lerle aynı ömür); önizleme
klonu ise mount başına üretilip unmount'ta dispose edilir. Material sahipliği tek
dosyada: klon üretimi bir bileşen dosyasına konamaz da — `react-refresh/
only-export-components` bileşen dosyasından fonksiyon export'una izin vermiyor.
Her hayalet mesh'i `raycast` dışıdır.
