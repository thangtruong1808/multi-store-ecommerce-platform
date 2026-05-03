export function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment).trim()
  } catch {
    return segment.trim()
  }
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const ct = response.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    throw new Error(
      'Could not load product (server returned a non-JSON page). Run the API on port 5080 and restart the dev server so /api is proxied.',
    )
  }
  return (await response.json()) as T
}

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
