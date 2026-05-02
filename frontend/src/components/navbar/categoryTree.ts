import type { PublicCategory } from './types'

export function getLevel2ByParent(categories: PublicCategory[], parentId: string) {
  return categories.filter((category) => category.level === 2 && category.parentId === parentId)
}

export function getLevel3ByParent(categories: PublicCategory[], parentId: string) {
  return categories.filter((category) => category.level === 3 && category.parentId === parentId)
}
