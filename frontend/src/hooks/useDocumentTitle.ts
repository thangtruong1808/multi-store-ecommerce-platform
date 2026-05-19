import { useEffect } from 'react'

import { formatDocumentTitle } from '../config/siteMeta'

export function useDocumentTitle(pageTitle: string) {
  useEffect(() => {
    const previous = document.title
    document.title = formatDocumentTitle(pageTitle)
    return () => {
      document.title = previous
    }
  }, [pageTitle])
}
