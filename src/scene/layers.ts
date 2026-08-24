/**
 * Katman sırası. Mesh'e elle sayı yazılmaz, buradan alınır.
 * Mimari altta soluk, tesisat üstte (CLAUDE.md scene kuralı).
 */
export const RENDER_ORDER = {
  gridMinor: 0,
  gridMajor: 2,
  /**
   * Aktif katın altındaki katın izi (KK-13). architectureGhost'un da ALTINDA:
   * o karşı KATMANIN izi, bu karşı KATIN izi — ikisi aynı anda görünebilir ve
   * hizalama referansı olan alt kat en geride durmalı.
   */
  floorBelowGhost: 6,
  /** Açıklık kendi duvarının üstünde ayrı sırada — gerekçesi architectureGhostOpening ile aynı. */
  floorBelowGhostOpening: 8,
  /**
   * Tesisat görünümündeki mimari hayalet (aktif kat, `plumbing/scene/Ghosts.tsx`
   * → `ArchitectureGhost`). Şekiller kâğıttaki KAT PLANI paftasının çizim
   * diliyle basılır (K154 → K165): her mimari yüzey içi boş, iki kademeli ton
   * (bkz. knowledge/ghost-layers.md). Yalnız 'installation' görünümünde
   * mount edildiği için floorBelowGhost ile (yalnız 'architecture' görünümünde
   * mount edilir) numara çakışması sorun değil, ikisi asla aynı anda sahnede
   * olmaz — yine de karışıklık olmasın diye ayrı bant kullanılıyor.
   * Tesisat tarafının ALT KAT izi YOK (K130): boru çizerken karıştırıyordu.
   */
  /**
   * Duvarın KONTURU. Hayalet kâğıttaki gibi İÇİ BOŞ çizilir (K165): önce TÜM
   * duvarlar `kalınlık + 2×kontur` kontur renginde, sonra TÜM duvarlar tam
   * kalınlıkta zemin renginde basılır — iki bandın AYRI sırada olması şart,
   * yoksa bir duvarın içi komşusunun konturunu siler.
   */
  architectureGhost: 10,
  /** Duvarın İÇİ: dolgu değil, konturun içini kapatan zemin (bkz. architectureGhost). */
  architectureGhostWallVoid: 11,
  /**
   * Hayalet açıklığın boşluğu, hayalet duvarın ÜSTÜNDE ayrı bir sırada: aynı
   * renderOrder'da kalsaydı çizim sırası material id'sine (mount sırasına)
   * düşerdi ve sonradan eklenen bir duvar deliği kapatabilirdi.
   */
  architectureGhostOpening: 12,
  /** Kapı kanadı / pencere çizgileri: kendi açtıkları boşluğun ÜSTÜNDE. */
  architectureGhostOpeningSymbol: 13,
  architectureGhostBeam: 14,
  architectureGhostPointSymbol: 15,
  architectureGhostAreaObject: 17,
  /**
   * Oda adı + m²: hayalet bandın EN ÜSTÜ. Kâğıtta da yazılar en son basılır
   * (planSvg.ts) — hiçbir konturun altında kalmamalılar.
   */
  architectureGhostRoomLabel: 18,
  room: 20,
  wall: 40,
  opening: 60,
  /**
   * Kirişin saydam dolgusu, KENDİ konturunun altında ayrı sırada — gerekçesi
   * areaObjectFill ile aynı.
   */
  beamFill: 62,
  /**
   * Kiriş duvarın ve açıklığın ÜSTÜNDE: kiriş plan üstünde onları keserek geçen
   * bir taşıyıcı, altlarına düşerse duvar kütlesi onu yutar. Sembolün ve alan
   * nesnesinin ALTINDA kalır — ikisi de kirişten küçük, üstte durmalılar.
   */
  beam: 64,
  /**
   * Nokta sembolü açıklığın ve duvarın ÜSTÜNDE: damga plandan okunabilmeli,
   * altına düşerse duvar kütlesi onu yutar. Tutamakların altında kalır.
   */
  pointSymbol: 66,
  /**
   * Alan nesnesinin saydam dolgusu, KENDİ konturunun altında ayrı sırada: aynı
   * sırada kalsaydı opak çizgiler saydam mesh'ten ÖNCE çizilir ve dolgu konturu
   * boyardı (üçü de depthWrite kapalı, karar renderOrder'ın).
   */
  areaObjectFill: 68,
  /** Alan nesnesi (merdiven/kolon/baca şaftı) nokta sembolünün ÜSTÜNDE — ikisi çakışabilir. */
  areaObject: 70,
  /**
   * Tesisatın mimari görünümdeki soluk izi. architectureGhost'un aksine mimarinin
   * ÜSTÜNDE: "hayalet"liği saydamlıktan geliyor, derinlikten değil. Altına konsaydı
   * (oda dolgusu geldiğinde) tamamen kaybolurdu.
   */
  installationGhost: 70,
  /** Baca/havalandırma kanalı borunun ALTINDA: ikisi kesiştiğinde gaz hattı okunmalı. */
  discharge: 76,
  pipe: 80,
  insulation: 90,
  fitting: 100,
  equipment: 120,
  /** Önizlemedeki alan nesnesi/kiriş dolgusu — areaObjectFill ile aynı gerekçe. */
  areaObjectPreviewFill: 138,
  linePreview: 140,
  portMarker: 160,
  warning: 180,
  measurement: 190,
  handle: 200,
  label: 220,
} as const

/** Plan düzlemi y = 0. Izgara bir tık altta durur ki duvarlarla z-fighting olmasın. */
export const GRID_ELEVATION_CM = -1

/** Mimari katmanın elevation'ları (cm). Tepe kamerada görüntüyü değiştirmez, z-fighting'i keser. */
export const ROOM_ELEVATION_CM = -0.2
export const WALL_ELEVATION_CM = 0
export const OPENING_ELEVATION_CM = 0.1
export const WALL_PREVIEW_ELEVATION_CM = 0.2
export const HANDLE_ELEVATION_CM = 0.3
