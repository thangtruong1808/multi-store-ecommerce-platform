import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as refreshModule from '../../src/features/auth/refreshAccessToken'
import { fetchEligibleStores } from '../../src/features/checkout/checkoutEligibility'

describe('Checkout / checkoutEligibility', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns stores on successful response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          stores: [{ id: 's1', name: 'Sydney', canFulfil: true }],
        }),
        { status: 200 },
      ),
    )

    const stores = await fetchEligibleStores([{ productId: 'p1', quantity: 1 }])
    expect(stores).toEqual([{ id: 's1', name: 'Sydney', canFulfil: true }])
  })

  it('throws sign-in message on 401 after refresh fails', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }))
    vi.spyOn(refreshModule, 'refreshAccessToken').mockResolvedValue(false)

    await expect(
      fetchEligibleStores([{ productId: 'p1', quantity: 1 }]),
    ).rejects.toThrow('Please sign in to check out.')
  })

  it('retries once when refresh succeeds', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ stores: [] }), { status: 200 }),
      )
    vi.spyOn(refreshModule, 'refreshAccessToken').mockResolvedValue(true)

    const stores = await fetchEligibleStores([{ productId: 'p1', quantity: 1 }])
    expect(stores).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
