import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { ProjectStatus } from '../../../../api/projects'
import { StatusTabs } from '../StatusTabs'

const COUNTS = { taslak: 12, onayBekleyen: 3, onaylanan: 40, reddedilen: 0 }

/** Sekmeler kontrollü: klavye gezinmesi ancak seçim gerçekten değişince doğrulanabilir. */
function TabsHarness() {
  const [status, setStatus] = useState<ProjectStatus>('taslak')
  return <StatusTabs value={status} counts={COUNTS} onChange={setStatus} />
}

describe('StatusTabs', () => {
  it('dört sekmeyi rozet adetleriyle gösterir', () => {
    render(<StatusTabs value="taslak" counts={COUNTS} onChange={vi.fn()} />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Taslak12 kayıt',
      'Onay Bekleyen3 kayıt',
      'Onaylanan40 kayıt',
      'Reddedilen0 kayıt',
    ])
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Taslak')
  })

  it('adetler gelmeden rozet yerine iskelet gösterir', () => {
    render(<StatusTabs value="taslak" onChange={vi.fn()} />)

    expect(screen.getByRole('tab', { name: /Taslak/ })).toHaveTextContent(/^Taslak$/)
  })

  it('tıklamada seçilen durumu bildirir', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<StatusTabs value="taslak" counts={COUNTS} onChange={onChange} />)

    await user.click(screen.getByRole('tab', { name: /Onaylanan/ }))

    expect(onChange).toHaveBeenCalledWith('onaylanan')
  })

  it('ok tuşuyla komşu sekmeye geçer ve iki uçta sarar', async () => {
    const user = userEvent.setup()
    render(<TabsHarness />)

    // Roving tabindex: Tab ile şeride yalnız aktif sekmeden girilir.
    await user.tab()
    expect(screen.getByRole('tab', { name: /Taslak/ })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Onay Bekleyen/ })).toHaveFocus()
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Onay Bekleyen')

    // İlk sekmeye dönüp sola basınca son sekmeye sarar.
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: /Reddedilen/ })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: /Taslak/ })).toHaveFocus()
  })
})
