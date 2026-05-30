import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as healthApi from '../../src/features/system/healthApi'
import { useSystemHealth } from '../../src/hooks/useSystemHealth'

describe('System / useSystemHealth', () => {
  beforeEach(() => {
    vi.spyOn(healthApi, 'fetchSystemHealth')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('moves from checking to ok when health succeeds', async () => {
    vi.mocked(healthApi.fetchSystemHealth).mockResolvedValue({ ok: true })

    const { result } = renderHook(() => useSystemHealth())

    await waitFor(() => {
      expect(result.current.status).toBe('ok')
    })
    expect(result.current.message).toBeNull()
  })

  it('sets down status and message when health fails', async () => {
    vi.mocked(healthApi.fetchSystemHealth).mockResolvedValue({
      ok: false,
      message: 'We are currently under maintenance. Please come back later.',
    })

    const { result } = renderHook(() => useSystemHealth())

    await waitFor(() => {
      expect(result.current.status).toBe('down')
    })
    expect(result.current.message).toContain('maintenance')
  })

  it('exposes retry that re-runs health check', async () => {
    vi.mocked(healthApi.fetchSystemHealth).mockResolvedValue({
      ok: false,
      message: 'Unavailable',
    })

    const { result } = renderHook(() => useSystemHealth())

    await waitFor(() => {
      expect(result.current.status).toBe('down')
    })

    vi.mocked(healthApi.fetchSystemHealth).mockResolvedValue({ ok: true })

    await act(async () => {
      result.current.retry()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('ok')
    })
    expect(healthApi.fetchSystemHealth).toHaveBeenCalledTimes(2)
  })
})
