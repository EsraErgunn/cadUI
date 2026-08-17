import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_ID } from '../../core/model'
import { DEFAULT_TEXT, DEFAULT_TEXT_HEIGHT_CM, MAX_TEXT_HEIGHT_CM } from '../../core/textLabel'
import { useCadStore } from '../cadStore'

beforeEach(() => {
  useCadStore.setState({
    floors: [createGroundFloor()],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
    beams: [],
    texts: [],
    revision: 0,
  })
})

describe('addTextLabel', () => {
  it('aktif kata varsayılan içerik ve boyla ekler', () => {
    const id = useCadStore.getState().addTextLabel({ x: 100, y: 50 })

    const [text] = useCadStore.getState().texts
    expect(text?.id).toBe(id)
    expect(text?.floorId).toBe(DEFAULT_FLOOR_ID)
    expect(text?.text).toBe(DEFAULT_TEXT)
    expect(text?.heightCm).toBe(DEFAULT_TEXT_HEIGHT_CM)
    expect(text?.angleDeg).toBe(0)
  })

  it('kirli işaretini kaldırır — metin kaydedilen veridir', () => {
    useCadStore.getState().addTextLabel({ x: 0, y: 0 })

    expect(useCadStore.getState().revision).toBe(1)
  })
})

describe('setTextLabelText', () => {
  it('içeriği değiştirir ve baştaki/sondaki boşluğu atar', () => {
    const id = useCadStore.getState().addTextLabel({ x: 0, y: 0 })

    expect(useCadStore.getState().setTextLabelText(id, '  Kazan Dairesi  ')).toBe(true)
    expect(useCadStore.getState().texts[0]?.text).toBe('Kazan Dairesi')
  })

  it('BOŞ metni reddeder — görünmez ve tutulamaz olurdu', () => {
    const id = useCadStore.getState().addTextLabel({ x: 0, y: 0 })
    const revisionBefore = useCadStore.getState().revision

    expect(useCadStore.getState().setTextLabelText(id, '   ')).toBe(false)
    expect(useCadStore.getState().texts[0]?.text).toBe(DEFAULT_TEXT)
    expect(useCadStore.getState().revision).toBe(revisionBefore)
  })

  it('aynı metin yazılınca adım üretmez', () => {
    const id = useCadStore.getState().addTextLabel({ x: 0, y: 0 })
    const revisionBefore = useCadStore.getState().revision

    expect(useCadStore.getState().setTextLabelText(id, DEFAULT_TEXT)).toBe(false)
    expect(useCadStore.getState().revision).toBe(revisionBefore)
  })
})

describe('moveTextLabel', () => {
  it('öteler', () => {
    const id = useCadStore.getState().addTextLabel({ x: 100, y: 50 })

    expect(useCadStore.getState().moveTextLabel(id, 20, -10)).toBe(true)
    expect(useCadStore.getState().texts[0]).toMatchObject({ x: 120, y: 40 })
  })

  it('sıfır öteleme adım üretmez — yalnız seçmek için tıklama', () => {
    const id = useCadStore.getState().addTextLabel({ x: 0, y: 0 })
    const revisionBefore = useCadStore.getState().revision

    expect(useCadStore.getState().moveTextLabel(id, 0, 0)).toBe(false)
    expect(useCadStore.getState().revision).toBe(revisionBefore)
  })
})

describe('setTextLabelHeightCm', () => {
  it('geçerli boyu uygular', () => {
    const id = useCadStore.getState().addTextLabel({ x: 0, y: 0 })

    expect(useCadStore.getState().setTextLabelHeightCm(id, 40)).toBe(true)
    expect(useCadStore.getState().texts[0]?.heightCm).toBe(40)
  })

  it('aralık dışını REDDEDER, kırpmaz', () => {
    // K13 deseni: kullanıcı yazdığı sayının sessizce değiştirilmesini beklemiyor.
    const id = useCadStore.getState().addTextLabel({ x: 0, y: 0 })

    expect(useCadStore.getState().setTextLabelHeightCm(id, 0)).toBe(false)
    expect(useCadStore.getState().setTextLabelHeightCm(id, MAX_TEXT_HEIGHT_CM + 1)).toBe(false)
    expect(useCadStore.getState().texts[0]?.heightCm).toBe(DEFAULT_TEXT_HEIGHT_CM)
  })
})

describe('deleteSelection', () => {
  it('metni siler', () => {
    const id = useCadStore.getState().addTextLabel({ x: 0, y: 0 })

    expect(useCadStore.getState().deleteSelection([{ kind: 'text', id }])).toBe(true)
    expect(useCadStore.getState().texts).toHaveLength(0)
  })
})
