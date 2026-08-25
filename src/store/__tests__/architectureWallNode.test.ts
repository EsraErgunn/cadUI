import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID } from '../../core/model'
import { mergeCollinearWallsInDraft } from '../architectureWallMerge'
import { useCadStore } from '../cadStore'

const P1 = 1
const P2 = 2
const P3 = 3
const WALL_A = 10
const WALL_B = 11

/** Tek düz duvar: (0,0) → (400,0). */
function seedStraightWall() {
  useCadStore.setState({
    points: [
      { id: P1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
      { id: P2, floorId: DEFAULT_FLOOR_ID, x: 400, y: 0 },
    ],
    walls: [
      { id: WALL_A, floorId: DEFAULT_FLOOR_ID, p1Id: P1, p2Id: P2, thickness: 20, height: 280 },
    ],
    openings: [],
    symbols: [],
    rooms: [],
    activeFloorId: DEFAULT_FLOOR_ID,
    nextUniqueId: 100,
    revision: 0,
  })
}

/** Doğrusal İKİ duvar, ortada düğüm: (0,0) → (200,0) → (400,0). */
function seedCollinearPair() {
  useCadStore.setState({
    points: [
      { id: P1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
      { id: P3, floorId: DEFAULT_FLOOR_ID, x: 200, y: 0 },
      { id: P2, floorId: DEFAULT_FLOOR_ID, x: 400, y: 0 },
    ],
    walls: [
      { id: WALL_A, floorId: DEFAULT_FLOOR_ID, p1Id: P1, p2Id: P3, thickness: 20, height: 280 },
      { id: WALL_B, floorId: DEFAULT_FLOOR_ID, p1Id: P3, p2Id: P2, thickness: 20, height: 280 },
    ],
    openings: [],
    symbols: [],
    rooms: [],
    activeFloorId: DEFAULT_FLOOR_ID,
    nextUniqueId: 100,
    revision: 0,
  })
}

beforeEach(() => {
  seedStraightWall()
})

describe('splitWallAtPoint — duvara çift tık', () => {
  it('duvarı İKİ parçaya böler ve düğümü duvarın üstüne koyar', () => {
    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 150, y: 0 })

    const { walls, points } = useCadStore.getState()
    expect(walls).toHaveLength(2)
    expect(points).toHaveLength(3)

    const added = points.find((point) => point.id !== P1 && point.id !== P2)
    expect(added).toMatchObject({ x: 150, y: 0 })
  })

  it('duvarın DIŞINA tıklansa bile düğüm duvarın üstüne düşer', () => {
    // Tıklama duvara dik izdüşümle oturtuluyor; ham nokta yazılsaydı duvar
    // tıklamanın sapması kadar kırılırdı.
    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 150, y: 40 })

    const added = useCadStore
      .getState()
      .points.find((point) => point.id !== P1 && point.id !== P2)
    expect(added).toMatchObject({ x: 150, y: 0 })
  })

  it('ilk parça duvarın KENDİ id\'sini korur', () => {
    // Seçim, açıklık ve geri alma o id'ye bakıyor.
    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 150, y: 0 })

    expect(useCadStore.getState().walls.some((wall) => wall.id === WALL_A)).toBe(true)
  })

  it('AÇIKLIĞIN içine düşen bölme REDDEDİLİR', () => {
    // K24 kuralının aynısı: kullanıcının koyduğu veri sessizce kaybolmaz.
    useCadStore.setState({
      openings: [{ id: 50, wallId: WALL_A, offsetCm: 150, widthCm: 90, type: 'door' }],
    })

    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 150, y: 0 })

    expect(useCadStore.getState().walls).toHaveLength(1)
  })

  it('açıklığın DIŞINA düşen bölme kabul edilir ve açıklık doğru parçaya taşınır', () => {
    useCadStore.setState({
      openings: [{ id: 50, wallId: WALL_A, offsetCm: 100, widthCm: 40, type: 'door' }],
    })

    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 300, y: 0 })

    const { walls, openings } = useCadStore.getState()
    expect(walls).toHaveLength(2)
    // Açıklık 100 cm'de, bölme 300 cm'de: ilk parçada kalmalı ve offset'i şaşmamalı.
    expect(openings[0]).toMatchObject({ wallId: WALL_A, offsetCm: 100 })
  })

  it('UCA çok yakın tıklama reddedilir: sıfıra yakın parça doğmaz', () => {
    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 0.5, y: 0 })
    expect(useCadStore.getState().walls).toHaveLength(1)

    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 399.5, y: 0 })
    expect(useCadStore.getState().walls).toHaveLength(1)
  })

  it('uygulanamayan istek projeyi KİRLETMEZ', () => {
    // Kirlilik `revision` sayacıyla izleniyor (markDirty); artmamalı.
    const before = useCadStore.getState().revision
    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 0.5, y: 0 })

    expect(useCadStore.getState().revision).toBe(before)
  })

  it('duvara bağlı SEMBOL doğru parçaya taşınır, bölme noktasına ışınlanmaz', () => {
    // Kullanıcı bildirimi: cihaz bulunan duvarı bölünce cihaz tıklanan noktaya
    // sıçrıyordu. Sebep: sembol eski (kısalmış) parçada kalıyor, bayat offset
    // getWallFrameAtOffsetCm'de duvarın ucuna kırpılıyordu.
    useCadStore.setState({
      symbols: [
        {
          id: 60,
          type: 'panel',
          label: 'P-01',
          note: '',
          attachment: 'wall',
          wallId: WALL_A,
          offsetCm: 100,
          isMountedOnFarFace: false,
        },
      ],
    })

    // Bölme 300 cm'de: sembol 100 cm'de, yani İLK parçada kalmalı.
    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 300, y: 0 })

    const [symbol] = useCadStore.getState().symbols
    expect(symbol).toMatchObject({ wallId: WALL_A, offsetCm: 100 })
  })

  it('bölmenin ÖTESİNDEKİ sembol ikinci parçaya geçer ve offset yeniden ölçülür', () => {
    useCadStore.setState({
      symbols: [
        {
          id: 61,
          type: 'vent',
          label: 'MN-01',
          note: '',
          attachment: 'wall',
          wallId: WALL_A,
          offsetCm: 320,
          isMountedOnFarFace: true,
        },
      ],
    })

    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 200, y: 0 })

    const { walls, symbols } = useCadStore.getState()
    const tail = walls.find((wall) => wall.id !== WALL_A)
    const [symbol] = symbols

    // İkinci parçanın başı 200 cm'de: 320 − 200 = 120.
    expect(symbol).toMatchObject({ wallId: tail?.id, offsetCm: 120 })
    // Yüz bilgisi korunur; bölme monte edildiği yüzü değiştirmez.
    expect(symbol.attachment === 'wall' && symbol.isMountedOnFarFace).toBe(true)
  })

  it('SERBEST sembol bölmeden etkilenmez', () => {
    // Aydınlatma duvara bağlanmıyor; bölme onun konumuna dokunmamalı.
    useCadStore.setState({
      symbols: [
        {
          id: 62,
          type: 'lighting',
          label: 'AY-01',
          note: '',
          attachment: 'free',
          floorId: DEFAULT_FLOOR_ID,
          x: 150,
          y: 80,
          rotationDeg: 0,
        },
      ],
    })

    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 200, y: 0 })

    expect(useCadStore.getState().symbols[0]).toMatchObject({ x: 150, y: 80 })
  })

  it('uygulanan bölme projeyi KİRLETİR', () => {
    const before = useCadStore.getState().revision
    useCadStore.getState().splitWallAtPoint(WALL_A, { x: 150, y: 0 })

    expect(useCadStore.getState().revision).toBeGreaterThan(before)
  })
})

describe('mergeWallsAtPoint — düğüme çift tık', () => {
  beforeEach(() => {
    seedCollinearPair()
  })

  it('doğrusal iki duvarı TEK duvara indirir ve düğümü kaldırır', () => {
    useCadStore.getState().mergeWallsAtPoint(P3)

    const { walls, points } = useCadStore.getState()
    expect(walls).toHaveLength(1)
    expect(points.some((point) => point.id === P3)).toBe(false)
    // Birleşik duvar uçtan uca uzanmalı.
    expect(walls[0]).toMatchObject({ p1Id: P1, p2Id: P2 })
  })

  it('KAYBEDEN duvardaki cihaz kazanana taşınır, yok olmaz', () => {
    // Kullanıcı bildirimi: çift tıkla birleştirilen duvarlardaki cihazlar
    // kayboluyordu. Sebep: birleşme açıklıkları taşıyordu ama sembolleri
    // taşımıyordu; kaybeden duvar silinince sembol sahipsiz kalıp çizilemez
    // oluyordu.
    useCadStore.setState({
      symbols: [
        {
          id: 70,
          type: 'panel',
          label: 'P-01',
          note: '',
          attachment: 'wall',
          // WALL_B: (200,0) → (400,0); p1 eklemde, kendi p1'inden 50 cm.
          wallId: WALL_B,
          offsetCm: 50,
          isMountedOnFarFace: false,
        },
      ],
    })

    useCadStore.getState().mergeWallsAtPoint(P3)

    const { walls, symbols } = useCadStore.getState()
    expect(walls).toHaveLength(1)

    const [symbol] = symbols
    // Birleşik duvar (0,0) → (400,0) ve p1 = P1: eklem 200 cm'de, cihaz 250'de.
    expect(symbol).toMatchObject({ wallId: WALL_A, offsetCm: 250 })
    expect(symbol.attachment === 'wall' && symbol.isMountedOnFarFace).toBe(false)
  })

  it('KAZANAN duvardaki cihazın offset"i de birleşmeyle kayar', () => {
    // Kazananın p1'i eklemdeyse birleşmede p1 değişiyor; kendi cihazı da kayar.
    useCadStore.setState({
      walls: [
        { id: WALL_A, floorId: DEFAULT_FLOOR_ID, p1Id: P3, p2Id: P1, thickness: 20, height: 280 },
        { id: WALL_B, floorId: DEFAULT_FLOOR_ID, p1Id: P3, p2Id: P2, thickness: 20, height: 280 },
      ],
      symbols: [
        {
          id: 71,
          type: 'vent',
          label: 'MN-01',
          note: '',
          attachment: 'wall',
          wallId: WALL_A,
          offsetCm: 40,
          isMountedOnFarFace: true,
        },
      ],
    })

    useCadStore.getState().mergeWallsAtPoint(P3)

    // Kaybedenin boyu 200 cm, kazananın p1'i eklemdeydi: 200 + 40 = 240.
    expect(useCadStore.getState().symbols[0]).toMatchObject({ offsetCm: 240 })
  })

  it('SERBEST cihaz birleşmeden etkilenmez', () => {
    useCadStore.setState({
      symbols: [
        {
          id: 72,
          type: 'lighting',
          label: 'AY-01',
          note: '',
          attachment: 'free',
          floorId: DEFAULT_FLOOR_ID,
          x: 120,
          y: 60,
          rotationDeg: 0,
        },
      ],
    })

    useCadStore.getState().mergeWallsAtPoint(P3)

    expect(useCadStore.getState().symbols[0]).toMatchObject({ x: 120, y: 60 })
  })

  it('küçük id KAZANIR: "ilk çizilen kazanır"', () => {
    useCadStore.getState().mergeWallsAtPoint(P3)
    expect(useCadStore.getState().walls[0].id).toBe(WALL_A)
  })

  it('ÜÇ duvarın buluştuğu köşede ÇALIŞMAZ', () => {
    // Düğümü kaldırmak üçüncü duvarı havada bırakırdı; hangi ikisinin
    // birleşeceği de belirsiz olurdu (kullanıcı kuralı).
    const state = useCadStore.getState()
    useCadStore.setState({
      points: [...state.points, { id: 4, floorId: DEFAULT_FLOOR_ID, x: 200, y: 300 }],
      walls: [
        ...state.walls,
        { id: 12, floorId: DEFAULT_FLOOR_ID, p1Id: P3, p2Id: 4, thickness: 20, height: 280 },
      ],
    })

    useCadStore.getState().mergeWallsAtPoint(P3)

    expect(useCadStore.getState().walls).toHaveLength(3)
    expect(useCadStore.getState().points.some((point) => point.id === P3)).toBe(true)
  })

  it('AÇILI köşede çalışmaz: köşe kaybolmaz', () => {
    // İki duvar tek doğruya indirilseydi çizim kullanıcının çizmediği bir yere
    // kayardı. "Doğrusal duvarlarda çalışır" kuralı tam olarak bunu söylüyor.
    useCadStore.setState({
      points: [
        { id: P1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
        { id: P3, floorId: DEFAULT_FLOOR_ID, x: 200, y: 0 },
        { id: P2, floorId: DEFAULT_FLOOR_ID, x: 200, y: 300 },
      ],
    })

    useCadStore.getState().mergeWallsAtPoint(P3)

    expect(useCadStore.getState().walls).toHaveLength(2)
  })

  it('KALINLIĞI farklı duvarlar birleşmez', () => {
    // Kullanıcının bilerek koyduğu bir ayrım olabilir; sessizce silmek veri
    // kaybı olurdu.
    const walls = useCadStore.getState().walls.map((wall) =>
      wall.id === WALL_B ? { ...wall, thickness: 30 } : wall,
    )
    useCadStore.setState({ walls })

    useCadStore.getState().mergeWallsAtPoint(P3)

    expect(useCadStore.getState().walls).toHaveLength(2)
  })

  it('kaybedenin AÇIKLIĞI kazanana taşınır ve offset yeniden hesaplanır', () => {
    // İkinci duvarın p1 ucundan 50 cm; birleşince ilk duvarın uzunluğu eklenir.
    useCadStore.setState({
      openings: [{ id: 50, wallId: WALL_B, offsetCm: 50, widthCm: 40, type: 'window' }],
    })

    useCadStore.getState().mergeWallsAtPoint(P3)

    expect(useCadStore.getState().openings[0]).toMatchObject({
      wallId: WALL_A,
      offsetCm: 250,
    })
  })

  it('birleşmeyen istek projeyi KİRLETMEZ', () => {
    // P1 duvarın UCU: orada tek duvar var, birleşecek bir şey yok.
    const before = useCadStore.getState().revision
    useCadStore.getState().mergeWallsAtPoint(P1)

    expect(useCadStore.getState().revision).toBe(before)
  })
})

describe('mergeWallsAtPoint — elle sürüklenmiş düğüm', () => {
  /** Ortadaki düğümü doğrudan `offsetCm` kadar saptırır. */
  function seedBentPair(offsetCm: number) {
    useCadStore.setState({
      points: [
        { id: P1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
        { id: P3, floorId: DEFAULT_FLOOR_ID, x: 200, y: offsetCm },
        { id: P2, floorId: DEFAULT_FLOOR_ID, x: 400, y: 0 },
      ],
      walls: [
        { id: WALL_A, floorId: DEFAULT_FLOOR_ID, p1Id: P1, p2Id: P3, thickness: 20, height: 280 },
        { id: WALL_B, floorId: DEFAULT_FLOOR_ID, p1Id: P3, p2Id: P2, thickness: 20, height: 280 },
      ],
      openings: [],
      symbols: [],
      rooms: [],
      activeFloorId: DEFAULT_FLOOR_ID,
      nextUniqueId: 100,
      revision: 0,
    })
  }

  it('el ölçüsünde düz olan düğüm BİRLEŞİR', () => {
    // Kullanıcı bildirimi: düğümü elle geri düzleştirmek tam 180° tutturmayı
    // gerektiriyordu ve birleşme hiç çalışmıyordu. 2 metrelik kollarda 3 cm
    // sapma ≈ 1,7°, paydanın içinde.
    seedBentPair(3)
    useCadStore.getState().mergeWallsAtPoint(P3)

    expect(useCadStore.getState().walls).toHaveLength(1)
  })

  it('GERÇEK köşe hâlâ birleşmez', () => {
    // 2 metrelik kollarda 40 cm sapma ≈ 22°: kullanıcının bilerek yaptığı köşe.
    seedBentPair(40)
    useCadStore.getState().mergeWallsAtPoint(P3)

    expect(useCadStore.getState().walls).toHaveLength(2)
  })

  it('birleşince duvar uçtan uca DÜZ gider', () => {
    // Düğüm silindiği için düzleşme kaçınılmaz; kullanıcı zaten onu istedi.
    seedBentPair(3)
    useCadStore.getState().mergeWallsAtPoint(P3)

    const { walls, points } = useCadStore.getState()
    expect(walls[0]).toMatchObject({ p1Id: P1, p2Id: P2 })
    expect(points.some((point) => point.id === P3)).toBe(false)
  })

  it('TARAMA sıkı kalır: taşıma temizliği sapmayı yutmaz', () => {
    // `mergeCollinearWallsInDraft` taşımanın kendi ürettiği BİREBİR doğrusal
    // artıkları temizliyor. Orada pay açılsaydı kullanıcının bilerek çizdiği
    // hafif açılı köşeler her taşımada sessizce düzleşirdi — bu yüzden iki yolun
    // toleransı AYRI ve tarama sıfırda kalmalı.
    seedBentPair(3)
    const draft = structuredClone({
      points: useCadStore.getState().points,
      walls: useCadStore.getState().walls,
      openings: [],
      symbols: [],
      rooms: [],
      activeFloorId: DEFAULT_FLOOR_ID,
    }) as unknown as Parameters<typeof mergeCollinearWallsInDraft>[0]

    expect(mergeCollinearWallsInDraft(draft)).toBe(false)
    expect(draft.walls).toHaveLength(2)
  })

  it('tarama BİREBİR doğrusal artığı yine temizler', () => {
    // Sıfır tolerans "hiç birleşmez" demek değil: makine üretimi artık düğüm
    // tam doğrusal olduğu için hâlâ yakalanıyor.
    seedBentPair(0)
    const draft = structuredClone({
      points: useCadStore.getState().points,
      walls: useCadStore.getState().walls,
      openings: [],
      symbols: [],
      rooms: [],
      activeFloorId: DEFAULT_FLOOR_ID,
    }) as unknown as Parameters<typeof mergeCollinearWallsInDraft>[0]

    expect(mergeCollinearWallsInDraft(draft)).toBe(true)
    expect(draft.walls).toHaveLength(1)
  })
})
