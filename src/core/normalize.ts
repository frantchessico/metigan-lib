/**
 * Response normalization helpers.
 *
 * The API returns Mongo-style documents whose identifier is `_id`. The SDK's
 * public types expose `id`, so we mirror `_id` into `id` (keeping `_id` too)
 * on the objects we hand back, letting callers chain by `.id` reliably.
 */

/** Mirror `_id` into `id` when `id` is absent. Returns a shallow copy. */
export function withId<T>(obj: T): T {
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    const rec = obj as Record<string, unknown>;
    if (rec.id === undefined && typeof rec._id === 'string') {
      return { ...rec, id: rec._id } as T;
    }
  }
  return obj;
}

/** Apply {@link withId} to each item of an array. */
export function withIds<T>(arr: T[]): T[] {
  return Array.isArray(arr) ? arr.map((x) => withId(x)) : arr;
}
