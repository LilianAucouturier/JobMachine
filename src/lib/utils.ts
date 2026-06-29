import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatRelativeDate(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`
  return formatDate(date)
}

export function daysSince(date: string | Date): number {
  const now = new Date()
  const d = new Date(date)
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export const PIPELINE_COLUMNS = [
  'Offres à analyser',
  'Préparation',
  'Candidature envoyée',
  'Relance J+7',
  'Entretien',
  'Offre reçue',
  'Refus',
] as const

export const CONTRACT_TYPES = ['CDI', 'CDD', 'Alternance', 'Stage'] as const
export const EXPERIENCE_LEVELS = ['0-1 an', '1-3 ans', '3-5 ans', '5+ ans'] as const
export const CONTACT_STATUSES = [
  'À contacter',
  'Message envoyé',
  'En discussion',
  'Relance nécessaire',
  'Converti',
  'Pas intéressé',
] as const
