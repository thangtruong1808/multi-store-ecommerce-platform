import { describe, expect, it } from 'vitest'

import {
  formatAxisDate,
  formatMoneyCompact,
  formatMoneyFull,
} from '../../src/pages/dashboard/overview/charts/chartFormatUtils'

describe('Dashboard / chartFormatUtils', () => {
  it('formats axis dates in short month/day form', () => {
    expect(formatAxisDate('2026-05-30')).toMatch(/May/)
  })

  it('formats AUD amounts with A$ prefix', () => {
    expect(formatMoneyFull(12.5, 'AUD')).toBe('A$12.50')
  })

  it('formats large AUD values in compact k notation', () => {
    expect(formatMoneyCompact(1500, 'AUD')).toBe('A$1.5k')
  })
})
