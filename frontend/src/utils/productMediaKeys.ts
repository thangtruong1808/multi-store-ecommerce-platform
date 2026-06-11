const uploadedProductMediaKeyPattern =
  /^products\/(staging\/[0-9a-f-]{36}|[0-9a-f-]{36})\/[0-9a-f]{32}\.webp$/i

const legacySeedPlaceholderKeyPattern = /^products\/[a-z0-9-]+\/0[1-4]\.jpg$/i

export function isUploadedProductMediaKey(blobKey: string): boolean {
  return uploadedProductMediaKeyPattern.test(blobKey.trim())
}

export function isLegacySeedPlaceholderKey(blobKey: string): boolean {
  return legacySeedPlaceholderKeyPattern.test(blobKey.trim())
}

export function persistableProductImageKeys(keys: string[] | null | undefined): string[] {
  return (keys ?? []).map((key) => key.trim()).filter(isUploadedProductMediaKey)
}

/** Dashboard form: real uploads only, or a single empty primary slot. */
export function normalizeProductImageKeysForForm(keys: string[] | null | undefined): string[] {
  const uploaded = persistableProductImageKeys(keys)
  return uploaded.length > 0 ? uploaded : ['']
}

/** Storefront gallery: ignore seed placeholder paths that are not in blob storage. */
export function displayableProductImageKeys(keys: string[] | null | undefined): string[] {
  return persistableProductImageKeys(keys)
}
