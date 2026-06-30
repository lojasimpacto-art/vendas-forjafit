import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmt = (v: number | string | undefined | null) =>
  `R$ ${parseFloat(String(v || 0)).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

export const hoje = () => new Date().toISOString().split('T')[0];
export const mesInicio = () => hoje().slice(0, 8) + '01';
