import type { PublicCategory } from './types'

/** Walks parents until level 1 and returns that category's slug (URL segment for department). */
export function getLevel1SlugForCategory(categories: PublicCategory[], categoryId: string): string | null {
  const byId = new Map(categories.map((c) => [c.id, c]))
  let cursor: PublicCategory | undefined = byId.get(categoryId)
  while (cursor) {
    if (cursor.level === 1) {
      return cursor.slug
    }
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
  }
  return null
}

/** True if `categoryId` is the given category or one of its descendants under `expectedLevel1Slug`. */
export function categoryBelongsUnderLevel1Slug(
  categories: PublicCategory[],
  categoryId: string,
  expectedLevel1Slug: string,
): boolean {
  const expected = expectedLevel1Slug.trim().toLowerCase()
  const byId = new Map(categories.map((c) => [c.id, c]))
  let cursor: PublicCategory | undefined = byId.get(categoryId)
  while (cursor) {
    if (cursor.level === 1) {
      return cursor.slug.toLowerCase() === expected
    }
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
  }
  return false
}

export function getLevel2ByParent(categories: PublicCategory[], parentId: string) {
  return categories.filter((category) => category.level === 2 && category.parentId === parentId)
}

export function getLevel3ByParent(categories: PublicCategory[], parentId: string) {
  return categories.filter((category) => category.level === 3 && category.parentId === parentId)
}

/**
 * Resolves a category by slug scoped to a level-1 department (avoids picking another department's same slug).
 * When multiple rows share the same slug under that department, prefers the deepest level (e.g. L2 over L1).
 */
/** Ordered path from level 1 down to `leaf` (inclusive). Empty if the chain breaks. */
export function getPublicCategoryPathRootToLeaf(categories: PublicCategory[], leaf: PublicCategory): PublicCategory[] {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const upward: PublicCategory[] = []
  let cursor: PublicCategory | undefined = leaf
  while (cursor) {
    upward.push(cursor)
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined
  }
  upward.reverse()
  return upward
}

export function findPublicCategoryBySlugUnderLevel1(
  categories: PublicCategory[],
  slug: string,
  level1Slug: string,
): PublicCategory | undefined {
  const lower = slug.trim().toLowerCase()
  const candidates = categories.filter(
    (c) => c.slug.toLowerCase() === lower && categoryBelongsUnderLevel1Slug(categories, c.id, level1Slug),
  )
  if (candidates.length === 0) return undefined
  if (candidates.length === 1) return candidates[0]
  return candidates.reduce((a, b) => (a.level > b.level ? a : b))
}
