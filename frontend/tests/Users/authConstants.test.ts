import { describe, expect, it } from 'vitest'

import { canAccessDashboard } from '../../src/features/auth/authConstants'

describe('Users / authConstants', () => {
  it('allows admin and store_manager for dashboard access', () => {
    expect(canAccessDashboard('admin')).toBe(true)
    expect(canAccessDashboard('store_manager')).toBe(true)
  })

  it('denies other roles and empty values', () => {
    expect(canAccessDashboard('customer')).toBe(false)
    expect(canAccessDashboard('staff')).toBe(false)
    expect(canAccessDashboard(null)).toBe(false)
    expect(canAccessDashboard(undefined)).toBe(false)
  })
})
