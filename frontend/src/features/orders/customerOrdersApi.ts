import { API_BASE_URL } from '../auth/authConstants'
import { refreshAccessToken } from '../auth/refreshAccessToken'

export type CustomerOrderListItem = {
  id: string
  orderNumber: string
  placedAt: string
  grandTotal: number
  currencyCode: string
  status: string
  paymentStatus: string
}

export type CustomerOrderItem = {
  sku: string | null
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type CustomerOrderDetail = CustomerOrderListItem & {
  items: CustomerOrderItem[]
}

async function getJson<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const go = () =>
    fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })

  let response = await go()
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await go()
    }
  }

  if (response.status === 401) {
    throw new Error('Please sign in to view orders.')
  }
  if (response.status === 404) {
    throw new Error('Order not found.')
  }
  if (!response.ok) {
    throw new Error('Unable to load orders.')
  }

  return (await response.json()) as T
}

export async function fetchCustomerOrders(take = 50): Promise<CustomerOrderListItem[]> {
  return getJson<CustomerOrderListItem[]>(`/api/customer/orders?take=${take}`)
}

export async function fetchCustomerOrder(orderId: string): Promise<CustomerOrderDetail> {
  return getJson<CustomerOrderDetail>(`/api/customer/orders/${encodeURIComponent(orderId)}`)
}
