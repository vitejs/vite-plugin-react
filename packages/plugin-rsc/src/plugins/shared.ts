export function sortObject<T extends object>(o: T) {
  return Object.fromEntries(
    Object.entries(o).sort(([a], [b]) => a.localeCompare(b)),
  ) as T
}
