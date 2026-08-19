import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Removes all whitespace (spaces, tabs, newlines) from a string.
 */
export const stripWhitespace = (str: string) => str.replace(/\s+/g, '');

/**
 * Checks if a larger block of text contains a specific substring, ignoring all spaces.
 */
export const containsIgnoringSpaces = (fullCode: string, searchTarget: string) => {
  return stripWhitespace(fullCode).includes(stripWhitespace(searchTarget));
};

/**
 *
 * Transforms connection from "A" ~ "C", "A" ~ "C", "A" ~ "C", "B" ~ "C" to "A" ~ "C" x3, "B" ~ "C"
 * @param items  Id and label of connection
 */
export const aggregateConnections = (items?: Array<{ id: string; label: string }>) => {
  if (!items || items.length === 0) return [];

  const countMap = new Map<string, { count: number; firstId: string }>();

  for (const item of items) {
    const existing = countMap.get(item.label);
    if (existing) {
      existing.count += 1;
    } else {
      countMap.set(item.label, { count: 1, firstId: item.id });
    }
  }

  return Array.from(countMap.entries()).map(([label, data]) => ({
    id: data.firstId,
    label,
    count: data.count,
  }));
};