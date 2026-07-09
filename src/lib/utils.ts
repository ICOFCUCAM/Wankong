import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a value to an array. Supabase queries normally resolve to an array,
 * but a paused/unreachable project (or a proxy host) can return a non-array body
 * such as an error object or HTML. Calling `.filter`/`.map`/`.find` on that throws
 * and crashes the render, so coerce unknown shapes to `[]` before iterating.
 */
export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
