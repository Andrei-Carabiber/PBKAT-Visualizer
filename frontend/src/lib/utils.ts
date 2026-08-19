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