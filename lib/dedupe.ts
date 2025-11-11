// lib/dedupe.ts
type WithId = { id: string };

export function ensureUniqueById<T extends WithId>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
}
