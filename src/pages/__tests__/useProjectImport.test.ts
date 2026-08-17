import { act, renderHook } from '@testing-library/react'
import type { ChangeEvent } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_ID, type ProjectData } from '../../core/model'
import { serializeProjectData } from '../../core/serialize'
import { useCadStore } from '../../store/cadStore'
import { useProjectImport } from '../useProjectImport'

function projectWithWall(): ProjectData {
  return {
    nextUniqueId: 10,
    activeFloorId: DEFAULT_FLOOR_ID,
    floors: [createGroundFloor()],
    points: [
      { id: 1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
      { id: 2, floorId: DEFAULT_FLOOR_ID, x: 100, y: 0 },
    ],
    walls: [{ id: 3, floorId: DEFAULT_FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 }],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
    beams: [],
    texts: [],
    installationElements: [],
    installationLines: [],
    installationConnections: [],
  }
}

function fileSelectEvent(file: File | undefined): ChangeEvent<HTMLInputElement> {
  const target = { files: file ? [file] : [], value: 'C:\\fakepath\\proje.json' }
  return { target } as unknown as ChangeEvent<HTMLInputElement>
}

beforeEach(() => {
  useCadStore.getState().resetProject()
})

describe('useProjectImport', () => {
  it('geçerli bir JSON dosyasını store\'a yükler', async () => {
    const { result } = renderHook(() => useProjectImport())
    const file = new File([serializeProjectData(projectWithWall())], 'proje.json', {
      type: 'application/json',
    })

    await act(async () => {
      result.current.handleFileSelected(fileSelectEvent(file))
      await Promise.resolve()
    })

    expect(useCadStore.getState().walls).toHaveLength(1)
    expect(result.current.error).toBeUndefined()
  })

  it('bozuk JSON store\'a HİÇ dokunmadan reddedilir ve hata gösterir', async () => {
    useCadStore.getState().loadProject(projectWithWall())
    const { result } = renderHook(() => useProjectImport())
    const file = new File(['{ bozuk json'], 'proje.json', { type: 'application/json' })

    await act(async () => {
      result.current.handleFileSelected(fileSelectEvent(file))
      await Promise.resolve()
    })

    // Önceki (geçerli) çizim yerinde durur — reddedilen dosya onun üstüne yazmaz.
    expect(useCadStore.getState().walls).toHaveLength(1)
    expect(result.current.error).toBeTruthy()
  })

  it('şema dışı bir JSON (ör. eksik zorunlu alan) reddedilir', async () => {
    const { result } = renderHook(() => useProjectImport())
    const file = new File([JSON.stringify({ foo: 'bar' })], 'proje.json', {
      type: 'application/json',
    })

    await act(async () => {
      result.current.handleFileSelected(fileSelectEvent(file))
      await Promise.resolve()
    })

    expect(useCadStore.getState().walls).toHaveLength(0)
    expect(result.current.error).toBeTruthy()
  })

  it('dosya seçilmezse (iptal) sessizce hiçbir şey yapmaz', async () => {
    const { result } = renderHook(() => useProjectImport())

    await act(async () => {
      result.current.handleFileSelected(fileSelectEvent(undefined))
      await Promise.resolve()
    })

    expect(result.current.error).toBeUndefined()
  })

  it('triggerImport gizli input\'un tıklamasını tetikler', () => {
    const { result } = renderHook(() => useProjectImport())
    const input = document.createElement('input')
    input.type = 'file'
    let clicked = false
    input.addEventListener('click', () => {
      clicked = true
    })
    result.current.inputRef.current = input

    act(() => {
      result.current.triggerImport()
    })

    expect(clicked).toBe(true)
  })
})
