import { useCallback, useEffect, useRef, useState } from 'react'

import {
  fetchSystemHealth,
  type HealthFailureReason,
} from '../features/system/healthApi'

export type SystemHealthStatus = 'checking' | 'ok' | 'down'

const POLL_WHEN_WAKING_MS = 10_000
const POLL_WHEN_MAINTENANCE_MS = 60_000

export function useSystemHealth() {
  const [status, setStatus] = useState<SystemHealthStatus>('checking')
  const [message, setMessage] = useState<string | null>(null)
  const [reason, setReason] = useState<HealthFailureReason>('waking')
  const [isRetrying, setIsRetrying] = useState(false)
  const mountedRef = useRef(true)

  const runCheck = useCallback(async (isManualRetry: boolean) => {
    if (isManualRetry) {
      setIsRetrying(true)
    }

    const result = await fetchSystemHealth()

    if (!mountedRef.current) {
      return
    }

    if (result.ok) {
      setStatus('ok')
      setMessage(null)
      setReason('waking')
    } else {
      setStatus('down')
      setMessage(result.message)
      setReason(result.reason)
    }

    setIsRetrying(false)
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void runCheck(false)
    return () => {
      mountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial check only on mount
  }, [])

  useEffect(() => {
    if (status !== 'down') {
      return
    }

    const intervalMs =
      reason === 'maintenance' ? POLL_WHEN_MAINTENANCE_MS : POLL_WHEN_WAKING_MS

    const id = window.setInterval(() => {
      void runCheck(false)
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [status, reason, runCheck])

  const retry = useCallback(() => {
    void runCheck(true)
  }, [runCheck])

  return { status, message, reason, isRetrying, retry }
}
