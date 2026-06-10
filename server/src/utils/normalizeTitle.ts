export function normalizeTitle(title: string): string {
  return decodeURIComponent(title)
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
}