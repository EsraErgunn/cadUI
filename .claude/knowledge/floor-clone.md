# gotcha: Kat kopyalama (floorClone)

**Sorun:** Naif derin kopya (JSON.parse(JSON.stringify)) referansları kaynak
katın id'lerine bırakır ve HATA VERMEZ. Alt kattaki duvar taşınınca üst kattaki
kapı da oynar.

**Doğru:** İki geçiş. (1) her nesneye eskiId→yeniId haritası. (2) her referans
alanını haritadan geçir; haritada yoksa HATA FIRLAT (assertion).

**Ayrıca:** Kolon (Riser) klonlanmaz, toFloorId uzatılır. Klonlanırsa metraj
izometrikte ve BOM'da iki katına çıkar. Sahipsiz Point'leri temizle.

**Dosya:** core/floorClone.ts · Test ilk gün yazılır.
