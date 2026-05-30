import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchSystemHealth } from '../../src/features/system/healthApi'

describe('System / healthApi', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns ok when API reports status ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'ok' }), { status: 200 }),
    )

    const result = await fetchSystemHealth()
    expect(result).toEqual({ ok: true })
  })

  it('returns maintenance message on 503', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'maintenance',
          message: 'We are currently under maintenance. Please come back later.',
        }),
        { status: 503 },
      ),
    )

    const result = await fetchSystemHealth()
    expect(result).toEqual({
      ok: false,
      message: 'We are currently under maintenance. Please come back later.',
    })
  })

  it('returns connection error when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'))

    const result = await fetchSystemHealth()
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('Could not connect')
    }
  })

  it('tries fallback /api/health when primary URL fails', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('primary failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'ok' }), { status: 200 }))

    const result = await fetchSystemHealth()
    expect(result).toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
