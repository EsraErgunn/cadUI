import { temporal } from 'zundo'
import { create, useStore } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  createArchitectureSlice,
  deriveNextUniqueId,
  INITIAL_ARCHITECTURE_DATA,
  type ArchitectureSlice,
} from './architectureSlice'
import { isEditorReadOnly } from './editorReadOnly'
import { createFloorSlice, type FloorSlice } from './floorSlice'
import {
  areProjectStatesEqual,
  HISTORY_LIMIT,
  partializeProjectState,
  type TrackedProjectState,
} from './history'
import {
  isSamePersistedContent,
  takePersistedContent,
} from './persistedContent'
import type { ProjectMetaSlice } from './projectMeta'
import { markDirty } from './projectMeta'
import { createGroundFloor } from '../core/floors'
import { DEFAULT_FLOOR_ID, type ProjectData } from '../core/model'
import { ISOMETRIC_ANGLES_DEFAULT } from '../isometric/core/isometricProjection'
import type { IsometricAngles } from '../isometric/core/isometricProjection'
import { createIsometricSlice, type IsometricSlice } from '../isometric/store/isometricSlice'
import {
  recordPlumbingHistory,
  resetPlumbingHistory,
} from '../plumbing/store/plumbingHistory'
import { createPlumbingSlice, type PlumbingSlice } from '../plumbing/store/plumbingSlice'

export type CadState = ProjectMetaSlice &
  FloorSlice &
  ArchitectureSlice &
  PlumbingSlice &
  IsometricSlice & {
    /** Depodan gelen çizimi state'e yükler. Şema doğrulaması api/serialize'ın işi. */
    loadProject: (data: ProjectData) => void
    /** Boş projeye döner. Editör başka bir projeye geçerken çağrılır. */
    resetProject: () => void
    /** Çizimi boşaltır; proje kimliği ve kat yapısı KALIR. Menüden tetiklenir. */
    clearProjectDrawing: () => void
  }

/**
 * Boş proje. Her çağrıda TAZE diziler üretir: sabit bir nesne paylaşılsaydı iki
 * proje aynı dizi örneğini işaret eder ve birinde çizilen duvar diğerinde de
 * görünürdü — düzeltmeye çalıştığımız hatanın ta kendisi.
 */
function createEmptyProjectData(): ProjectData {
  return {
    nextUniqueId: deriveNextUniqueId(INITIAL_ARCHITECTURE_DATA),
    activeFloorId: DEFAULT_FLOOR_ID,
    floors: [createGroundFloor()],
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
    beams: [],
    texts: [],
    installationElements: [],
    installationLines: [],
    installationConnections: [],
    floorPipeLinks: [],
  }
}

/**
 * Tesisat geçmişi aynasını cadStore'daki GERÇEK duruma eşitler.
 *
 * Ayna (`plumbingHistory`) kendini güncellemiyor: yalnız `plumbingSlice`'ın
 * tesisat action'ları `record()` çağırıyor. Yükleme/temizleme oradan geçmediği
 * için ayna bayat kalıyordu — ve zundo bir SONRAKİ tesisat düzenlemesinde o
 * bayat hâli "önceki durum" diye geçmişe itiyordu. Sonuç: proje açıp ilk
 * tesisat işlemini yapan kullanıcı Ctrl+Z'ye basınca TÜM tesisatı kaybediyordu
 * (kullanıcı bulgusu; toplu silmeyle görünür oldu).
 *
 * `isNewBeginning`: yükleme mi (geçmiş sıfırlanır) yoksa düzenleme mi (önceki
 * durum geçmişe adım olarak düşer). Ayrım `useCadStore.temporal.clear()`
 * çağrılan yerlerle birebir aynı.
 */
function mirrorPlumbingHistory(isNewBeginning: boolean): void {
  const { installationElements, installationLines, installationConnections, floorPipeLinks } =
    useCadStore.getState()
  const snapshot = {
    installationElements,
    installationLines,
    installationConnections,
    floorPipeLinks,
  }

  if (isNewBeginning) resetPlumbingHistory(snapshot)
  else recordPlumbingHistory(snapshot)
}

// takeNextId/markDirty projectMeta.ts'te: slice'lar onları çalışma zamanında
// import ediyor, buradan alsalardı cadStore ↔ slice döngüsü oluşurdu (K17).

export { markDirty, takeNextId } from './projectMeta'

/**
 * Salt görüntüleme kipinde ÇALIŞMAYA DEVAM EDEN slice action'ları.
 *
 * İkisi de çizimi DEĞİŞTİRMEZ, bakışı değiştirir:
 * - `setActiveFloor`: hangi katın çizildiği. `activeFloorId` JSON'a giriyor ama
 *   kirli işaretine girmiyor (bkz. floor-ordering); engellenseydi salt
 *   görüntüleyen kullanıcı ilk kattan başka bir kat göremezdi.
 * - `setIsometricAngles`: izometrik bakış açısı. Aynı gerekçe — açı oynatmak
 *   bir çizim değişikliği değil (isometricSlice'ın kendi notu).
 *
 * Listeye ekleme yapmadan önce sor: bu action `PersistedContent`'i değiştiriyor
 * mu? Değiştiriyorsa buraya GİRMEZ.
 */
const READ_ONLY_SAFE_ACTIONS: ReadonlySet<string> = new Set([
  'setActiveFloor',
  'setIsometricAngles',
])

/**
 * Merkezî salt görüntüleme kapısı.
 *
 * Neden burada: `useCadStore.setState` bu dosyanın DIŞINDA hiç çağrılmıyor —
 * çizimi değiştiren her yol bir slice action'ından geçiyor. Yani tek bir
 * sarmalayıcı, tuvalden gelen jesti de panelden gelen düğmeyi de klavyeden
 * gelen kısayolu da aynı yerde durduruyor. Yüzeyleri tek tek kapatmak
 * kapsamlıdır ama kanıtlanabilir değildir: yarın `scene/` altına eklenen bir
 * araç kapıyı atlardı.
 *
 * Sarmalanan yalnız SLICE'lar ve `clearProjectDrawing`.
 * `loadProject`,
 * `resetProject` ve `markSaved` bilerek dışarıda: birincisi çizimin
 * GÖRÜNMESİNİN tek yolu, ikincisi proje değişiminde gerekli, üçüncüsü kirli
 * işaretini tazeliyor — üçü de kullanıcının yazdığı bir değişiklik değil.
 *
 * ⚠️ Engellenen action `undefined` döndürür. Bu bir SON savunma hattıdır, ilk
 * değil: kipte olan hiçbir arayüz/sahne yolu buraya kadar gelmiyor (jestler,
 * klavye ve düğmeler kendi katmanlarında kapalı). Dönüş değerini kullanan bir
 * çağıran buraya ulaşırsa bu bir hatadır ve testte görünmesi istenir.
 *
 * ⚠️ GÜVENLİK SINIRI DEĞİL: çizimi sunucuya yazan tek uç
 * (`POST /api/projects/{id}/newversion`) zaten rol korumalı.
 */
function guardReadOnlyActions<T extends object>(actions: T): T {
  const guarded: Record<string, unknown> = {}

  for (const [name, value] of Object.entries(actions)) {
    if (typeof value !== 'function' || READ_ONLY_SAFE_ACTIONS.has(name)) {
      guarded[name] = value
      continue
    }

    const action = value as (...params: unknown[]) => unknown
    guarded[name] = (...params: unknown[]) =>
      isEditorReadOnly() ? undefined : action(...params)
  }

  // Sarmalama yalnız GÖVDEYİ değiştirdi, anahtarları ve imzaları değil.
  return guarded as T
}

// temporal EN DIŞTA: immer'ı sarmalı ki geçmişe düşen anlık görüntüler
// producer bittikten SONRAKİ dondurulmuş state olsun, draft değil.
export const useCadStore = create<CadState>()(
  temporal(
    immer((...args) => {
      const [set] = args
      return {
        // Sayaç başlangıç verisinden TÜRETİLİR, sabit yazılmaz: veri bir gün boş
        // olmazsa sabit sayaç var olan bir id'yi ikinci kez üretir ve hata vermez.
        nextUniqueId: deriveNextUniqueId(INITIAL_ARCHITECTURE_DATA),
        revision: 0,
        // Gerçek başlangıç değeri store kurulduktan HEMEN SONRA yazılıyor
        // (aşağıya bkz.): buradaki diziler slice'ların kendi başlangıç
        // dizileriyle aynı referans olmadığı için proje açılışta kirli çıkardı.
        savedContent: takePersistedContent(createEmptyProjectData()),

        // ⚠️ Anlık görüntü producer'ın DIŞINDAN alınıyor. İçeriden alınsaydı
        // `draft.walls` bir immer draft proxy'si olurdu; producer bitince state'e
        // yazılan gerçek dizi başka bir referans olur ve karşılaştırma HER ZAMAN
        // "kirli" derdi — düzeltmeye çalıştığımız hatanın aynısı.
        markSaved: () => {
          const content = takePersistedContent(useCadStore.getState())
          set((draft) => {
            draft.savedContent = content
          })
        },

        // Yükleme "değişiklik" değildir: içerik anlık görüntüsü tazelenir, yoksa
        // proje açılır açılmaz kirli görünür ve kullanıcı boşuna uyarılır.
        // nextUniqueId dosyadan gelir, veriden yeniden TÜRETİLMEZ — sayaç geriye
        // düşerse silinmiş bir id ikinci kez üretilir (knowledge/id-scheme.md).
        loadProject: (data) => {
          set((draft) => {
            draft.nextUniqueId = data.nextUniqueId
            draft.floors = data.floors
            draft.activeFloorId = data.activeFloorId
            draft.points = data.points
            draft.walls = data.walls
            draft.openings = data.openings
            draft.rooms = data.rooms
            draft.symbols = data.symbols
            draft.areaObjects = data.areaObjects
            draft.beams = data.beams
            draft.texts = data.texts
            draft.installationElements = data.installationElements
            draft.installationLines = data.installationLines
            draft.installationConnections = data.installationConnections
            draft.floorPipeLinks = data.floorPipeLinks
            // Alan yoksa VARSAYILANA döner: korunsaydı önceki projenin açısı
            // yeni projeye sızardı.
            draft.isometricAngles = data.isometricAngles ?? ISOMETRIC_ANGLES_DEFAULT
            draft.revision = 0
            // `data`dan alınıyor, draft'tan DEĞİL: yukarıdaki atamalar tam bu
            // dizileri state'e koyuyor, yani referanslar birebir aynı olur.
            // Draft'tan okumak proxy verirdi (bkz. markSaved).
            draft.savedContent = takePersistedContent(data)
          })
          // Geçmiş SIFIRLANIR: yükleme bir düzenleme değil, yeni bir başlangıç.
          // Temizlenmezse Ctrl+Z kullanıcıyı önceki projenin çizimine götürür.
          useCadStore.temporal.getState().clear()
          // ⚠️ Tesisat geçmişi AYRI bir ayna (plumbingHistory) ve kendini
          // güncellemez: `plumbingSlice.record()` yalnız tesisat action'larından
          // sonra çalışıyor, yükleme oradan geçmiyor. Burada tohumlanmazsa ayna
          // BOŞ kalır ve projedeki ilk tesisat düzenlemesinde zundo o boş hâli
          // geçmişe iter — Ctrl+Z bütün tesisatı siler (kullanıcı bulgusu).
          mirrorPlumbingHistory(true)
        },

        // Yükleme yoluyla AYNI kapıdan geçer: boş proje de bir "yeni başlangıç",
        // yani geçmiş ve kirli işaret aynı şekilde sıfırlanmalı.
        resetProject: () => {
          useCadStore.getState().loadProject(createEmptyProjectData())
        },

        // Buradan aşağısı SALT GÖRÜNTÜLEME kapısının arkasında. Yukarıdaki
        // `markSaved` / `loadProject` / `resetProject` bilerek dışarıda:
        // görüntülemenin kendisi onlara bağlı.
        ...guardReadOnlyActions({
          /**
           * "Projeyi Temizle": çizim içeriğini boşaltır.
           *
           * `resetProject`ten AYRI ve ondan türetilmedi. Üç fark, üçü de bilerek:
           * - KAT YAPISI KALIR. Kullanıcı katları tek tek kurmuş olabilir; "çizimi
           *   temizle" onları da silseydi geri getirmenin yolu yalnız Ctrl+Z olurdu.
           * - GEÇMİŞ SIFIRLANMAZ. Temizlemek bir düzenlemedir, yeni bir başlangıç
           *   değil: tek Ctrl+Z çizimi geri getirmeli.
           * - KİRLİ İŞARET DURUR (`markDirty`). Temizlenmiş çizim kaydedilmemiş bir
           *   değişikliktir; `loadProject` gibi `savedContent` tazelenseydi
           *   kullanıcı çıkarken uyarılmaz ve işini sessizce kaybederdi.
           *
           * `nextUniqueId` GERİ ALINMAZ: silinen id'ler yeniden üretilirse geri
           * alma sonrası iki nesne aynı id'yi taşır (knowledge/id-scheme.md).
           */
          clearProjectDrawing: () => {
            set((draft) => {
              draft.points = []
              draft.walls = []
              draft.openings = []
              draft.rooms = []
              draft.symbols = []
              draft.areaObjects = []
              draft.beams = []
              draft.texts = []
              draft.installationElements = []
              draft.installationLines = []
              draft.installationConnections = []
              draft.floorPipeLinks = []
              markDirty(draft)
            })
            // Temizleme de bir düzenleme: tek Ctrl+Z tesisatı geri getirmeli.
            mirrorPlumbingHistory(false)
          },
          ...createFloorSlice(...args),
          ...createIsometricSlice(...args),
          ...createArchitectureSlice(...args),
          ...createPlumbingSlice(...args),
        }),
      }
    }),
    {
      limit: HISTORY_LIMIT,
      partialize: partializeProjectState,
      equality: areProjectStatesEqual,
    },
  ),
)

// Başlangıç anlık görüntüsü: slice'ların KENDİ başlangıç dizileriyle kurulur.
// Producer'ın dışında ve düz nesneyle (draft proxy'si girmesin, bkz. markSaved).
useCadStore.setState({ savedContent: takePersistedContent(useCadStore.getState()) })

/**
 * Kaydedilmemiş değişiklik var mı? (issue 2.9 "kirli işaret sözleşmesi")
 *
 * Sayaç DEĞİL İÇERİK karşılaştırılıyor: `revision` yalnız ileri gidiyor ve geri
 * alma onu düşürmüyor (K71 bilinçli), bu yüzden "çiz + Ctrl+Z" yapan kullanıcı
 * çizimi kaydedilenle birebir aynıyken kaydetme uyarısı alıyordu. Ayrıntı ve
 * hangi alanların sayıldığı: persistedContent.ts.
 */
export function selectIsProjectDirty(state: CadState): boolean {
  return !isSamePersistedContent(state, state.savedContent)
}

/** Geri al / yinele. Menü ve klavye kısayolu aynı fonksiyonu çağırır. */
export function undoProject(): void {
  useCadStore.temporal.getState().undo()
}

export function redoProject(): void {
  useCadStore.temporal.getState().redo()
}

type TemporalState = {
  pastStates: TrackedProjectState[]
  futureStates: TrackedProjectState[]
}

/**
 * Menü maddelerinin aktifliği için. Sayının kendisine değil boş olup olmadığına
 * abone olunuyor: her adımda yeniden render etmenin anlamı yok.
 */
export function useCanUndo(): boolean {
  return useStore(useCadStore.temporal, (state) => (state as TemporalState).pastStates.length > 0)
}

export function useCanRedo(): boolean {
  return useStore(useCadStore.temporal, (state) => (state as TemporalState).futureStates.length > 0)
}

/**
 * Kaydedilecek saf veri. Her çağrıda YENİ nesne üretir → bileşen buna abone
 * olmaz, kaydetme anında getState() ile okunur (knowledge/snap-contract.md
 * abonelik tuzağı).
 */
export function selectProjectData(state: CadState): ProjectData {
  return {
    nextUniqueId: state.nextUniqueId,
    activeFloorId: state.activeFloorId,
    floors: state.floors,
    points: state.points,
    walls: state.walls,
    openings: state.openings,
    rooms: state.rooms,
    symbols: state.symbols,
    areaObjects: state.areaObjects,
    beams: state.beams,
    texts: state.texts,
    installationElements: state.installationElements,
    installationLines: state.installationLines,
    installationConnections: state.installationConnections,
    floorPipeLinks: state.floorPipeLinks,
    // Varsayılana eşitse alan HİÇ üretilmez — "yokluk, varsayılan değildir"
    // (bkz. core/model.ts). Yazılsaydı açıya hiç dokunulmamış eski bir kayıt
    // açılıp kaydedilince yeni bir anahtar kazanırdı.
    isometricAngles: isDefaultIsometricAngles(state.isometricAngles)
      ? undefined
      : state.isometricAngles,
  }
}

function isDefaultIsometricAngles(angles: IsometricAngles): boolean {
  return (
    angles.alphaDeg === ISOMETRIC_ANGLES_DEFAULT.alphaDeg &&
    angles.betaDeg === ISOMETRIC_ANGLES_DEFAULT.betaDeg
  )
}
