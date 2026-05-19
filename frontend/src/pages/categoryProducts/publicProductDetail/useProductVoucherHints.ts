import { useEffect, useState } from 'react'

import { API_BASE_URL } from '../../../features/auth/authConstants'

export type ProductVoucherHint = {
  code: string
  label: string
  storeIds: string[]
  storeNames: string[]
}

export function useProductVoucherHints(productId: string) {
  const [hints, setHints] = useState<ProductVoucherHint[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/public/${productId}/voucher-hints`)
        if (!response.ok) {
          if (!cancelled) setHints([])
          return
        }
        const payload = (await response.json()) as { hints?: ProductVoucherHint[] }
        if (!cancelled) setHints(payload.hints ?? [])
      } catch {
        if (!cancelled) setHints([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [productId])

  return { hints, isLoading }
}
