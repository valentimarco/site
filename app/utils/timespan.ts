/**
 * Human duration between two dates, counting the start month inclusively — the CV convention.
 * Nov 2023 → Nov 2026 is "3 years 1 month" (37 months), not "3 years" (36): the month a span
 * starts in is itself part of the span.
 */
export function getTimeSpan(startDate: string, endDate?: string) {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : new Date()
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1
  if (months < 1) {
    // Only reachable when `end` is earlier than `start` (future or mistyped startDate): fall
    // back to a day count instead of a negative month count.
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return `${days} day${days !== 1 ? 's' : ''}`
  }
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  return remMonths === 0
    ? `${years} year${years !== 1 ? 's' : ''}`
    : `${years} year${years !== 1 ? 's' : ''} ${remMonths} month${remMonths !== 1 ? 's' : ''}`
}
