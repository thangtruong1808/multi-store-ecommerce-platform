import { API_BASE_URL } from '../auth/authConstants'
import { refreshAccessToken } from '../auth/refreshAccessToken'

export type FulfilmentStoreOption = {
  id: string
  name: string
  canFulfil: boolean
}

export async function fetchEligibleStores(
  items: { productId: string; quantity: number }[],
): Promise<FulfilmentStoreOption[]> {
  const url = `${API_BASE_URL}/api/checkout/eligible-stores`
  const go = () =>
    fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      }),
    })

  let response = await go()
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await go()
    }
  }

  if (response.status === 401) {
    throw new Error('Please sign in to check out.')
  }
  if (!response.ok) {
    throw new Error('Unable to check store availability.')
  }

  const data = (await response.json()) as {
    stores?: { id: string; name: string; canFulfil?: boolean }[]
  }
  return (data.stores ?? []).map((store) => ({
    id: store.id,
    name: store.name,
    canFulfil: store.canFulfil !== false,
  }))
}
