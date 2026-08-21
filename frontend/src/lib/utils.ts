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



//Downsample huge arrays
export const downsampleData = (
    data: any[],
    zoomLeft: string | number,
    zoomRight: string | number,
    maxPoints: number = 1000
) => {
  let startIndex = 0;
  let endIndex = data.length - 1;

  if (typeof zoomLeft === "number" && typeof zoomRight === "number") {
    startIndex = Math.max(0, Math.floor(zoomLeft));
    endIndex = Math.min(data.length - 1, Math.ceil(zoomRight));
  }

  const visibleData = data.slice(startIndex, endIndex + 1);

  // 2. If the visible range is smaller than maxPoints, return it directly
  if (visibleData.length <= maxPoints) {
    return visibleData;
  }

  // 3. Otherwise, bucket the data and take the average (or min/max) of each bucket
  const downsampled = [];
  const bucketSize = Math.ceil(visibleData.length / maxPoints);

  for (let i = 0; i < visibleData.length; i += bucketSize) {
    const bucket = visibleData.slice(i, i + bucketSize);
    downsampled.push(bucket[0]);
  }

  return downsampled;
};