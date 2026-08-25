import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProjectListItem, ProjectStatus } from '../../api/projects'
import { ProjectOpenDialog } from '../projects/ProjectOpenDialog'

const api = vi.hoisted(() => ({ listProjects: vi.fn() }))

vi.mock('../../api/projects', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projects')>()),
  ...api,
}))

function makeProject(
  id: number,
  status: ProjectStatus,
  updatedAt: string,
  name = `Proje ${id}`,
): ProjectListItem {
  return {
    id,
    pId: `P-${id}`,
    name,
    firmName: null,
    buildingCode: null,
    projectType: null,
    heatingType: null,
    updatedAt,
    createdAt: updatedAt,
    gasFirm: null,
    status,
    hasDocuments: false,
  }
}

/** Dört durumdan gelen projeler; `taslak`taki en yeni, `onaylanan`daki en eski. */
const PROJECTS_BY_STATUS: Record<ProjectStatus, ProjectListItem[]> = {
  taslak: [makeProject(2, 'taslak', '2026-08-20T10:00:00', 'Yeni Proje')],
  onayBekleyen: [],
  onaylanan: [makeProject(1, 'onaylanan', '2026-08-01T10:00:00', 'Açık Proje')],
  reddedilen: [],
}

function mockProjectsByStatus(byStatus: Partial<Record<ProjectStatus, ProjectListItem[]>>): void {
  api.listProjects.mockImplementation(
    (query: { status: ProjectStatus; pageSize: number }) => {
      const items = byStatus[query.status] ?? []
      return Promise.resolve({ items, totalCount: items.length, page: 1, pageSize: query.pageSize })
    },
  )
}

/** Aktif rota parametresini ekrana yazar — navigasyonun GERÇEKTEN olduğunu kanıtlar. */
function ActiveProjectIdProbe() {
  const { projectId } = useParams()
  return <p data-testid="active-project-id">{projectId}</p>
}

function renderDialog(currentProjectId: number | undefined = 1) {
  const onClose = vi.fn()
  render(
    <MemoryRouter initialEntries={[`/projects/${currentProjectId ?? 1}/editor`]}>
      <Routes>
        <Route
          path="/projects/:projectId/editor"
          element={
            <>
              <ActiveProjectIdProbe />
              <ProjectOpenDialog currentProjectId={currentProjectId} onClose={onClose} />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
  return { onClose }
}

beforeEach(() => {
  api.listProjects.mockReset()
  mockProjectsByStatus(PROJECTS_BY_STATUS)
})

describe('ProjectOpenDialog', () => {
  it('dört durumu birleştirip son güncellenen üstte listeler', async () => {
    renderDialog()

    const rows = await screen.findAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Yeni Proje')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Açık Proje')).toBeInTheDocument()
  })

  it('editörde açık olan proje işaretlenir ve tıklanamaz', async () => {
    renderDialog(1)

    const rows = await screen.findAllByRole('listitem')
    const currentRow = within(rows[1]).getByRole('button')
    expect(currentRow).toHaveAttribute('aria-current', 'true')
    expect(currentRow).toBeDisabled()
  })

  it('bir satıra tıklayınca o projenin editörüne geçilir; pencere kapanır', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDialog(1)

    await user.click(await screen.findByText('Yeni Proje'))

    expect(onClose).toHaveBeenCalledTimes(1)
    await waitFor(() =>
      expect(screen.getByTestId('active-project-id')).toHaveTextContent('2'),
    )
  })

  it('erişilebilir başka proje yoksa yönlendirici bir mesaj gösterir', async () => {
    mockProjectsByStatus({})
    renderDialog()

    expect(await screen.findByText(/Erişebildiğiniz başka proje yok/)).toBeInTheDocument()
  })

  it('istek başarısız olursa hata duyurulur, bayat kayıt gösterilmez', async () => {
    api.listProjects.mockRejectedValue(new Error('Sunucuya ulaşılamadı.'))
    renderDialog()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Sunucuya ulaşılamadı.'),
    )
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })
})
