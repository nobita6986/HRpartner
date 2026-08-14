/**
 * Tailwind cn() helper. Drop-in thay thế clsx + tailwind-merge.
 *
 * Trong production sẽ import từ `clsx` + `tailwind-merge`:
 *
 *   import { clsx, type ClassValue } from 'clsx';
 *   import { twMerge } from 'tailwind-merge';
 *   export function cn(...inputs: ClassValue[]) {
 *     return twMerge(clsx(inputs));
 *   }
 *
 * Stub này chỉ concat để TypeScript compile được khi chưa cài deps.
 */

type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];

  const walk = (v: ClassValue) => {
    if (!v && v !== 0) return;
    if (typeof v === 'string' || typeof v === 'number') {
      out.push(String(v));
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) {
        if (val) out.push(k);
      }
    }
  };

  inputs.forEach(walk);
  return out.join(' ');
}
