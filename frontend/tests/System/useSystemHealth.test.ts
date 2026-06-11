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

  it('sets down status with maintenance reason when health reports maintenance', async () => {
    vi.mocked(healthApi.fetchSystemHealth).mockResolvedValue({
      ok: false,
      reason: 'maintenance',
      message: 'We are updating the store and will be back shortly.',
    })

    const { result } = renderHook(() => useSystemHealth())

    await waitFor(() => {
      expect(result.current.status).toBe('down')
    })
    expect(result.current.reason).toBe('maintenance')
    expect(result.current.message).toContain('updating')
  })

  it('sets waking reason when services are still starting', async () => {
    vi.mocked(healthApi.fetchSystemHealth).mockResolvedValue({
      ok: false,
      reason: 'waking',
      message: 'Services are still starting. Please wait a moment.',
    })

    const { result } = renderHook(() => useSystemHealth())

    await waitFor(() => {
      expect(result.current.status).toBe('down')
    })
    expect(result.current.reason).toBe('waking')
  })

  it('exposes retry that re-runs health check', async () => {
    vi.mocked(healthApi.fetchSystemHealth).mockResolvedValue({
      ok: false,
      reason: 'waking',
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
