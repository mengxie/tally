import { z } from 'zod';

const STORAGE_KEY = 'tally.recent-groups';
const LIMIT = 6;
const RecentGroupsSchema = z.array(z.object({ id: z.string(), name: z.string() }));

export type RecentGroup = z.infer<typeof RecentGroupsSchema>[number];

/** Groups are reached by link, not account, so this device remembers the ones you opened. */
export function readRecentGroups(): RecentGroup[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    const parsed = RecentGroupsSchema.safeParse(stored);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function rememberGroup(group: RecentGroup): void {
  try {
    const others = readRecentGroups().filter((recent) => recent.id !== group.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([group, ...others].slice(0, LIMIT)));
  } catch {
    // Storage can be unavailable (private browsing). Remembering is a convenience, not a feature.
  }
}
