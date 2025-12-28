// Badge utility functions for consistent styling across the app

export const levelOptions = [
  { value: 'sd', label: 'SD', color: '#22c55e' },
  { value: 'smp', label: 'SMP', color: '#3b82f6' },
  { value: 'sma', label: 'SMA', color: '#8b5cf6' },
  { value: 'kuliah', label: 'Kuliah', color: '#f59e0b' },
  { value: 'umum', label: 'Umum', color: '#6b7280' }
]

export const typeOptions = [
  { value: 'offline', label: 'Offline', color: '#2e7d32', bgColor: '#e8f5e9' },
  { value: 'online', label: 'Online', color: '#1565c0', bgColor: '#e3f2fd' },
  { value: 'offline_online', label: 'Hybrid', color: '#ef6c00', bgColor: '#fff3e0' }
]

export function getLevelLabel(level) {
  return levelOptions.find(l => l.value === level)?.label || level?.toUpperCase() || '-'
}

export function getLevelColor(level) {
  return levelOptions.find(l => l.value === level)?.color || '#6b7280'
}

export function getTypeLabel(type) {
  return typeOptions.find(t => t.value === type)?.label || 'Offline'
}

export function getTypeColor(type) {
  return typeOptions.find(t => t.value === type)?.color || '#2e7d32'
}

export function getTypeBgColor(type) {
  return typeOptions.find(t => t.value === type)?.bgColor || '#e8f5e9'
}
