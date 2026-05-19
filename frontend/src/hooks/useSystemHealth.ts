import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchSystemHealth } from '../features/system/healthApi'

export type SystemHealthStatus = 'checking' | 'ok' | 'down'

const POLL_WHEN_DOWN_MS = 60_000

export function useSystemHealth() {
  const [status, setStatus] = useState<SystemHealthStatus>('checking')
  const [message, setMessage] = useState<string | null>(null)
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
    } else {
      setStatus('down')
      setMessage(result.message)
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

    const id = window.setInterval(() => {
      void runCheck(false)
    }, POLL_WHEN_DOWN_MS)

    return () => window.clearInterval(id)
  }, [status, runCheck])

  const retry = useCallback(() => {
    void runCheck(true)
  }, [runCheck])

  return { status, message, isRetrying, retry }
}
