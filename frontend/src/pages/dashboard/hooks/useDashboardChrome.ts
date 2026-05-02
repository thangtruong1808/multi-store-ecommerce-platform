import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'

import type { DashboardFeatureKey } from '../dashboardTypes'

export function useDashboardChrome(
  navigate: NavigateFunction,
  activeFeature: DashboardFeatureKey,
  pageSize: number,
  setPage: Dispatch<SetStateAction<number>>,
) {
  const [isFeatureLoading, setIsFeatureLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isNavigatingHome, setIsNavigatingHome] = useState(false)
  const [inlineStatusMessage, setInlineStatusMessage] = useState<string | null>(null)
  const [inlineStatusType, setInlineStatusType] = useState<'success' | 'info' | 'error'>('info')

  useEffect(() => {
    setPage(1)
  }, [activeFeature, pageSize, setPage])

  useEffect(() => {
    setIsFeatureLoading(true)
    const timeoutId = window.setTimeout(() => setIsFeatureLoading(false), 180)
    return () => window.clearTimeout(timeoutId)
  }, [activeFeature])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [activeFeature])

  useEffect(() => {
    setInlineStatusMessage(null)
  }, [activeFeature])

  const handleBackToFrontend = () => {
    setIsNavigatingHome(true)
    window.setTimeout(() => {
      navigate('/')
    }, 180)
  }

  return {
    isFeatureLoading,
    isSidebarOpen,
    setIsSidebarOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isNavigatingHome,
    inlineStatusMessage,
    setInlineStatusMessage,
    inlineStatusType,
    setInlineStatusType,
    handleBackToFrontend,
  }
}
