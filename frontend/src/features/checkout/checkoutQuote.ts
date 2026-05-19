import { API_BASE_URL } from '../auth/authConstants'
import { refreshAccessToken } from '../auth/refreshAccessToken'

export type CheckoutQuoteLine = {
  productId: string
  quantity: number
}

export type SuggestedVoucher = {
  code: string
  label: string
  appliesAtSelectedStore: boolean
}

export type CrossStoreVoucherWarning = {
  code: string
  label: string
  storeNames: string[]
}

export type CheckoutQuoteResponse = {
  subtotal: number
  discountTotal: number
  grandTotal: number
  voucherCode?: string | null
  voucherLabel?: string | null
  voucherError?: string | null
  messages?: string[]
  suggestedVouchers?: SuggestedVoucher[]
  crossStoreWarnings?: CrossStoreVoucherWarning[]
}

export async function fetchCheckoutQuote(
  storeId: string,
  items: CheckoutQuoteLine[],
  voucherCode?: string,
): Promise<CheckoutQuoteResponse> {
  const body = {
    storeId,
    items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    voucherCode: voucherCode?.trim() || undefined,
  }

  const post = async () =>
    fetch(`${API_BASE_URL}/api/checkout/quote`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

  let response = await post()
  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) response = await post()
  }

  if (!response.ok) {
    let message = 'Unable to calculate checkout total.'
    try {
      const j = (await response.json()) as { message?: string }
      if (j.message) message = j.message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  return (await response.json()) as CheckoutQuoteResponse
}
