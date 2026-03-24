/**
 * Yardımcı Fonksiyonlar (Utility Helpers)
 *
 * cn() fonksiyonu: TailwindCSS class'larını birleştirirken çakışmaları önler.
 * Örn: cn("bg-red-500", conditional && "bg-blue-500") → çakışmayı otomatik çözer.
 *
 * clsx: koşullu class birleştirme
 * twMerge: Tailwind çakışma çözümleme
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
